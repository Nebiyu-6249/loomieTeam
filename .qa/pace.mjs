import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
for (const route of ["/", "/work"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3210" + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(2800);
  // Walk the page so lazy images resolve, then measure.
  const h = await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    return document.body.scrollHeight;
  });
  await page.waitForTimeout(1200);
  console.log(`${route.padEnd(8)} page height ${h}px  (${(h/900).toFixed(1)} screens)`);
  await ctx.close();
}
await browser.close();
