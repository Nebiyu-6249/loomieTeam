import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await page.waitForTimeout(3200);
await page.screenshot({ path: "/tmp/reel-01.png" });

// Point at the third service and catch it mid-turn.
const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
console.log("services in the index:", await tabs.allTextContents());
await tabs.nth(2).hover();
await page.waitForTimeout(260);
await page.screenshot({ path: "/tmp/reel-mid.png" });
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/reel-03.png" });
await browser.close();
