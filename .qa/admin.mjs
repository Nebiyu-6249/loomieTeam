/**
 * The admin, driven through a browser against real Postgres.
 *
 * The stub applies the real policies: an administrator's requests run as
 * `authenticated` with their own auth.uid(), so everything
 * supabase/migrations/0002_rls.sql says is enforced by the database while these
 * screens are being clicked. An editor being refused a booking list is the
 * database refusing it, not the interface hiding it.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";
import { randomUUID } from "node:crypto";

const ROOT = "/home/user/loomieTeam";
const DB = process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error("SUPABASE_DB_URL is required.");
  process.exit(1);
}

const PORT = 3345;
const base = `http://localhost:${PORT}`;

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

const rest = await startPostgrestStub(3392, DB);

/* ── Two accounts: an owner and an editor ────────────────────────────────── */

const OWNER = { authId: randomUUID(), email: "owner@example.com", password: "correct-horse" };
const EDITOR = { authId: randomUUID(), email: "editor@example.com", password: "battery-staple" };

rest.addUser(OWNER.authId, OWNER.email, OWNER.password);
rest.addUser(EDITOR.authId, EDITOR.email, EDITOR.password);

await rest.query("delete from admin_profiles where email like '%@example.com'");
await rest.query(
  `insert into admin_profiles (auth_user_id, name, email, role, is_active)
   values ($1, 'Ada Owner', $2, 'owner', true), ($3, 'Eve Editor', $4, 'editor', true)`,
  [OWNER.authId, OWNER.email, EDITOR.authId, EDITOR.email]
);

const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: ROOT,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: rest.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
    SUPABASE_SECRET_KEY: rest.serviceKey,
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
import { createWriteStream } from "node:fs";
const serverLog = createWriteStream("/tmp/admin-server.log");
child.stderr.pipe(serverLog);
child.stdout.pipe(serverLog);

for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`${base}/api/availability`)).ok) break;
  } catch {
    /* not up */
  }
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function signIn(page, account) {
  await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 }),
    page.click('form button[type="submit"]'),
  ]);
}

try {
  /* ── 1. Signing in ────────────────────────────────────────────────────── */
  console.log("\n1. Signing in");
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
    check("/admin redirects to sign in when signed out", page.url().includes("/admin/login"), page.url());

    // A wrong password must not say whether the account exists.
    const alertText = async () => {
      // Next injects its own aria-live region with role="alert" for route
              // announcements, so this has to be the form's own message.
              const alert = page.locator('form p[role="alert"]');
      await alert.waitFor({ state: "visible", timeout: 10000 });
      // The element appears before React fills it, so wait for the text too.
      for (let i = 0; i < 40; i += 1) {
        const text = (await alert.textContent()) ?? "";
        if (text.trim()) return text.trim();
        await page.waitForTimeout(100);
      }
      return "";
    };

    await page.fill('input[name="email"]', OWNER.email);
    await page.fill('input[name="password"]', "wrong");
    await page.click('main form button[type="submit"]');
    const wrongPassword = await alertText();

    await page.reload({ waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "nobody@example.com");
    await page.fill('input[name="password"]', "wrong");
    await page.click('main form button[type="submit"]');
    const unknownAccount = await alertText();

    check("a wrong password is refused", /do not match/i.test(wrongPassword ?? ""), wrongPassword ?? "");
    check(
      "an unknown address gets the same answer",
      wrongPassword === unknownAccount,
      `${wrongPassword} vs ${unknownAccount}`
    );

    await signIn(page, OWNER);
    check("the owner reaches the overview", page.url().endsWith("/admin"), page.url());

    const heading = await page.textContent("h1");
    check("greeted by name", /Ada/.test(heading ?? ""), heading ?? "");

    await context.close();
  }

  /* ── 2. The overview counts what is really there ──────────────────────── */
  console.log("\n2. The overview counts the database");
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, OWNER);

  {
    const { rows } = await rest.query("select count(*)::int as n from services");
    const shown = await page.locator('a[href="/admin/services"] span').nth(1).textContent();
    check("services count matches the table", Number(shown) === rows[0].n, `${shown} vs ${rows[0].n}`);

    const team = await rest.query("select count(*)::int as n from team_members");
    const teamShown = await page.locator('a[href="/admin/team"] span').nth(1).textContent();
    check("team count matches the table", Number(teamShown) === team.rows[0].n, `${teamShown} vs ${team.rows[0].n}`);

    check(
      "an owner sees the sections editors do not",
      await page.locator('a[href="/admin/bookings"]').first().isVisible(),
      "bookings link missing"
    );
  }

  /* ── 3. Editing a service, and the site changing ──────────────────────── */
  console.log("\n3. Editing a service");
  {
    const before = await (await fetch(`${base}/services`)).text();
    check("the site currently says “Logo Design”", before.includes("Logo Design"), "not found");

    await page.goto(`${base}/admin/services`, { waitUntil: "networkidle" });
    const rowCount = await page.locator("tbody tr").count();
    const { rows } = await rest.query("select count(*)::int as n from services");
    check("the list shows every service", rowCount === rows[0].n, `${rowCount} vs ${rows[0].n}`);

    await page.click('tbody tr:first-child a[href^="/admin/services/"]');
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });

    await page.fill('input[name="title"]', "Logo Design and marks");
    await Promise.all([
      page.waitForURL(/saved=1/, { timeout: 15000 }),
      page.click('main form button[type="submit"]'),
    ]);

    const status = await page.textContent('[role="status"]');
    check("it says it saved", /saved/i.test(status ?? ""), status ?? "");

    const stored = await rest.query(
      "select title from services order by display_order limit 1"
    );
    check("the row really changed", stored.rows[0].title === "Logo Design and marks", stored.rows[0].title);

    // revalidatePath named /services, so the public page reflects it.
    const after = await (await fetch(`${base}/services`)).text();
    check(
      "the public page shows the new title",
      after.includes("Logo Design and marks"),
      "public page still stale"
    );

    // Put it back.
    await page.fill('input[name="title"]', "Logo Design");
    await Promise.all([
      page.waitForURL(/saved=1/, { timeout: 15000 }),
      page.click('main form button[type="submit"]'),
    ]);
  }

  /* ── 4. Validation is the server's, not the browser's ─────────────────── */
  console.log("\n4. Validation");
  {
    await page.goto(`${base}/admin/services`, { waitUntil: "networkidle" });
    await page.click('tbody tr:first-child a[href^="/admin/services/"]');
    await page.waitForSelector('input[name="slug"]', { timeout: 10000 });

    // A slug the database would reject, submitted past the browser's pattern.
    await page.evaluate(() => {
      const input = document.querySelector('input[name="slug"]');
      input.removeAttribute("pattern");
      input.value = "Not A Slug";
    });
    await page.click('main form button[type="submit"]');
    await page.waitForSelector('form p[role="alert"]', { timeout: 10000 });
    const message = await page.textContent('form p[role="alert"]');
    check("a malformed slug is refused", /hyphen|lower case/i.test(message ?? ""), message ?? "");

    const stored = await rest.query("select slug from services order by display_order limit 1");
    check("and nothing was written", stored.rows[0].slug === "logo-design", stored.rows[0].slug);
  }

  /* ── 5. Reordering ───────────────────────────────────────────────────── */
  console.log("\n5. Reordering");
  {
    await page.goto(`${base}/admin/sectors`, { waitUntil: "networkidle" });
    const firstBefore = await page.locator("tbody tr:first-child td:nth-child(2)").textContent();

    await page.click('tbody tr:first-child button:has-text("↓"), tbody tr:first-child button >> nth=1');
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    const firstAfter = await page.locator("tbody tr:first-child td:nth-child(2)").textContent();
    check("moving down changes the order", firstBefore !== firstAfter, `${firstBefore} -> ${firstAfter}`);

    // And back.
    await page.click('tbody tr:nth-child(2) button >> nth=0');
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const restored = await page.locator("tbody tr:first-child td:nth-child(2)").textContent();
    check("and moving it back restores it", restored === firstBefore, `${restored} vs ${firstBefore}`);
  }

  /* ── 6. Create and delete ────────────────────────────────────────────── */
  console.log("\n6. Creating and deleting");
  {
    await page.goto(`${base}/admin/engagements/new`, { waitUntil: "networkidle" });
    await page.fill('input[name="number"]', "99");
    await page.fill('input[name="title"]', "Test engagement");
    await page.fill('input[name="duration"]', "1 week");
    await Promise.all([
      page.waitForURL(/saved=1/, { timeout: 15000 }),
      page.click('main form button[type="submit"]'),
    ]);

    const created = await rest.query("select id, title from engagements where number = '99'");
    check("the row was created", created.rows.length === 1, JSON.stringify(created.rows));

    await page.click('button:has-text("Delete this engagement")');
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/admin/engagements", { timeout: 15000 }),
      page.click('button:has-text("Yes, delete it")'),
    ]);

    const gone = await rest.query("select id from engagements where number = '99'");
    check("and deleted", gone.rows.length === 0, JSON.stringify(gone.rows));
  }

  /* ── 7. A constraint the interface cannot talk past ──────────────────── */
  console.log("\n7. A social link cannot be enabled without an address");
  {
    await page.goto(`${base}/admin/social`, { waitUntil: "networkidle" });

    // The three seeded platforms are the ones the studio actually uses, and
    // all three have to be listed and openable here.
    const listed = await page.locator("tbody").innerText();
    check("all three platforms are listed",
      /linkedin/i.test(listed) && /instagram/i.test(listed) && /x\s*\/\s*twitter/i.test(listed),
      listed.replace(/\s+/g, " ").slice(0, 140));
    check("and each one opens for editing",
      (await page.locator("tbody tr").count()) === 3 &&
        (await page.locator('tbody a[href^="/admin/social/"]').count()) >= 3,
      `${await page.locator("tbody tr").count()} rows`);

    await page.click('tbody tr:first-child a[href^="/admin/social/"]');
    await page.waitForSelector('input[name="url"]', { timeout: 10000 });

    await page.check('input[name="enabled"]');
    await page.click('main form button[type="submit"]');
    await page.waitForSelector('form p[role="alert"]', { timeout: 10000 });
    const refused = await page.textContent('form p[role="alert"]');
    check("enabling without a URL is refused", /not allowed|check the notes/i.test(refused ?? ""), refused ?? "");

    const stored = await rest.query("select enabled from social_links order by display_order limit 1");
    check("and it stayed disabled", stored.rows[0].enabled === false, String(stored.rows[0].enabled));

    // With an address, the same edit goes through.
    await page.fill('input[name="url"]', "https://example.com/loomie");
    await page.check('input[name="enabled"]');
    await Promise.all([
      page.waitForURL(/saved=1/, { timeout: 15000 }),
      page.click('main form button[type="submit"]'),
    ]);
    const enabled = await rest.query("select enabled, url from social_links order by display_order limit 1");
    check("with an address it is allowed", enabled.rows[0].enabled === true, JSON.stringify(enabled.rows[0]));

    // The public footer picks it up.
    const about = await (await fetch(`${base}/about`)).text();
    check("and the site shows it", about.includes("example.com/loomie"), "link missing from /about");

    await rest.query("update social_links set enabled = false, url = null");
  }

  await context.close();

  /* ── 8. An editor is stopped by the database ─────────────────────────── */
  console.log("\n8. An editor's limits");
  {
    const editorContext = await browser.newContext();
    const editorPage = await editorContext.newPage();
    await signIn(editorPage, EDITOR);

    check("an editor reaches the overview", editorPage.url().endsWith("/admin"), editorPage.url());

    check(
      "and is not offered the restricted sections",
      !(await editorPage.locator('a[href="/admin/bookings"]').count()),
      "bookings link offered to an editor"
    );

    check(
      "no booking figures on their overview",
      !(await editorPage.getByText("Waiting for somebody").count()),
      "restricted panel shown"
    );

    // Typing the URL directly is the real test.
    const response = await editorPage.goto(`${base}/admin/social`, { waitUntil: "networkidle" });
    check(
      "typing a restricted URL gets nothing",
      response.status() === 404,
      `status ${response.status()}`
    );

    // Content is theirs, though.
    await editorPage.goto(`${base}/admin/services`, { waitUntil: "networkidle" });
    check(
      "but content is theirs to edit",
      (await editorPage.locator("tbody tr").count()) > 0,
      "no services listed for an editor"
    );

    /**
     * And the database refuses them directly, not just the interface.
     *
     * This is the check that matters: hiding a page is a courtesy, and an
     * editor with an access token can call the REST API without ever opening
     * the admin. The policies used is_admin(), which an editor satisfies, so
     * until migration 0003 this returned every visitor's name, address and
     * message.
     */
    const token = await editorPage.evaluate(() => {
      // Not localStorage: this app's browser client is @supabase/ssr's, so the
      // session lives in `sb-<ref>-auth-token` — base64-encoded, and split
      // across numbered chunks once it outgrows one cookie.
      const chunks = document.cookie
        .split("; ")
        .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)])
        .filter(([name]) => /^sb-.*auth-token(\.\d+)?$/.test(name))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

      if (chunks.length === 0) return null;

      let raw = chunks.map(([, value]) => decodeURIComponent(value)).join("");
      if (raw.startsWith("base64-")) {
        const bytes = Uint8Array.from(atob(raw.slice(7)), (c) => c.charCodeAt(0));
        raw = new TextDecoder().decode(bytes);
      }

      try {
        const session = JSON.parse(raw);
        return Array.isArray(session) ? session[0] : (session?.access_token ?? null);
      } catch {
        return null;
      }
    });

    if (token) {
      const read = async (table) => {
        const response = await fetch(`${rest.url}/rest/v1/${table}?select=id`, {
          headers: { Authorization: `Bearer ${token}`, apikey: "stub-publishable" },
        });
        return response.ok ? (await response.json()).length : -1;
      };
      const write = async (table, patch) => {
        const response = await fetch(`${rest.url}/rest/v1/${table}?select=id`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: "stub-publishable",
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(patch),
        });
        return response.ok ? (await response.json()).length : -1;
      };

      const bookings = await read("bookings");
      check("an editor's own token reads no bookings", bookings === 0, String(bookings));
      const enquiries = await read("enquiries");
      check("and no enquiries", enquiries === 0, String(enquiries));
      const services = await read("services");
      check("while still reading services", services > 0, String(services));

      const changed = await write("bookings", { status: "cancelled" });
      check("and changes no booking rows", changed === 0, String(changed));
      const touched = await write("enquiries", { status: "closed" });
      check("nor any enquiry", touched === 0, String(touched));
    } else {
      check("an editor's access token could be read for the direct RLS check", false,
        "no sb-*-auth-token cookie found");
    }

    await editorContext.close();
  }

  /* ── 9. Signing out ──────────────────────────────────────────────────── */
  console.log("\n9. Signing out");
  {
    const outContext = await browser.newContext();
    const outPage = await outContext.newPage();
    await signIn(outPage, OWNER);

    await Promise.all([
      outPage.waitForURL(/\/admin\/login/, { timeout: 15000 }),
      outPage.click('button:has-text("Sign out")'),
    ]);
    check("sign out returns to the form", outPage.url().includes("/admin/login"), outPage.url());

    await outPage.goto(`${base}/admin`, { waitUntil: "networkidle" });
    check("and the session is gone", outPage.url().includes("/admin/login"), outPage.url());

    await outContext.close();
  }

  /* ── 9b. Projects, bookings, enquiries, settings, people ─────────────── */
  console.log("\n9b. The rest of the sections");
  {
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await signIn(p2, OWNER);

    // Projects: a case study with its sections, disciplines and gallery.
    await p2.goto(`${base}/admin/projects`, { waitUntil: "networkidle" });
    const projectRows = await p2.locator("tbody tr").count();
    const { rows: projectCount } = await rest.query("select count(*)::int as n from projects");
    check("the work list shows every project", projectRows === projectCount[0].n, `${projectRows} vs ${projectCount[0].n}`);

    await p2.click('tbody tr:first-child a[href^="/admin/projects/"]');
    await p2.waitForSelector('textarea[name="scenario"]', { timeout: 10000 });

    const scenario = await p2.inputValue('textarea[name="scenario"]');
    check("its sections are loaded", scenario.length > 20, `${scenario.length} characters`);

    const disciplines = await p2.inputValue('input[name="disciplines"]');
    check("its disciplines are loaded", disciplines.includes(","), disciplines);

    const galleryRows = await p2.locator('select[name="gallery_media"]').count();
    check("its gallery is loaded", galleryRows >= 2, `${galleryRows} rows`);

    await p2.fill('textarea[name="direction"]', "A revised direction, saved from the admin.");
    await Promise.all([
      p2.waitForURL(/saved=1/, { timeout: 15000 }),
      p2.click('main form button[type="submit"]'),
    ]);

    const savedSection = await rest.query(
      `select body from project_sections s
         join projects p on p.id = s.project_id
        where s.kind = 'direction' and p.display_order = 0`
    );
    check(
      "editing a section writes it",
      savedSection.rows[0]?.body === "A revised direction, saved from the admin.",
      savedSection.rows[0]?.body?.slice(0, 60)
    );

    const stillThere = await rest.query(
      `select count(*)::int as n from project_media m
         join projects p on p.id = m.project_id where p.display_order = 0`
    );
    check("and leaves the gallery alone", stillThere.rows[0].n === galleryRows, `${stillThere.rows[0].n} vs ${galleryRows}`);

    // Bookings and enquiries: a real row each, then a status change. Cleared
    // first, so an interrupted run does not poison the next one.
    await rest.query("delete from bookings where booking_code = 'LM-TEST01'");
    await rest.query("delete from enquiries where email = 'grace@example.com'");
    await rest.query(
      `insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone, status)
       values ('LM-TEST01', 'Ada Test', 'ada@example.com',
               now() + interval '3 days', now() + interval '3 days 20 minutes',
               'Europe/London', 'pending')`
    );
    await rest.query(
      `insert into enquiries (name, email, message, status)
       values ('Grace Test', 'grace@example.com', 'A question about identity work.', 'new')`
    );

    await p2.goto(`${base}/admin/bookings`, { waitUntil: "networkidle" });
    check("the booking is listed", await p2.getByText("Ada Test", { exact: true }).first().isVisible(), "not shown");
    check("with its reference", (await p2.locator("body").innerText()).includes("LM-TEST01"), "reference missing");
    check(
      "and says the visitor was never confirmed",
      (await p2.locator("body").innerText()).includes("No confirmation reached Ada"),
      "warning missing"
    );

    await p2.selectOption('select[name="status"]', "cancelled");
    await p2.waitForTimeout(1500);
    const cancelled = await rest.query("select status from bookings where booking_code = 'LM-TEST01'");
    check("changing the status writes it", cancelled.rows[0].status === "cancelled", cancelled.rows[0].status);

    await p2.goto(`${base}/admin/enquiries`, { waitUntil: "networkidle" });
    check("the enquiry is listed", await p2.getByText("Grace Test", { exact: true }).first().isVisible(), "not shown");
    check(
      "with the whole message, not a preview",
      (await p2.locator("body").innerText()).includes("A question about identity work."),
      "message truncated"
    );

    // Settings, and the site changing with them.
    await p2.goto(`${base}/admin/settings`, { waitUntil: "networkidle" });
    await p2.fill('input[name="footer_statement"]', "Working from three time zones");
    await Promise.all([
      p2.waitForURL(/saved=1/, { timeout: 15000 }),
      p2.click('main form button[type="submit"]'),
    ]);

    const contact = await (await fetch(`${base}/contact`)).text();
    check(
      "a setting change reaches the site",
      contact.includes("Working from three time zones"),
      "footer line not updated"
    );

    // Media: the library lists what is registered.
    await p2.goto(`${base}/admin/media`, { waitUntil: "networkidle" });
    const { rows: mediaCount } = await rest.query("select count(*)::int as n from media");
    const shown = await p2.locator("ul li form").count();
    check("the media library lists every image", shown === mediaCount[0].n, `${shown} vs ${mediaCount[0].n}`);

    // People: the two accounts this suite created.
    await p2.goto(`${base}/admin/people`, { waitUntil: "networkidle" });
    check("both administrators are listed", (await p2.locator("body").innerText()).includes("Eve Editor"), "editor missing");
    check(
      "and the signed-in one cannot deactivate themselves",
      (await p2.locator('button:has-text("Deactivate")').count()) === 1,
      "self-deactivation offered"
    );

    await rest.query("delete from bookings where booking_code = 'LM-TEST01'");
    await rest.query("delete from enquiries where email = 'grace@example.com'");
    await ctx.close();
  }

  /* ── 10. The admin is not indexed ────────────────────────────────────── */
  console.log("\n10. Not indexed");
  {
    const login = await fetch(`${base}/admin/login`);
    const html = await login.text();
    check("the sign-in page is noindex", /noindex/.test(html), "no robots meta");
    check("and has no OpenGraph card", !/og:title/.test(html), "og tags present");

    const robots = await (await fetch(`${base}/robots.txt`)).text();
    check("robots.txt disallows /admin", /Disallow: \/admin/.test(robots), robots.slice(0, 200));

    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    check("the sitemap does not list it", !/\/admin/.test(sitemap), "admin in sitemap");
  }
} finally {
  await browser.close();
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  await rest.query("delete from admin_profiles where email like '%@example.com'");
  await rest.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
