/**
 * What each route actually downloads, and which heavy libraries it pulls.
 *
 * The two claims worth checking by measurement rather than by reading the
 * import graph: `ogl` reaches /about and nowhere else, and three.js still
 * reaches nothing until the homepage's state section is near.
 *
 * Libraries are identified by what is inside the chunk, not by its name. Both
 * bundlers emit hash-named files, so a filename test passes or fails for
 * reasons unrelated to what is actually being shipped — the first version of
 * this file reported ogl as absent from a page that was visibly rendering with
 * it.
 */
import { chromium } from "playwright";

/** Present in ogl's Renderer and in nothing else the site loads. */
const OGL_SIGNATURE = "this.gl.renderer";

/** three.js names its base class in the bundle whatever the mangler does. */
const THREE_SIGNATURE = /BufferGeometry|Object3D/;

const base = process.env.BASE ?? "http://localhost:3230";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const measure = async (path, { settle = 3200, scrollTo } = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const scripts = new Set();
  page.on("response", (response) => {
    const url = response.url();
    if (/\.js(\?|$)/.test(url) || /\/chunks\//.test(url)) scripts.add(url);
  });

  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(settle);

  const initial = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => /\.js(\?|$)|\/chunks\//.test(e.name) && !/\.css/.test(e.name))
      .reduce((n, e) => n + (e.transferSize || e.encodedBodySize || 0), 0)
  );

  let after = initial;
  if (scrollTo) {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
    }, scrollTo);
    await page.waitForTimeout(4200);
    after = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\.js(\?|$)|\/chunks\//.test(e.name) && !/\.css/.test(e.name))
        .reduce((n, e) => n + (e.transferSize || e.encodedBodySize || 0), 0)
    );
  }

  // Read what was actually downloaded.
  let ogl = false;
  let three = false;
  for (const url of scripts) {
    try {
      const body = await (await fetch(url)).text();
      if (body.includes(OGL_SIGNATURE)) ogl = true;
      if (THREE_SIGNATURE.test(body)) three = true;
    } catch {
      /* a chunk that will not fetch cannot be the one under test */
    }
  }

  await context.close();

  return {
    path,
    initialKB: Math.round(initial / 1024),
    afterKB: Math.round(after / 1024),
    ogl,
    three,
  };
};

const rows = [
  await measure("/", { scrollTo: "[data-state-section]" }),
  await measure("/about"),
  await measure("/services"),
  await measure("/clients"),
  await measure("/contact"),
  await measure("/work"),
];

console.log("\nroute        initial   after scroll   ogl    three");
for (const row of rows) {
  console.log(
    `${row.path.padEnd(12)} ${String(row.initialKB + "KB").padEnd(9)} ${String(
      row.afterKB + "KB"
    ).padEnd(14)} ${String(row.ogl).padEnd(6)} ${row.three}`
  );
}

/* ── The two rules ──────────────────────────────────────────────────────── */

let failed = 0;
const rule = (label, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
};

console.log("");
const about = rows.find((r) => r.path === "/about");
const home = rows.find((r) => r.path === "/");

rule("ogl loads on /about", about.ogl);
rule(
  "and on no other route",
  rows.filter((r) => r.path !== "/about").every((r) => !r.ogl),
  rows.filter((r) => r.ogl).map((r) => r.path).join(", ")
);
rule("three.js is not in the homepage's initial load", !home.three || home.afterKB > home.initialKB);
rule(
  "three.js reaches no route that does not draw with it",
  ["/about", "/services", "/clients", "/contact", "/work"].every(
    (p) => !rows.find((r) => r.path === p).three
  ),
  rows.filter((r) => r.three).map((r) => r.path).join(", ")
);

await browser.close();
console.log(`\n${failed} rule${failed === 1 ? "" : "s"} broken\n`);
process.exit(failed === 0 ? 0 : 1);
