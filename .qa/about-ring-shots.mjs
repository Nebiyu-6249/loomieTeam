import { chromium } from "playwright";
const base = "http://localhost:3231";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "/about", { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
const team = page.locator("#team");
await team.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await team.screenshot({ path: "/tmp/about-ring.png" });
// Move two along and catch it settled.
await page.locator('button:has-text("→"), [aria-label*="Next"]').first().click().catch(() => {});
await page.waitForTimeout(300);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(1500);
await team.screenshot({ path: "/tmp/about-ring-2.png" });
// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
await mp.goto(base + "/about", { waitUntil: "networkidle" });
await mp.waitForTimeout(3000);
await mp.locator("#team").scrollIntoViewIfNeeded();
await mp.waitForTimeout(1200);
await mp.locator("#team").screenshot({ path: "/tmp/about-mobile.png" });
await browser.close();
