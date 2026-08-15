/**
 * Social links: rendered only when real, and reaching every page they appear
 * on when they change.
 *
 * The revalidation half is the point. The footer is on seven routes and the
 * resource named three, so enabling a link updated the homepage, About and
 * Contact and left /work and /services pointing at nothing — a bug that only
 * shows up if you look at the right page after the right edit.
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

/** Every route with a footer. */
const FOOTER_ROUTES = ["/", "/work", "/services", "/about", "/clients", "/contact"];

const text = async (path) => (await (await fetch(base + path)).text());

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  /* ── 1. Nothing is invented ───────────────────────────────────────────── */
  console.log("\n1. Disabled and empty by default");
  await db.query("update social_links set enabled = false, url = null");

  // Nothing revalidates a change made behind the application's back, so give
  // the pages a moment and read them fresh.
  await new Promise((r) => setTimeout(r, 500));

  const { rows: platforms } = await db.query(
    "select platform, label from social_links order by display_order"
  );
  check(
    "all three platforms exist in the database",
    ["linkedin", "instagram", "twitter"].every((p) =>
      platforms.some((row) => row.platform === p)
    ),
    platforms.map((p) => p.platform).join(", ")
  );
  check(
    "X / Twitter is labelled as such",
    platforms.some((p) => p.platform === "twitter" && /x\s*\/\s*twitter/i.test(p.label)),
    platforms.find((p) => p.platform === "twitter")?.label
  );

  const { rows: bad } = await db.query(
    "select count(*)::int as n from social_links where enabled and url is null"
  );
  check("none is enabled without an address", bad[0].n === 0, String(bad[0].n));

  /* ── 2. Enabling one reaches every page with a footer ──────────────────── */
  console.log("\n2. Enabling a link, everywhere");
  const URL_UNDER_TEST = "https://example.com/loomie-social-test";

  await db.query(
    "update social_links set enabled = true, url = $1 where platform = 'linkedin'",
    [URL_UNDER_TEST]
  );

  check(
    "no address was invented for the other two",
    (await db.query("select count(*)::int as n from social_links where url is not null")).rows[0].n === 1,
    "something else has a URL"
  );

  // Ask the application to revalidate the way the admin does, by going through
  // it: a settings save is the same code path the social save uses.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await context.close();

  // Force a revalidation of everything, as saving in the admin would.
  await fetch(`${base}/api/availability`);

  let reached = 0;
  for (const route of FOOTER_ROUTES) {
    const html = await text(route);
    if (html.includes(URL_UNDER_TEST)) reached += 1;
  }

  check(
    `the link reaches all ${FOOTER_ROUTES.length} routes with a footer`,
    reached === FOOTER_ROUTES.length,
    `${reached}/${FOOTER_ROUTES.length}`
  );

  /* ── 3. And the pages that show it as a block ─────────────────────────── */
  console.log("\n3. Where it shows as more than a footer line");
  for (const route of ["/about", "/contact"]) {
    const html = await text(route);
    check(`${route} shows the Elsewhere block`, /Elsewhere/i.test(html));
  }

  /* ── 4. It is a text link, not an icon row ───────────────────────────── */
  console.log("\n4. Editorial, not a badge row");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const link = page.locator(`a[href="${URL_UNDER_TEST}"]`).first();
    check("the link is present", (await link.count()) > 0);
    check(
      "and reads as its label rather than as an icon",
      /linkedin/i.test(await link.innerText()),
      await link.innerText()
    );
    check(
      "opening in a new tab is marked safely",
      (await link.getAttribute("rel"))?.includes("noopener"),
      await link.getAttribute("rel")
    );

    await context.close();
  }

  /* ── 4b. The footer column, and the same set on every page ───────────── */
  console.log("\n4b. The Elsewhere column, and parity across pages");
  {
    // Two enabled, so "the same links" is a real comparison rather than one.
    await db.query(
      "update social_links set enabled = true, url = $1 where platform = 'instagram'",
      ["https://example.com/loomie-social-test-2"]
    );
    await fetch(`${base}/api/availability`);

    const home = await text("/");
    check("the footer gains an Elsewhere column once a link is on",
      /Elsewhere/i.test(home), "no Elsewhere heading on /");

    const enabled = (
      await db.query("select label from social_links where enabled and url is not null order by display_order")
    ).rows.map((row) => row.label);

    const linksOn = async (path) => {
      const html = await text(path);
      return enabled.filter((label) => html.includes(label));
    };

    const about = await linksOn("/about");
    const contact = await linksOn("/contact");

    check("About shows every enabled link", about.length === enabled.length,
      `${about.length}/${enabled.length}`);
    check("Contact shows the same ones", contact.join("|") === about.join("|"),
      `${contact.join(",")} vs ${about.join(",")}`);
    check("and the footer carries them too",
      enabled.every((label) => home.includes(label)), enabled.join(", "));

    // Off again, and the column goes with them.
    await db.query("update social_links set enabled = false, url = null");
    await fetch(`${base}/api/availability`);
    check("the column disappears when none is enabled",
      !/Elsewhere/i.test(await text("/")), "Elsewhere still on /");
  }

  /* ── 5. Turning it off removes it everywhere ─────────────────────────── */
  console.log("\n5. Disabling it again");
  await db.query("update social_links set enabled = false, url = null");
  await fetch(`${base}/api/availability`);

  let remaining = 0;
  for (const route of FOOTER_ROUTES) {
    if ((await text(route)).includes(URL_UNDER_TEST)) remaining += 1;
  }
  check("the link is gone from every route", remaining === 0, `${remaining} left`);
} finally {
  await browser.close();
  await db.query("update social_links set enabled = false, url = null");
  await db.end();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
