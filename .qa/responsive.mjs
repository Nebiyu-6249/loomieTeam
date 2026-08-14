import { chromium } from "playwright";
const PORT = process.env.PORT ?? "3602";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const PATHS = ["/", "/work", "/services", "/about", "/clients", "/contact", "/work/northbank"];
const out = { overflow: [], errors: [] };
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => out.errors.push(`${w} ${String(e).slice(0,90)}`));
  page.on("console", m => m.type()==="error" && out.errors.push(`${w} console: ${m.text().slice(0,90)}`));
  for (const path of PATHS) {
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);
    const bad = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth > window.innerWidth + 1;
      // Which element, if any, is sticking out?
      let culprit = null;
      if (over) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 2 && r.width > 12) {
            culprit = el.tagName.toLowerCase() + "." + String(el.className).slice(0, 50);
            break;
          }
        }
      }
      return over ? culprit ?? "unknown" : null;
    });
    if (bad) out.overflow.push(`${w} ${path} :: ${bad}`);
  }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
