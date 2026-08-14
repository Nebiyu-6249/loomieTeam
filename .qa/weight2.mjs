import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3200);
const initial = await page.evaluate(() => performance.getEntriesByType("resource")
  .filter(e => /\.js(\?|$)|\/chunks\//.test(e.name) && !/\.css/.test(e.name))
  .reduce((n,e) => n + (e.transferSize || e.encodedBodySize || 0), 0));
const target = await page.evaluate(() => {
  const el = document.querySelector("[data-state-section]");
  return el.getBoundingClientRect().top + window.scrollY;
});
await page.evaluate(y => window.scrollTo(0, y), target);
await page.waitForTimeout(4000);
const after = await page.evaluate(() => performance.getEntriesByType("resource")
  .filter(e => /\.js(\?|$)|\/chunks\//.test(e.name) && !/\.css/.test(e.name))
  .reduce((n,e) => n + (e.transferSize || e.encodedBodySize || 0), 0));
console.log(`initial JS ${Math.round(initial/1024)}KB  ->  after reaching the section ${Math.round(after/1024)}KB  (three.js adds ${Math.round((after-initial)/1024)}KB, on demand)`);
await browser.close();
