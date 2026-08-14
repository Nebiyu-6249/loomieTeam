import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/claude-0/-home-user-loomieTeam/0169c3b4-4b49-5b66-8a0d-26e7ffebf624/scratchpad/shots";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
for (const route of ["/", "/contact"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3210" + route);
  await page.waitForTimeout(900);
  const name = `loader${route.replace(/\W/g, "_") || "_home"}`;
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const visible = await page.evaluate(() => {
    const el = document.querySelector("[data-loading-screen], [data-loader]") ||
      Array.from(document.querySelectorAll("div")).find(d => /^\d{2}$/.test(d.textContent?.trim() ?? ""));
    return Boolean(el);
  });
  console.log(`${route.padEnd(10)} loader present: ${visible}`);
  await ctx.close();
}
await browser.close();
