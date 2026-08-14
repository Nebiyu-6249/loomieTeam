import { chromium } from "playwright";
const OUT = "/tmp/claude-0/-home-user-loomieTeam/0169c3b4-4b49-5b66-8a0d-26e7ffebf624/scratchpad/shots";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3200);

const marks = await page.evaluate(() => {
  const work = document.querySelector("#work");
  const svc = document.querySelector("#services");
  const st = document.querySelector("[data-state-section]");
  const y = el => Math.round(el.getBoundingClientRect().top + window.scrollY);
  return { workEnd: y(work) + Math.round(work.getBoundingClientRect().height),
           svc: y(svc), svcH: Math.round(svc.getBoundingClientRect().height), state: y(st) };
});
console.log(JSON.stringify(marks));

// From the tail of Selected Work through Services into Snow, at a normal pace.
const from = marks.workEnd - 700;
const to = marks.state + 500;
const steps = 10;
for (let i = 0; i <= steps; i++) {
  const y = Math.round(from + ((to - from) * i) / steps);
  await page.evaluate(v => window.scrollTo(0, v), y);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/flow-${String(i).padStart(2,"0")}.png` });
}
console.log(`captured ${steps + 1} frames from ${from} to ${to}`);
await browser.close();
