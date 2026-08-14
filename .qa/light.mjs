import { chromium } from "playwright";
const OUT = "/tmp/claude-0/-home-user-loomieTeam/0169c3b4-4b49-5b66-8a0d-26e7ffebf624/scratchpad/shots";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
for (const [route, scroll, name] of [["/",0,"light-home"],["/",1000,"light-work-sel"],["/",2500,"light-services"],["/work",0,"light-work"],["/contact",0,"light-contact"]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("loomie-theme", "light"); } catch {} });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3210" + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  if (scroll) { await page.evaluate(y => window.scrollTo(0, y), scroll); await page.waitForTimeout(1400); }
  const theme = await page.evaluate(() => document.documentElement.className);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name.padEnd(18)} html.class="${theme}"`);
  await ctx.close();
}
await browser.close();
