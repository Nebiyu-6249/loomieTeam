import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

for (const y of [6400, 6800, 7200, 7600]) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const state = document.querySelector("[data-state-section]");
    const proc = document.querySelector("#process");
    const r = state?.getBoundingClientRect();
    const p = proc?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      state: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null,
      process: p ? { top: Math.round(p.top), bottom: Math.round(p.bottom) } : null,
    };
  });
  console.log(JSON.stringify(info));
}
await browser.close();
