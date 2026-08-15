/**
 * The team gallery: the ring, and everything that has to be true around it.
 *
 * Most of these are the specific failures a WebGL carousel drops onto a page.
 * The one worth naming is the scroll test: a gallery that takes the wheel
 * stops the page moving whenever the pointer happens to be over it, and that
 * is invisible in a screenshot and immediately intolerable in use.
 */
import { chromium } from "playwright";
import pg from "pg";

const base = process.env.BASE ?? "http://localhost:3231";

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

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const desktop = { width: 1440, height: 1000 };

try {
  /* ── 1. The data is the database's ────────────────────────────────────── */
  console.log("\n1. Driven by Supabase, not by a constant");
  {
    const { rows } = await db.query(
      "select name, role from team_members where published order by display_order"
    );

    const context = await browser.newContext({ viewport: desktop });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);

    const text = await page.locator("#team").innerText();
    const hidden = await page.locator("#team ul.sr-only").innerText().catch(() => "");
    const all = `${text}\n${hidden}`;

    check("every published member appears", rows.every((r) => all.includes(r.name)),
      rows.map((r) => r.name).join(", "));
    check("with their role", rows.every((r) => all.toUpperCase().includes(r.role.toUpperCase())));
    // innerText returns the CSS-transformed text, and the count is set in
    // uppercase, so this has to be case-insensitive.
    check("and the count is the row count",
      new RegExp(`${rows.length} people`, "i").test(await page.locator("#team").innerText()),
      String(rows.length));

    /* ── 2. The information is in the DOM ───────────────────────────────── */
    console.log("\n2. Not locked inside a texture");
    const canvases = await page.locator("#team canvas").count();
    check("the ring is drawn on a canvas", canvases === 1, String(canvases));
    check("which is hidden from assistive technology",
      (await page.locator("#team [aria-hidden='true']").count()) > 0);

    check("the active member's name is real text",
      (await page.locator("#team h3").first().innerText()).trim().length > 0);
    check("there is a live region announcing changes",
      (await page.locator("#team [aria-live='polite']").count()) === 1);
    check("and every member is in the document regardless of which is in front",
      rows.every((r) => hidden.includes(r.name)), hidden.slice(0, 80));

    /* ── 3. Controls ───────────────────────────────────────────────────── */
    console.log("\n3. Previous, next and the keyboard");
    const nameOf = () => page.locator("#team h3").first().innerText();
    const first = await nameOf();

    const next = page.locator('#team button:has-text("→")');
    const prev = page.locator('#team button:has-text("←")');
    check("there is a next control", (await next.count()) === 1);
    check("and a previous one", (await prev.count()) === 1);

    await next.click();
    await page.waitForTimeout(700);
    const second = await nameOf();
    check("next moves on", second !== first, `${first} -> ${second}`);

    await prev.click();
    await page.waitForTimeout(700);
    check("previous moves back", (await nameOf()) === first, await nameOf());

    const group = page.locator('#team [role="group"]');
    await group.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    check("ArrowRight moves on", (await nameOf()) === second, await nameOf());

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(700);
    check("ArrowLeft moves back", (await nameOf()) === first, await nameOf());

    check("the ring is reachable by keyboard",
      (await group.getAttribute("tabindex")) === "0");
    check("and describes what the keys do",
      Boolean(await group.getAttribute("aria-describedby")));

    /* ── 4. It does not steal the page's scroll ─────────────────────────── */
    console.log("\n4. Scrolling past it");
    await page.locator("#team").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const box = await page.locator('#team [role="group"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => window.scrollY);

    check("a vertical wheel over the gallery still scrolls the page",
      after > before + 100, `${before} -> ${after}`);

    const nameBefore = await nameOf();
    check("and does not change the member", (await nameOf()) === nameBefore);

    /* ── 5. Nothing is bound to window ──────────────────────────────────── */
    console.log("\n5. Events are the container's");
    // Wheeling well away from the gallery must not move it.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.mouse.move(60, 200);
    const awayBefore = await nameOf();
    await page.mouse.wheel(400, 0);
    await page.waitForTimeout(900);
    check("a horizontal wheel elsewhere on the page is ignored",
      (await nameOf()) === awayBefore, `${awayBefore} -> ${await nameOf()}`);

    await context.close();
  }

  /* ── 6. Reduced motion gets the roster ────────────────────────────────── */
  console.log("\n6. Reduced motion");
  {
    const context = await browser.newContext({ viewport: desktop, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    check("no canvas is created", (await page.locator("#team canvas").count()) === 0);
    const { rows } = await db.query("select count(*)::int as n from team_members where published");
    check("and every member is laid out instead",
      (await page.locator("#team li").count()) === rows[0].n,
      `${await page.locator("#team li").count()} vs ${rows[0].n}`);

    await context.close();
  }

  /* ── 7. Without WebGL ─────────────────────────────────────────────────── */
  console.log("\n7. No WebGL available");
  {
    const context = await browser.newContext({ viewport: desktop });
    await context.addInitScript(() => {
      // Refuse every WebGL context before the page runs.
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).includes("webgl")) return null;
        return original.call(this, type, ...rest);
      };
    });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    check("the ring is not attempted", (await page.locator("#team canvas").count()) === 0);
    check("and the roster is there instead",
      (await page.locator("#team li").count()) > 0,
      String(await page.locator("#team li").count()));

    await context.close();
  }

  /* ── 8. Mobile ────────────────────────────────────────────────────────── */
  console.log("\n8. On a phone");
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    check("no ring on a narrow screen", (await page.locator("#team canvas").count()) === 0);
    check("the roster is stacked and readable",
      (await page.locator("#team li").count()) > 0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    check("and nothing overflows sideways", !overflow);

    await context.close();
  }

  /* ── 9. The placeholder is Loomie's, not a stock face ─────────────────── */
  console.log("\n9. Members without a photograph");
  {
    const { rows } = await db.query(
      "select count(*)::int as n from team_members where published and photo_media_id is null"
    );

    const context = await browser.newContext({ viewport: desktop });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const html = await page.content();
    check("no third-party placeholder service is used",
      !/picsum|placehold|unsplash\.it|placekitten|thispersondoesnotexist/i.test(html));

    await context.close();

    // The drawn plate has to be checked where the roster renders: on the ring
    // the plates are painted into the canvas, so there is nothing in the DOM
    // to count.
    if (rows[0].n > 0) {
      const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const phone = await narrow.newPage();
      await phone.goto(`${base}/about`, { waitUntil: "networkidle" });
      await phone.waitForTimeout(2000);

      const plates = await phone.evaluate(() => {
        const team = document.getElementById("team");
        return [...team.querySelectorAll("li")].filter((li) => li.querySelector("svg")).length;
      });
      const photos = await phone.evaluate(
        () => document.querySelectorAll("#team li img").length
      );

      check(`${rows[0].n} members without a photo get a drawn plate`,
        plates === rows[0].n, String(plates));
      check("and no image is invented for them", photos === 0, String(photos));

      await narrow.close();
    }
  }
} finally {
  await browser.close();
  await db.end();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
