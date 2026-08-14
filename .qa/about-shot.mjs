import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3312/about", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
const team = page.locator("#team");
await team.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await team.screenshot({ path: "/tmp/team.png" });
await page.goto("http://localhost:3312/clients", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/clients.png", fullPage: false });
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/clients2.png" });
await browser.close();
