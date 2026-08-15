/**
 * The hero reel: the service names, the mechanism, and the restraint.
 *
 * The geometry assertions are the interesting ones. A reel that looks right in
 * a screenshot can still be a flat cross-fade with a perspective property
 * nothing uses, so these read the actual matrices: the drum has to sit a radius
 * back, the front face has to land exactly on the frame, and the face behind it
 * has to be foreshortened rather than merely hidden.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3220";

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

/** The drum, its faces, and where they actually are. */
const geometry = (page) =>
  page.evaluate(() => {
    const stage = document.getElementById("hero-visual");
    if (!stage) return null;
    const drum = stage.firstElementChild.firstElementChild;
    const rect = stage.getBoundingClientRect();
    const read = (element) => {
      const m = new DOMMatrix(getComputedStyle(element).transform);
      return { z: Math.round(m.m43), rotX: Math.round(Math.atan2(m.m23, m.m22) * (180 / Math.PI)) };
    };
    return {
      perspective: getComputedStyle(stage).perspective,
      overflow: getComputedStyle(stage).overflow,
      stage: { w: Math.round(rect.width), h: Math.round(rect.height) },
      drum: read(drum),
      faces: [...drum.children].map((face) => {
        const fr = face.getBoundingClientRect();
        return { ...read(face), w: Math.round(fr.width), h: Math.round(fr.height) };
      }),
    };
  });

try {
  /* ── 1. The services are the new ones ─────────────────────────────────── */
  console.log("\n1. The service names");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    const labels = (await tabs.allTextContents()).map((t) => t.replace(/^\d+/, "").trim());

    const expected = ["Logo Design", "Brand Identity", "Marketing Design", "Website Design"];
    check("the index lists exactly the four services", labels.length === 4, labels.join(" | "));
    for (const [i, name] of expected.entries()) {
      check(`  ${String(i + 1).padStart(2, "0")} is ${name}`, labels[i] === name, labels[i]);
    }

    const body = await page.locator("body").innerText();
    for (const old of ["Web identity", "Websites"]) {
      check(`the homepage no longer says "${old}"`, !body.includes(old), old);
    }

    /* ── 2. It is really three-dimensional ──────────────────────────────── */
    console.log("\n2. The mechanism");
    const g = await geometry(page);
    check("the stage has a perspective", g && /^\d+px$/.test(g.perspective), g?.perspective);

    const px = parseInt(g.perspective, 10);
    check("within the 1600–2200px band", px >= 1600 && px <= 2200, String(px));
    check("and it clips, so nothing spills past the frame", g.overflow === "hidden", g.overflow);

    const radius = Math.round(g.stage.h / 2);
    check(
      "the drum sits one radius back",
      Math.abs(g.drum.z + radius) <= 2,
      `drum z ${g.drum.z}, radius ${radius}`
    );
    check(
      "so the front face lands exactly on the frame",
      g.faces[0].w === g.stage.w && g.faces[0].h === g.stage.h,
      `${g.faces[0].w}x${g.faces[0].h} vs ${g.stage.w}x${g.stage.h}`
    );
    check(
      "the next face is turned a quarter of the way round",
      Math.abs(Math.abs(g.faces[1].rotX) - 90) <= 1,
      String(g.faces[1].rotX)
    );
    check(
      "and reads as a foreshortened edge rather than a hidden layer",
      g.faces[1].h > 0 && g.faces[1].h < g.stage.h * 0.25,
      `${g.faces[1].h}px tall`
    );

    /* ── 3. The index turns it ──────────────────────────────────────────── */
    console.log("\n3. The index controls the reel");
    await tabs.nth(2).hover();
    await page.waitForTimeout(900);

    const turned = await geometry(page);
    check(
      "hovering the third service turns the drum",
      turned.drum.rotX !== g.drum.rotX,
      `${g.drum.rotX} -> ${turned.drum.rotX}`
    );
    check(
      "and the caption follows",
      (await page.locator("figcaption").innerText()).toUpperCase().includes("MARKETING"),
      await page.locator("figcaption").innerText()
    );
    check(
      "the third tab is the selected one",
      (await tabs.nth(2).getAttribute("aria-selected")) === "true"
    );

    /* ── 4. Keyboard ────────────────────────────────────────────────────── */
    console.log("\n4. Keyboard");
    await tabs.nth(0).focus();
    check("focusing a tab selects it", (await tabs.nth(0).getAttribute("aria-selected")) === "true");
    check(
      "the index is one tab stop",
      (await tabs.nth(1).getAttribute("tabindex")) === "-1",
      await tabs.nth(1).getAttribute("tabindex")
    );

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    check(
      "ArrowRight moves to the next service",
      (await tabs.nth(1).getAttribute("aria-selected")) === "true"
    );

    await page.keyboard.press("End");
    await page.waitForTimeout(700);
    check(
      "End jumps to the last",
      (await tabs.nth(3).getAttribute("aria-selected")) === "true"
    );

    // From the last, forward should wrap to the first by the short way round.
    const atEnd = await geometry(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(900);
    const wrapped = await geometry(page);
    check(
      "wrapping past the last turns one quarter, not three",
      Math.abs(Math.abs(wrapped.drum.rotX - atEnd.drum.rotX) - 90) <= 2 ||
        Math.abs(Math.abs(wrapped.drum.rotX - atEnd.drum.rotX) - 270) > 2,
      `${atEnd.drum.rotX} -> ${wrapped.drum.rotX}`
    );

    check(
      "the reel is the tab's panel",
      (await page.locator("#hero-visual").getAttribute("role")) === "tabpanel"
    );

    await context.close();
  }

  /* ── 5. It advances on its own, then stops ────────────────────────────── */
  console.log("\n5. Idle advance, and giving it up");
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    const first = await geometry(page);

    // The interval is 5.5s; wait past one.
    await page.waitForTimeout(6500);
    const advanced = await geometry(page);
    check(
      "it advances by itself before anybody touches it",
      advanced.drum.rotX !== first.drum.rotX,
      `${first.drum.rotX} -> ${advanced.drum.rotX}`
    );

    // Interact, then confirm it has stopped for good.
    await tabs.nth(0).hover();
    await page.waitForTimeout(1200);
    const engaged = await geometry(page);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(8000);
    const later = await geometry(page);
    check(
      "and stops permanently once the visitor takes over",
      later.drum.rotX === engaged.drum.rotX,
      `${engaged.drum.rotX} -> ${later.drum.rotX} after 8s`
    );

    await context.close();
  }

  /* ── 6. Reduced motion ────────────────────────────────────────────────── */
  console.log("\n6. Reduced motion");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 950 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const flat = await page.evaluate(() => {
      const stage = document.getElementById("hero-visual");
      const drum = stage.firstElementChild.firstElementChild;
      const faces = [...drum.children];
      return {
        perspective: getComputedStyle(stage).perspective,
        faceTransforms: faces.map((f) => getComputedStyle(f).transform),
        visible: faces.map((f) => getComputedStyle(f).opacity),
      };
    });

    check("no perspective is applied", flat.perspective === "none", flat.perspective);
    check(
      "no face is rotated",
      flat.faceTransforms.every((t) => t === "none"),
      flat.faceTransforms.join(" | ")
    );
    check(
      "exactly one face is shown",
      flat.visible.filter((o) => Number(o) > 0).length === 1,
      flat.visible.join(",")
    );

    const tabs = page.locator('[role="tablist"][aria-label="Services overview"] [role="tab"]');
    await tabs.nth(2).click();
    await page.waitForTimeout(900);

    const after = await page.evaluate(() => {
      const drum = document.getElementById("hero-visual").firstElementChild.firstElementChild;
      return [...drum.children].map((f) => getComputedStyle(f).opacity);
    });
    check(
      "and the index still changes which one",
      Number(after[2]) > 0 && Number(after[0]) === 0,
      after.join(",")
    );

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
