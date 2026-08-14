import { chromium } from "playwright";
let passed=0, failed=0;
const check=(l,ok,d="")=>{ if(ok){passed++;console.log(`  PASS  ${l}`);} else {failed++;console.log(`  FAIL  ${l}  ${d}`);} };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});

// ── three.js must not arrive until the section approaches ──────────────────
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let threeKB = 0;
page.on("response", async r => {
  if (!/\/chunks\//.test(r.url())) return;
  try {
    const b = await r.body();
    if (/WebGLRenderer|BufferGeometry/.test(b.toString("utf8").slice(0, 900000))) threeKB += b.length / 1024;
  } catch {}
});
const errors = [];
page.on("pageerror", e => errors.push(String(e).slice(0,160)));

await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3400);
check("three.js absent at the top of the homepage", threeKB === 0, `${Math.round(threeKB)}KB`);
check("no canvas yet", await page.locator("canvas").count() === 0);

// Walk down to the state section.
const stateTop = await page.evaluate(() => {
  const el = document.querySelector("[data-state-section]");
  return el ? el.getBoundingClientRect().top + window.scrollY : -1;
});
check("state section exists", stateTop > 0, String(stateTop));

await page.evaluate(y => window.scrollTo(0, y), Math.max(0, stateTop - 1400));
await page.waitForTimeout(3000);
check("three.js has arrived before the section is reached", threeKB > 100, `${Math.round(threeKB)}KB`);

await page.evaluate(y => window.scrollTo(0, y), stateTop + 200);
await page.waitForTimeout(2500);
check("canvas is mounted at the section", await page.locator("canvas").count() === 1);
check("no page errors", errors.length === 0, errors.join(" ; "));
await ctx.close();

// ── The new route transition ───────────────────────────────────────────────
const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await c2.newPage();
const e2 = [];
p2.on("pageerror", e => e2.push(String(e).slice(0,160)));
await p2.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await p2.waitForTimeout(3000);

check("no polygon overlay exists any more", await p2.locator("[data-thaw]").count() === 0);

await p2.getByRole("navigation").getByRole("link", { name: "Work", exact: true }).first().click();
await p2.waitForTimeout(110);
const mid = await p2.evaluate(() => {
  const el = document.querySelector("[data-route-shell]");
  const s = getComputedStyle(el);
  return { opacity: Number(s.opacity), transform: s.transform };
});
check("the shell fades on the way out", mid.opacity < 0.98, JSON.stringify(mid));
check("nothing is painted over the page", await p2.locator("[data-thaw],[data-thaw-shard]").count() === 0);

await p2.waitForTimeout(1800);
const settled = await p2.evaluate(() => {
  const s = getComputedStyle(document.querySelector("[data-route-shell]"));
  return { opacity: Number(s.opacity), transform: s.transform };
});
check("the shell settles fully opaque", settled.opacity === 1, JSON.stringify(settled));
check("no residual transform", settled.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(settled.transform), settled.transform);
check("arrived at /work", new URL(p2.url()).pathname === "/work", p2.url());
check("no page errors", e2.length === 0, e2.join(" ; "));
await c2.close();

// ── Reduced motion: no transition, page still navigates ────────────────────
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p3 = await rm.newPage();
await p3.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await p3.waitForTimeout(2200);
await p3.getByRole("navigation").getByRole("link", { name: "Work", exact: true }).first().click();
await p3.waitForTimeout(140);
const rmOpacity = await p3.evaluate(() => Number(getComputedStyle(document.querySelector("[data-route-shell]")).opacity));
check("reduced motion: shell never fades", rmOpacity === 1, String(rmOpacity));
await p3.waitForTimeout(1400);
check("reduced motion: still navigates", new URL(p3.url()).pathname === "/work", p3.url());
await rm.close();

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed===0?0:1);
