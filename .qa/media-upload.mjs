/**
 * The media uploader, end to end, through a real browser.
 *
 * What this exists to prove is one architectural claim: the file does not go
 * through a serverless function. Before this change the bytes were posted to a
 * Server Action, which meant a 7MB upload met Next's 1MB body limit and
 * Vercel's ~4.5MB one and came back as the generic server-error page. So the
 * central assertion is not "the upload worked" but "a 7MB upload worked *and*
 * the bytes were seen by Storage, not by the application server".
 *
 * The failure cases are the other half. Missing bucket, refused upload and a
 * refused database row are all switchable on the stub, because they are the
 * ones that cannot be caused on demand against a real project — and each of
 * them has to end as a sentence in the form rather than as a broken route.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";

const DB = process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error("SUPABASE_DB_URL is required: the suite runs against real Postgres.");
  process.exit(1);
}

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
};

const PORT = Number(process.env.PORT ?? 3244);
const STUB_PORT = Number(process.env.STUB_PORT ?? 3245);

const rest = await startPostgrestStub(STUB_PORT, DB);

const OWNER = { authId: randomUUID(), email: "media-owner@example.com", password: "correct-horse" };
rest.addUser(OWNER.authId, OWNER.email, OWNER.password);

await rest.query(
  `insert into admin_profiles (auth_user_id, name, email, role)
   values ($1, 'Media Owner', $2, 'owner')
   on conflict (lower(email)) do update set auth_user_id = excluded.auth_user_id, role = 'owner'`,
  [OWNER.authId, OWNER.email]
);

const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: "/home/user/loomieTeam",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: rest.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
    SUPABASE_SECRET_KEY: rest.serviceKey,
    NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  },
  stdio: ["ignore", "inherit", "inherit"],
});

for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`http://localhost:${PORT}/api/availability`)).ok) break;
  } catch {
    /* not up yet */
  }
}

const base = `http://localhost:${PORT}`;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

/** Every request the page makes, so we can prove where the bytes went. */
const traffic = [];

async function signedInPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (["POST", "PUT"].includes(request.method())) {
      traffic.push({ method: request.method(), url: request.url(), size: (request.postDataBuffer() ?? []).length });
    }
  });
  await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', OWNER.email);
  await page.fill('input[name="password"]', OWNER.password);
  await Promise.all([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 }),
    page.locator('form button[type="submit"]').first().click(),
  ]);
  return { context, page };
}

/**
 * Puts a file of an exact size into the file input, built in the page so
 * nothing large crosses the CDP connection as a base64 string.
 */
async function choose(page, { name, type, bytes }) {
  await page.evaluate(
    async ({ name, type, bytes }) => {
      // A JPEG header followed by filler, so the bytes are not all zero.
      const buffer = new Uint8Array(bytes);
      buffer.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      for (let i = 10; i < bytes; i += 1) buffer[i] = i % 251;

      const file = new File([buffer], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector('input[type="file"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, type, bytes }
  );
  await page.waitForTimeout(150);
}

/**
 * The upload form's own submit button.
 *
 * Scoped on purpose: the admin shell puts a "Sign out" submit button above the
 * form, so an unscoped button[type=submit] signs the tester out and every
 * assertion afterwards is really testing the login page.
 */
const uploadForm = (page) => page.locator("form:has(input[type=file])");
const uploadButton = (page) => uploadForm(page).locator('button[type="submit"]');
const submit = async (page) => {
  await uploadButton(page).click();
};

const errorText = async (page) =>
  (await page.locator("[data-upload-error]").first().textContent().catch(() => "")) ?? "";

const rowCount = async () => {
  const { rows } = await rest.query("select count(*)::int as n from media");
  return rows[0].n;
};

try {
  /* ── 1. The architecture claim ────────────────────────────────────────── */
  console.log("\n1. Where the bytes actually go");
  {
    const before = await rowCount();
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    check("the upload form is offered", (await page.locator("form input[type=file]").count()) === 1);

    traffic.length = 0;
    await choose(page, { name: "small.jpg", type: "image/jpeg", bytes: 300 * 1024 });
    await submit(page);
    await page.waitForSelector("[data-upload-done]", { timeout: 30000 });

    check("a 300KB JPEG uploads", (await rowCount()) === before + 1, `${before} -> ${await rowCount()}`);
    check("and the object is in Storage", rest.storage.count() === 1, String(rest.storage.count()));

    const toStorage = traffic.filter((r) => r.method === "PUT" && r.url.includes("/storage/v1/object/upload/sign/"));
    check("the file was PUT straight to Storage", toStorage.length === 1, JSON.stringify(traffic.map((t) => t.url.slice(-60))));

    // The decisive one: no request to the application carried the payload.
    const heavyToApp = traffic.filter((r) => r.url.startsWith(base) && r.size > 64 * 1024);
    check("no request to the application carried the file",
      heavyToApp.length === 0,
      JSON.stringify(heavyToApp.map((r) => `${r.url.slice(-40)} ${r.size}`)));

    check("the description field is cleared for the next one",
      (await uploadForm(page).locator('input[name="alt"]').inputValue()) === "");

    await context.close();
  }

  /* ── 2. The sizes that used to fail ───────────────────────────────────── */
  console.log("\n2. The sizes a function could not carry");
  {
    const { context, page } = await signedInPage();

    for (const [label, bytes] of [["2MB", 2 * 1024 * 1024], ["7MB", 7 * 1024 * 1024]]) {
      await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });
      const before = await rowCount();
      traffic.length = 0;

      await choose(page, { name: `${label}.jpg`, type: "image/jpeg", bytes });
      await submit(page);

      // Progress has to appear, or there is no feedback on a slow upload.
      const sawProgress = await page
        .waitForSelector('[role="progressbar"]', { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

      await page.waitForSelector("[data-upload-done]", { timeout: 60000 });

      check(`a ${label} JPEG uploads`, (await rowCount()) === before + 1, await errorText(page));
      check(`  ${label} showed a progress bar`, sawProgress);

      const { rows } = await rest.query(
        "select size_bytes, mime_type from media order by created_at desc limit 1"
      );
      check(`  ${label} recorded its real size`, Number(rows[0].size_bytes) === bytes, String(rows[0].size_bytes));
      check(`  ${label} recorded its type`, rows[0].mime_type === "image/jpeg", rows[0].mime_type);
    }

    check("all three objects are in Storage", rest.storage.count() === 3, String(rest.storage.count()));
    await context.close();
  }

  /* ── 3. Refusals, in the browser, before anything moves ───────────────── */
  console.log("\n3. Refused before it starts");
  {
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const before = await rowCount();
    const objectsBefore = rest.storage.count();

    await choose(page, { name: "huge.jpg", type: "image/jpeg", bytes: 9 * 1024 * 1024 });
    const overError = await errorText(page);
    check("over 8MB is refused on selection", /8\.0MB|limit/i.test(overError), overError);
    check("and the button is disabled", await uploadButton(page).isDisabled());

    await choose(page, { name: "notes.pdf", type: "application/pdf", bytes: 1024 });
    const typeError = await errorText(page);
    check("an unsupported type is refused", /not supported|jpeg/i.test(typeError), typeError);

    check("nothing was written", (await rowCount()) === before);
    check("and nothing reached Storage", rest.storage.count() === objectsBefore);

    // The form still works afterwards, rather than being stuck in a bad state.
    await choose(page, { name: "recover.png", type: "image/png", bytes: 40 * 1024 });
    check("choosing a good file clears the complaint",
      (await page.locator("[data-upload-error]").count()) === 0);
    await submit(page);
    await page.waitForSelector("[data-upload-done]", { timeout: 30000 });
    check("and it uploads", (await rowCount()) === before + 1);

    await context.close();
  }

  /* ── 4. Two files with the same name ──────────────────────────────────── */
  console.log("\n4. The same filename twice");
  {
    const { context, page } = await signedInPage();
    const before = await rowCount();

    for (let i = 0; i < 2; i += 1) {
      await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });
      await choose(page, { name: "logo.png", type: "image/png", bytes: 20 * 1024 });
      await submit(page);
      await page.waitForSelector("[data-upload-done]", { timeout: 30000 });
    }

    check("both are recorded", (await rowCount()) === before + 2);

    const { rows } = await rest.query(
      "select path from media where path like '%logo.png' order by created_at desc limit 2"
    );
    check("with different object paths", rows[0].path !== rows[1].path,
      `${rows[0].path} / ${rows[1].path}`);
    check("and neither overwrote the other in Storage",
      rest.storage.get(rows[0].path) !== null && rest.storage.get(rows[1].path) !== null);

    await context.close();
  }

  /* ── 5. No bucket ─────────────────────────────────────────────────────── */
  console.log("\n5. The bucket does not exist");
  {
    rest.storage.faults.missingBucket = true;

    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const notice = await page.locator("[data-storage-missing]").count();
    check("the page says so on load", notice === 1, String(notice));

    const text = await page.locator("[data-storage-missing]").innerText().catch(() => "");
    check("and names the bucket", /site/.test(text), text.slice(0, 90));
    check("and says how to make it", /Storage\s*→\s*New bucket|New bucket/i.test(text), text.slice(0, 160));
    check("the upload form is not offered", (await page.locator("form input[type=file]").count()) === 0);

    check("the library still renders", (await page.locator("h1, h2").count()) > 0);
    check("the route did not error", !/server error|couldn.t load/i.test(await page.innerText("body")));

    rest.storage.faults.missingBucket = false;
    await context.close();
  }

  /* ── 6. Storage refuses the bytes ─────────────────────────────────────── */
  console.log("\n6. Storage refuses the upload");
  {
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const before = await rowCount();
    const objectsBefore = rest.storage.count();
    rest.storage.faults.uploadFails = true;

    await choose(page, { name: "refused.jpg", type: "image/jpeg", bytes: 120 * 1024 });
    await submit(page);
    await page.waitForSelector("[data-upload-error]", { timeout: 30000 });

    const message = await errorText(page);
    check("the form explains the refusal", message.length > 0, message);
    check("no row was written", (await rowCount()) === before);
    check("no object was left behind", rest.storage.count() === objectsBefore);
    check("the admin route still works",
      !/server error|couldn.t load/i.test(await page.innerText("body")));
    check("and the form is usable again", !(await uploadButton(page).isDisabled()));

    rest.storage.faults.uploadFails = false;
    await context.close();
  }

  /* ── 7. The row cannot be written ─────────────────────────────────────── */
  console.log("\n7. The database refuses the row");
  {
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const before = await rowCount();
    const objectsBefore = rest.storage.count();

    // A CHECK constraint the insert cannot satisfy, so the row fails after the
    // object has already landed — the exact split-brain this has to clean up.
    // NOT VALID: the point is to refuse the *next* insert, not to re-check the
    // rows already there — which would fail to apply at all.
    await rest.query("alter table media add constraint media_qa_refuse check (path is null) not valid");

    await choose(page, { name: "orphan.jpg", type: "image/jpeg", bytes: 90 * 1024 });
    await submit(page);
    await page.waitForSelector("[data-upload-error]", { timeout: 30000 });

    const message = await errorText(page);
    check("the form says it was not recorded", /not recorded|removed/i.test(message), message);
    check("no row was written", (await rowCount()) === before);
    check("and the uploaded object was cleaned up",
      rest.storage.count() === objectsBefore,
      `${objectsBefore} -> ${rest.storage.count()}`);
    check("the admin route still works",
      !/server error|couldn.t load/i.test(await page.innerText("body")));

    await rest.query("alter table media drop constraint media_qa_refuse");
    await context.close();
  }

  /* ── 8. The object vanishes before it is recorded ─────────────────────── */
  console.log("\n8. Storage cannot confirm the object");
  {
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const before = await rowCount();
    const objectsBefore = rest.storage.count();
    rest.storage.faults.infoFails = true;

    await choose(page, { name: "phantom.jpg", type: "image/jpeg", bytes: 70 * 1024 });
    await submit(page);
    await page.waitForSelector("[data-upload-error]", { timeout: 30000 });

    check("no row points at an unconfirmed file", (await rowCount()) === before);
    const message = await errorText(page);
    check("and the form says why", /did not arrive|not recorded/i.test(message), message);
    // The bytes did land — it was the read-back that failed — so the object has
    // to be cleared away too, or the bucket collects files nothing references.
    check("and the unreferenced object was removed",
      rest.storage.count() === objectsBefore,
      `${objectsBefore} -> ${rest.storage.count()}`);

    rest.storage.faults.infoFails = false;
    await context.close();
  }

  /* ── 9. Authorisation is the server's ─────────────────────────────────── */
  console.log("\n9. Tickets are not issued to anybody");
  {
    // Signed out entirely: the ticket action must not answer.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });
    check("a signed-out visitor is sent to sign in", page.url().includes("/admin/login"), page.url());

    // And the signed upload URL is scoped to one path, not the bucket.
    const stolen = await page.evaluate(async (origin) => {
      const response = await fetch(`${origin}/storage/v1/object/upload/sign/site/uploads/forged.jpg`, {
        method: "PUT",
        body: "x",
      });
      return response.status;
    }, rest.url);
    check("a PUT without a token is refused", stolen >= 400, String(stolen));

    await context.close();
  }

  /* ── 10. The library shows what was uploaded ──────────────────────────── */
  console.log("\n10. What the library ends up holding");
  {
    const { context, page } = await signedInPage();
    await page.goto(`${base}/admin/media`, { waitUntil: "networkidle" });

    const listed = await page.locator("ul li").count();
    const rows = await rowCount();
    check("every row is listed", listed >= rows, `${listed} shown, ${rows} rows`);

    // Only the rows this suite uploaded: the seeded library points at files
    // shipped in /public, which were never Storage objects and never will be.
    const { rows: uploaded } = await rest.query(
      "select count(*)::int as n from media where path like 'uploads/%'"
    );
    check("every uploaded row has its object, and no object is unreferenced",
      rest.storage.count() === uploaded[0].n,
      `${rest.storage.count()} objects, ${uploaded[0].n} uploaded rows`);

    await context.close();
  }
} finally {
  await browser.close();
  // The suite's own rows and objects, not the seed's.
  await rest.query(
    "delete from media where path like 'uploads/%' and id not in (select coalesce(hero_media_id, '00000000-0000-0000-0000-000000000000') from services)"
  );
  await rest.query("delete from admin_profiles where email = $1", [OWNER.email]);
  child.kill("SIGKILL");
  await rest.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
