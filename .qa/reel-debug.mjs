import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto("http://localhost:3220/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate(() => {
  const stage = document.getElementById("hero-visual");
  const cs = getComputedStyle(stage);
  const r = stage.getBoundingClientRect();
  const tilt = stage.firstElementChild;
  const drum = tilt.firstElementChild;
  const faces = [...drum.children];
  return {
    stage: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left),
             perspective: cs.perspective, overflow: cs.overflow },
    tilt: { transformStyle: getComputedStyle(tilt).transformStyle },
    drum: { transformStyle: getComputedStyle(drum).transformStyle,
            transform: getComputedStyle(drum).transform.slice(0, 60) },
    faces: faces.map((f) => {
      const fr = f.getBoundingClientRect();
      return { transform: getComputedStyle(f).transform.slice(0, 70),
               left: Math.round(fr.left), top: Math.round(fr.top),
               w: Math.round(fr.width), h: Math.round(fr.height) };
    }),
  };
}, null), null, 1));
await browser.close();
