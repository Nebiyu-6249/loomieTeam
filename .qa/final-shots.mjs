import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: "/tmp/final-home.png" });

await page.goto("http://localhost:3210/contact", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/final-contact.png" });

await browser.close();
