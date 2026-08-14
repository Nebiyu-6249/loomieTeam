import { chromium } from "playwright";
let passed=0, failed=0;
const check=(l,ok,d="")=>{ if(ok){passed++;console.log(`  PASS  ${l}`);} else {failed++;console.log(`  FAIL  ${l}  ${d}`);} };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});

// ── With motion allowed ────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e).slice(0,160)));
await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3200);

check("no thaw layer on first load", await page.locator("[data-thaw]").count() === 0);

await page.getByRole("navigation").getByRole("link", { name: "Work", exact: true }).first().click();
await page.waitForTimeout(140);

const present = await page.locator("[data-thaw]").count();
check("thaw layer appears on navigation", present === 1, String(present));

const shards = await page.locator("[data-thaw-shard]").count();
check("twelve shards", shards === 12, String(shards));

// Sample the transform twice: it must actually be moving.
const t1 = await page.evaluate(() => {
  const els = [...document.querySelectorAll("[data-thaw-shard]")];
  return els.map(e => getComputedStyle(e).transform);
});
await page.waitForTimeout(220);
const t2 = await page.evaluate(() => {
  const els = [...document.querySelectorAll("[data-thaw-shard]")];
  return els.map(e => getComputedStyle(e).transform);
});
const moved = t1.filter((v,i) => v !== t2[i]).length;
check("shards are actually animating", moved > 0, `${moved}/12 changed`);

const anyTranslated = t2.some(v => v !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(v));
check("shards translate downward", anyTranslated, t2.slice(0,2).join(" | "));

await page.waitForTimeout(1600);
check("thaw layer is removed when done", await page.locator("[data-thaw]").count() === 0);
check("page arrived", new URL(page.url()).pathname === "/work", page.url());
check("no page errors", errors.length === 0, errors.join(" ; "));
await ctx.close();

// ── Reduced motion: no transition at all ───────────────────────────────────
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await p2.waitForTimeout(2200);
await p2.getByRole("navigation").getByRole("link", { name: "Work", exact: true }).first().click();
await p2.waitForTimeout(160);
check("reduced motion: no thaw layer", await p2.locator("[data-thaw]").count() === 0);
await p2.waitForTimeout(1500);
check("reduced motion: still navigates", new URL(p2.url()).pathname === "/work", p2.url());
await rm.close();

// ── three.js is only fetched on the homepage ───────────────────────────────
for (const [route, shouldLoad] of [["/contact", false], ["/", true]]) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await c.newPage();
  let threeBytes = 0;
  pg.on("response", async r => {
    if (!/\/chunks\//.test(r.url())) return;
    try {
      const body = await r.body();
      if (/WebGLRenderer|BufferGeometry/.test(body.toString("utf8").slice(0, 900000))) threeBytes += body.length;
    } catch {}
  });
  await pg.goto("http://localhost:3210" + route, { waitUntil: "networkidle" });
  await pg.waitForTimeout(3400);
  check(
    `${route}: three.js ${shouldLoad ? "is" : "is not"} downloaded`,
    shouldLoad ? threeBytes > 100000 : threeBytes === 0,
    `${Math.round(threeBytes/1024)}KB`
  );
  await c.close();
}

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed===0?0:1);
