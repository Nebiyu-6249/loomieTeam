/**
 * Accessibility non-regression.
 *
 * Focus rings are measured by tabbing with the real keyboard and asking the
 * element whether it matches :focus-visible — calling focus() from script does
 * not satisfy that pseudo-class, and reading computed style mid-transition
 * reports the value the element is leaving rather than the one it is reaching.
 * Both of those produced false failures earlier in this build.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3210";
const PAGES = ["/", "/work", "/work/quarry", "/services", "/about", "/clients", "/contact"];

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});

for (const route of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const brokenImages = [];
  page.on("response", (response) => {
    const url = response.url();
    if (/\/_next\/image|\.(jpg|png|svg|webp|avif)(\?|$)/.test(url) && response.status() >= 400) {
      brokenImages.push(`${response.status()} ${url.slice(0, 80)}`);
    }
  });
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  // Everything, including what lazy-loading has been holding back.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);

  /* ── Headings ─────────────────────────────────────────────────────────── */
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent ?? "").trim().slice(0, 48),
    }))
  );
  const h1s = headings.filter((h) => h.level === 1);
  check(`${route}: exactly one h1`, h1s.length === 1, `${h1s.length}: ${h1s.map((h) => h.text).join(" | ")}`);

  let previous = 0;
  let skipped = null;
  for (const heading of headings) {
    if (previous && heading.level > previous + 1) skipped = `${previous} -> ${heading.level} at "${heading.text}"`;
    previous = heading.level;
  }
  check(`${route}: no skipped heading levels`, !skipped, skipped ?? "");

  /* ── Images ───────────────────────────────────────────────────────────── */
  const images = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.getAttribute("src")?.slice(0, 70) ?? "",
      alt: img.getAttribute("alt"),
      complete: img.complete && img.naturalWidth > 0,
    }))
  );
  check(
    `${route}: every image has alt text`,
    images.every((i) => typeof i.alt === "string"),
    images.filter((i) => typeof i.alt !== "string").map((i) => i.src).join(", ")
  );
  check(`${route}: no image request failed`, brokenImages.length === 0, brokenImages.join(", "));

  /* ── Focus, by keyboard ───────────────────────────────────────────────── */
  const stops = [];
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.keyboard.press("Tab");

  for (let i = 0; i < 26; i += 1) {
    // Past any transition on the focused element before measuring.
    await page.waitForTimeout(420);
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const width = parseFloat(style.outlineWidth) || 0;
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 36),
        focusVisible: el.matches(":focus-visible"),
        outlineWidth: width,
        outlineStyle: style.outlineStyle,
      };
    });
    if (!stop) break;
    stops.push(stop);
    await page.keyboard.press("Tab");
  }

  const ringless = stops.filter(
    (s) => s.focusVisible && (s.outlineWidth < 1 || s.outlineStyle === "none")
  );
  check(
    `${route}: every keyboard stop shows a ring (${stops.length} checked)`,
    ringless.length === 0,
    ringless.map((s) => `${s.tag}"${s.label}"`).join(", ")
  );
  check(`${route}: keyboard reaches something`, stops.length > 3, `${stops.length} stops`);

  const skip = stops[0];
  check(
    `${route}: skip link is the first stop`,
    skip?.label.toLowerCase().includes("skip"),
    skip?.label ?? "none"
  );

  /* ── Landmarks ────────────────────────────────────────────────────────── */
  const landmarks = await page.evaluate(() => ({
    main: document.querySelectorAll("main#main").length,
    nav: document.querySelectorAll("nav").length,
    footer: document.querySelectorAll("footer").length,
  }));
  check(`${route}: one main#main`, landmarks.main === 1, String(landmarks.main));
  check(`${route}: has a footer`, landmarks.footer >= 1, String(landmarks.footer));

  await context.close();
}

/* ── Reduced motion: the pinned section still says what it means ────────── */
const reduced = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await reduced.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });

await page.waitForTimeout(2000);

const states = await page.evaluate(() => {
  const text = document.body.innerText;
  return ["Snow", "River", "Light"].filter((word) => text.includes(word));
});
check("reduced motion: all three states are readable", states.length === 3, states.join(","));

const canvasRunning = await page.evaluate(() => document.querySelectorAll("canvas").length);
check("reduced motion: no canvas mounted", canvasRunning === 0, String(canvasRunning));

await reduced.close();
await browser.close();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
