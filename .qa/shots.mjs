import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3210";
const OUT = "/tmp/claude-0/-home-user-loomieTeam/0169c3b4-4b49-5b66-8a0d-26e7ffebf624/scratchpad/shots";

const VIEWPORTS = {
  "375": { width: 375, height: 812 },
  "768": { width: 768, height: 1024 },
  "1440": { width: 1440, height: 900 },
  "1920": { width: 1920, height: 1080 },
  "390": { width: 390, height: 844 },
};

const targets = JSON.parse(process.argv[2]);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: [
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});

for (const target of targets) {
  const { path: route, vp, name, full = false, scroll = 0, wait = 2600 } = target;
  const context = await browser.newContext({
    viewport: VIEWPORTS[vp],
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);

  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await page.waitForTimeout(1400);
  }

  // Horizontal overflow is the one thing a screenshot hides.
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      offenders: Array.from(document.querySelectorAll("body *"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1);
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
    };
  });

  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });

  const bad = overflow.scrollW > overflow.clientW + 1;
  console.log(
    `${name.padEnd(28)} ${bad ? `OVERFLOW ${overflow.scrollW}>${overflow.clientW} ${overflow.offenders.join(" | ")}` : "ok"}` +
      (problems.length ? `  ${problems.join(" ; ")}` : "")
  );

  await context.close();
}

await browser.close();
