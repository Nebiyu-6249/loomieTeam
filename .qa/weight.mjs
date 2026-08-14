import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
for (const route of ["/", "/work", "/work/signal", "/services", "/studio", "/clients", "/contact"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3210" + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(3400);
  const w = await page.evaluate(() => {
    const bucket = { js: 0, css: 0, font: 0, image: 0, other: 0 };
    for (const e of performance.getEntriesByType("resource")) {
      const size = e.transferSize || e.encodedBodySize || 0;
      const u = e.name;
      if (/\.js(\?|$)|\/chunks\//.test(u) && !/\.css/.test(u)) bucket.js += size;
      else if (/\.css/.test(u)) bucket.css += size;
      else if (/\.woff2?|\.ttf/.test(u)) bucket.font += size;
      else if (/\/_next\/image|\.(jpg|png|svg|webp|avif)/.test(u)) bucket.image += size;
      else bucket.other += size;
    }
    const nav = performance.getEntriesByType("navigation")[0];
    bucket.html = nav ? nav.transferSize || nav.encodedBodySize || 0 : 0;
    return bucket;
  });
  const kb = (n) => Math.round(n / 1024);
  const code = kb(w.js + w.css + w.font + w.html);
  const flag = code > 350 ? "  OVER BUDGET" : "";
  console.log(
    `${route.padEnd(14)} js ${String(kb(w.js)).padStart(4)}  css ${String(kb(w.css)).padStart(3)}  font ${String(kb(w.font)).padStart(3)}  html ${String(kb(w.html)).padStart(3)}  => ${String(code).padStart(4)}KB code   images ${kb(w.image)}KB${flag}`
  );
  await ctx.close();
}
await browser.close();
