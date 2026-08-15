import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0,160)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0,200)));
await page.goto("http://localhost:3231/about", { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
console.log(JSON.stringify(await page.evaluate(() => {
  const group = document.querySelector('[role="group"][aria-label="Team portraits"]');
  return {
    hasGroup: Boolean(group),
    canvases: document.querySelectorAll("canvas").length,
    rosterItems: document.querySelectorAll("#team ul li").length,
    matchesWide: window.matchMedia("(min-width: 1024px)").matches,
    webgl: (() => { try { return Boolean(document.createElement("canvas").getContext("webgl")); } catch { return false; } })(),
  };
}), null, 1));
await browser.close();
