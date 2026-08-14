import { chromium } from "playwright";
const BASE = "http://localhost:3210";
let passed = 0, failed = 0;
const check = (l, ok, d="") => { if (ok) { passed++; console.log(`  PASS  ${l}`); } else { failed++; console.log(`  FAIL  ${l}  ${d}`); } };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

// 404
const notFound = await page.goto(`${BASE}/definitely-not-a-page`);
check("unknown route returns 404", notFound.status() === 404, String(notFound.status()));
await page.waitForTimeout(1500);
const nf = await page.innerText("body");
check("404 page says something useful", nf.length > 20, nf.slice(0, 120));

// Client-side navigation through the nav, then Back.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

for (const [label, path] of [["Work","/work"],["Services","/services"],["Studio","/studio"],["Who we work with","/clients"]]) {
  await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).first().click();
  await page.waitForTimeout(2200);
  check(`nav "${label}" -> ${path}`, new URL(page.url()).pathname === path, page.url());
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  check(`  ${path} renders an h1`, h1.trim().length > 0, h1);
  await page.goBack();
  await page.waitForTimeout(2200);
  check(`  Back returns home`, new URL(page.url()).pathname === "/", page.url());
  const heroStill = await page.locator("h1").first().innerText().catch(() => "");
  check(`  home hero survives Back`, /holds together/i.test(heroStill), heroStill.slice(0, 60));
}

// The hero's one action.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const heroActions = await page.evaluate(() => {
  const section = document.querySelector("section");
  return Array.from(section.querySelectorAll("a[href]")).map((a) => a.getAttribute("href"));
});
check("hero has exactly one action", heroActions.length === 1, heroActions.join(", "));
check("and it points at the work", heroActions[0] === "#work", String(heroActions[0]));

await page.getByRole("link", { name: /see selected work/i }).click();
await page.waitForTimeout(2200);
const scrolled = await page.evaluate(() => window.scrollY);
check("the hero action scrolls to Selected Work", scrolled > 400, `scrollY=${scrolled}`);

// No floating theme button anywhere.
const floating = await page.evaluate(() =>
  Array.from(document.querySelectorAll("button")).filter((b) => {
    const s = getComputedStyle(b);
    return s.position === "fixed" && Number(s.zIndex) > 1000 && b.closest("[role=dialog]") === null;
  }).map((b) => b.getAttribute("aria-label") || b.textContent?.trim().slice(0, 30))
);
check("no floating always-on control", floating.length === 0, floating.join(", "));

// The theme switch lives in the menu and works.
await page.getByRole("button", { name: /toggle fullscreen menu/i }).click();
await page.waitForTimeout(1400);
const before = await page.evaluate(() => document.documentElement.className);
await page.getByRole("button", { name: /light theme|dark theme/i }).click();
await page.waitForTimeout(1200);
const after = await page.evaluate(() => document.documentElement.className);
check("the menu's theme switch changes the theme", before !== after, `${before} -> ${after}`);

check("no uncaught page errors", errors.length === 0, errors.join(" ; "));

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
