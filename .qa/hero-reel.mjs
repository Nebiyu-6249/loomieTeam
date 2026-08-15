/**
 * The hero's spatial stack.
 *
 * The assertion that matters is the first one, and it is the reason this suite
 * was rewritten. The previous reel was a closed prism, and it passed a suite
 * that checked the front face filled the frame and the others were hidden —
 * which is exactly the bug: at rest it was one flat rectangle, and the depth
 * only existed during the turn. A still screenshot of the hero could not be
 * told apart from the image card it replaced.
 *
 * So block 1 is the acceptance test written down: without touching anything,
 * more than one plane has to be visible, at different depths, at different
 * sizes. Everything after that is the behaviour around it.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3231";

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

/** Every plane's depth, size, opacity and rotation, straight off the DOM. */
const readPlanes = (page) =>
  page.evaluate(() => {
    return [...document.querySelectorAll("[data-hero-plane]")].map((el) => {
      const style = getComputedStyle(el);
      const matrix = new DOMMatrix(style.transform);
      const box = el.getBoundingClientRect();
      // rotateY, recovered from the matrix.
      const rotateY = Math.round((Math.asin(Math.max(-1, Math.min(1, -matrix.m31))) * 180) / Math.PI);
      return {
        index: Number(el.getAttribute("data-hero-plane")),
        active: el.getAttribute("data-hero-active") === "true",
        z: Math.round(matrix.m43),
        rotateY,
        opacity: Number(style.opacity),
        width: Math.round(box.width),
        height: Math.round(box.height),
        left: Math.round(box.left),
        right: Math.round(box.right),
      };
    });
  });

const activeLabel = (page) =>
  page.locator('#hero-visual').getAttribute("aria-labelledby");

try {
  /* ── 1. Depth is visible without touching anything ────────────────────── */
  console.log("\n1. Spatial at rest");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const planes = await readPlanes(page);
    check("there is a plane per service", planes.length === 4, String(planes.length));

    const visible = planes.filter((p) => p.opacity > 0.05);
    check("more than one is visible at rest", visible.length >= 3, `${visible.length} visible`);

    const depths = new Set(planes.map((p) => p.z));
    check("they sit at different depths", depths.size === 4, [...depths].join(", "));

    const widths = new Set(planes.map((p) => p.width));
    check("and are drawn at different sizes", widths.size >= 3, [...widths].join(", "));

    const opacities = new Set(planes.map((p) => p.opacity.toFixed(2)));
    check("and at different strengths", opacities.size >= 3, [...opacities].join(", "));

    const active = planes.find((p) => p.active);
    check("exactly one is active", planes.filter((p) => p.active).length === 1);
    check("the active one is fully opaque", active.opacity === 1, String(active.opacity));
    check("and is the largest", active.width === Math.max(...planes.map((p) => p.width)),
      `${active.width} vs ${Math.max(...planes.map((p) => p.width))}`);
    check("and is nearest the viewer", active.z === Math.max(...planes.map((p) => p.z)),
      `${active.z} vs ${Math.max(...planes.map((p) => p.z))}`);

    // The failure mode being guarded against: one plane covering everything.
    const others = planes.filter((p) => !p.active && p.opacity > 0.05);
    const peeking = others.filter(
      (p) => p.left < active.left - 8 || p.right > active.right + 8
    );
    check("neighbours are not hidden behind the active plane",
      peeking.length >= 2, `${peeking.length} peek out`);

    check("the object does not fill its column edge to edge",
      active.width < 520, `active is ${active.width}px wide`);

    await context.close();
  }

  /* ── 2. Choosing a service reorganises the stack ──────────────────────── */
  console.log("\n2. The stack reorganises");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const before = await readPlanes(page);
    const wasActive = before.find((p) => p.active).index;

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    check("the index has four controls", (await tabs.count()) === 4);

    await tabs.nth(2).hover();
    await page.waitForTimeout(900);

    const after = await readPlanes(page);
    const nowActive = after.find((p) => p.active).index;

    check("hovering a service selects it", nowActive === 2, String(nowActive));
    check("the plane that was active has receded",
      after[wasActive].z < before[wasActive].z && after[wasActive].opacity < 1,
      `z ${before[wasActive].z} -> ${after[wasActive].z}, opacity ${after[wasActive].opacity}`);
    check("the chosen plane has come forward",
      after[2].z > before[2].z && after[2].opacity === 1,
      `z ${before[2].z} -> ${after[2].z}`);

    const moved = after.filter((p, i) => p.z !== before[i].z).length;
    check("every plane moved, not just two", moved === 4, `${moved} moved`);

    check("the caption follows the selection",
      (await activeLabel(page)) === "hero-service-2", await activeLabel(page));

    await context.close();
  }

  /* ── 3. The turn is in the band asked for ─────────────────────────────── */
  console.log("\n3. Timing");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    await tabs.nth(1).hover();

    // Sample until the nearest plane's depth stops changing.
    const started = Date.now();
    let settled = started;
    let last = null;
    for (let i = 0; i < 60; i += 1) {
      const planes = await readPlanes(page);
      const signature = planes.map((p) => p.z).join(",");
      if (signature !== last) {
        settled = Date.now();
        last = signature;
      }
      if (Date.now() - settled > 220) break;
      await page.waitForTimeout(35);
    }

    const duration = settled - started;
    check("the move takes roughly half a second", duration >= 380 && duration <= 1100,
      `${duration}ms measured (sampling adds overhead)`);

    await context.close();
  }

  /* ── 4. Keyboard ──────────────────────────────────────────────────────── */
  console.log("\n4. Keyboard");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    await tabs.first().focus();
    check("the index is focusable", await tabs.first().evaluate((el) => el === document.activeElement));

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    check("ArrowRight advances", (await readPlanes(page)).find((p) => p.active).index === 1);

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(800);
    check("ArrowLeft goes back", (await readPlanes(page)).find((p) => p.active).index === 0);

    await page.keyboard.press("End");
    await page.waitForTimeout(800);
    check("End reaches the last", (await readPlanes(page)).find((p) => p.active).index === 3);

    await page.keyboard.press("Home");
    await page.waitForTimeout(800);
    check("Home returns to the first", (await readPlanes(page)).find((p) => p.active).index === 0);

    const stops = await tabs.evaluateAll((els) =>
      els.map((el) => el.getAttribute("tabindex")).filter((v) => v === "0").length
    );
    check("the whole index is one tab stop", stops === 1, String(stops));

    await context.close();
  }

  /* ── 5. It stops advancing once taken hold of ─────────────────────────── */
  console.log("\n5. Idle advance, and its end");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const first = (await readPlanes(page)).find((p) => p.active).index;
    await page.waitForTimeout(7000);
    const drifted = (await readPlanes(page)).find((p) => p.active).index;
    check("it advances on its own before anybody interacts", drifted !== first,
      `${first} -> ${drifted}`);

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    await tabs.nth(0).click();
    await page.waitForTimeout(1000);
    const held = (await readPlanes(page)).find((p) => p.active).index;

    await page.waitForTimeout(8000);
    check("and stops for good once it has been used",
      (await readPlanes(page)).find((p) => p.active).index === held,
      `${held} -> ${(await readPlanes(page)).find((p) => p.active).index}`);

    await context.close();
  }

  /* ── 6. It does not eat the page's scroll ─────────────────────────────── */
  console.log("\n6. Scrolling past it");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const box = await page.locator("#hero-visual").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => window.scrollY);

    check("a wheel over the object still scrolls the page", after > before + 100,
      `${before} -> ${after}`);

    await context.close();
  }

  /* ── 7. Reduced motion keeps the composition ──────────────────────────── */
  console.log("\n7. Reduced motion");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 950 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const planes = await readPlanes(page);
    check("all four planes are still there", planes.length === 4);
    check("the layering is preserved",
      new Set(planes.map((p) => p.width)).size >= 3,
      planes.map((p) => p.width).join(", "));
    check("more than one is visible", planes.filter((p) => p.opacity > 0.05).length >= 3);
    check("nothing is rotated", planes.every((p) => Math.abs(p.rotateY) <= 1),
      planes.map((p) => p.rotateY).join(", "));

    const active = planes.find((p) => p.active);
    check("the active plane is still dominant",
      active.opacity === 1 && active.width === Math.max(...planes.map((p) => p.width)));

    // Selecting still works, it just does not turn.
    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    await tabs.nth(3).click();
    await page.waitForTimeout(700);
    check("and the index still changes it",
      (await readPlanes(page)).find((p) => p.active).index === 3);

    await context.close();
  }

  /* ── 8. Phone ─────────────────────────────────────────────────────────── */
  console.log("\n8. On a phone");
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);

    const planes = await readPlanes(page);
    check("the stack is there too", planes.filter((p) => p.opacity > 0.05).length >= 3);
    check("and stays on screen",
      planes.every((p) => p.left > -4 && p.right < 394),
      planes.map((p) => `${p.left}..${p.right}`).join(" "));

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    check("nothing overflows sideways", !overflow);

    // A swipe across the object moves it; a swipe down does not trap the page.
    const box = await page.locator("#hero-visual").boundingBox();
    const cy = box.y + box.height / 2;
    const before = (await readPlanes(page)).find((p) => p.active).index;

    await page.touchscreen.tap(box.x + box.width / 2, cy);
    await page.waitForTimeout(300);

    // Real touch pointers: page.mouse reports pointerType "mouse", which the
    // handler ignores on purpose so a desktop drag cannot select a service by
    // accident.
    await page.evaluate(
      ({ x1, x2, y }) => {
        const stage = document.getElementById("hero-visual");
        const at = (x) => ({
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
        });
        stage.dispatchEvent(new PointerEvent("pointerdown", at(x1)));
        stage.dispatchEvent(new PointerEvent("pointermove", at((x1 + x2) / 2)));
        stage.dispatchEvent(new PointerEvent("pointermove", at(x2)));
        stage.dispatchEvent(new PointerEvent("pointerup", at(x2)));
      },
      { x1: box.x + box.width * 0.8, x2: box.x + box.width * 0.2, y: cy }
    );
    await page.waitForTimeout(900);

    const swiped = (await readPlanes(page)).find((p) => p.active).index;
    check("a sideways drag moves the stack", swiped !== before, `${before} -> ${swiped}`);

    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(900);
    check("and a vertical scroll still works",
      (await page.evaluate(() => window.scrollY)) > scrollBefore + 100);

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
