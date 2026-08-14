import { chromium } from "playwright";
const OUT = "/tmp/claude-0/-home-user-loomieTeam/0169c3b4-4b49-5b66-8a0d-26e7ffebf624/scratchpad/shots";
let passed=0, failed=0;
const check=(l,ok,d="")=>{ if(ok){passed++;console.log(`  PASS  ${l}`);} else {failed++;console.log(`  FAIL  ${l}  ${d}`);} };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox","--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e).slice(0,160)));
await page.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await page.waitForTimeout(3200);

const geo = () => page.evaluate(() => {
  const s = document.querySelector("#services");
  const st = document.querySelector("[data-state-section]");
  const r = s.getBoundingClientRect();
  return {
    top: Math.round(r.top + window.scrollY),
    height: Math.round(r.height),
    stateTop: Math.round(st.getBoundingClientRect().top + window.scrollY),
    vh: window.innerHeight,
  };
});
const g = await geo();
g.travel = g.height - g.vh;
console.log(`  services: top ${g.top}px, height ${g.height}px (${(g.height/g.vh).toFixed(2)} viewports), progression over ${g.travel}px (${(g.travel/g.vh).toFixed(2)} viewports)`);
check("all four states inside about one viewport of scroll", g.travel / g.vh <= 1.15, `${(g.travel/g.vh).toFixed(2)}`);
check("section is two viewports, not three", g.height / g.vh <= 2.05 && g.height / g.vh >= 1.9, `${(g.height/g.vh).toFixed(2)}`);

const state = () => page.evaluate(() => {
  const sel = document.querySelector('#services [role="tab"][aria-selected="true"]');
  const panel = document.querySelector("#service-stage");
  const shown = [...panel.querySelectorAll(":scope > div")]
    .filter(p => Number(getComputedStyle(p).opacity) > 0.5);
  const stage = document.querySelector("#services > div");
  return {
    title: sel?.querySelector("h3")?.textContent ?? "",
    src: shown[0]?.querySelector("img")?.getAttribute("src") ?? "",
    visible: shown.length,
    stageOpacity: Number(getComputedStyle(stage).opacity),
    sticky: getComputedStyle(stage).position,
  };
});

// Walk through the section at a normal reading pace.
const expect = [
  [0.06, /Identity/, /sheet-type/],
  [0.32, /Web identity/, /sheet-tone/],
  [0.57, /Marketing/, /sheet-campaign/],
  [0.82, /Websites/, /sheet-interface/],
];
for (const [frac, title, src] of expect) {
  await page.evaluate(([t, v, f]) => window.scrollTo(0, t + v * f), [g.top, g.travel, frac]);
  await page.waitForTimeout(1100);
  const s = await state();
  check(`at ${Math.round(frac*100)}% -> ${title.source}`, title.test(s.title), `"${s.title}"`);
  check(`  visual is ${src.source}`, src.test(s.src), s.src.slice(0, 70));
  check(`  exactly one visual shown`, s.visible === 1, String(s.visible));
  await page.screenshot({ path: `${OUT}/sv-${Math.round(frac*100)}.png` });
}

check("the composition is sticky, not pinned", (await state()).sticky === "sticky", (await state()).sticky);

// The handoff.
await page.evaluate(([t,v]) => window.scrollTo(0, t + v * 0.80), [g.top, g.travel]);
await page.waitForTimeout(900);
const mid = await state();
await page.evaluate(([t,v]) => window.scrollTo(0, t + v * 0.99), [g.top, g.travel]);
await page.waitForTimeout(1100);
const end = await state();
check("the stage cools on the way out", end.stageOpacity < mid.stageOpacity && end.stageOpacity < 0.3,
  `${mid.stageOpacity.toFixed(2)} -> ${end.stageOpacity.toFixed(2)}`);
await page.screenshot({ path: `${OUT}/sv-handoff.png` });

// No rule between services and snow.
const border = await page.evaluate(() =>
  getComputedStyle(document.querySelector("[data-state-section]")).borderTopWidth);
check("no rule between Services and Snow", parseFloat(border) === 0, border);

// Keyboard.
await page.evaluate(([t,v]) => window.scrollTo(0, t + v * 0.05), [g.top, g.travel]);
await page.waitForTimeout(800);
await page.locator('#services [role="tab"][aria-selected="true"]').focus();
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(800);
check("ArrowDown moves to the next service", /Web identity/.test((await state()).title), (await state()).title);
const roving = await page.evaluate(() =>
  [...document.querySelectorAll('#services [role="tab"]')].map(t => t.getAttribute("tabindex")).join(","));
check("one tab stop for the list", roving.split(",").filter(v => v === "0").length === 1, roving);

// Every sentence is in the DOM regardless of scroll.
const copy = await page.evaluate(() =>
  [...document.querySelectorAll('#services [role="tab"] p')].map(p => p.textContent.trim()));
check("all four sentences are in the DOM", copy.length === 4 && copy.every(c => c.length > 10), JSON.stringify(copy).slice(0,120));

check("no page errors", errors.length === 0, errors.join(" ; "));
await ctx.close();

// ── Reduced motion: stacked, everything visible, no scroll choreography ────
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await p2.waitForTimeout(2600);
const rmState = await p2.evaluate(() => {
  const s = document.querySelector("#services");
  return {
    tabs: s.querySelectorAll('[role="tab"]').length,
    imgs: s.querySelectorAll("img").length,
    headings: [...s.querySelectorAll("h3")].map(h => h.textContent.trim()),
    height: Math.round(s.getBoundingClientRect().height),
  };
});
check("reduced motion: no scroll stage", rmState.tabs === 0, String(rmState.tabs));
check("reduced motion: all four visuals present", rmState.imgs === 4, String(rmState.imgs));
check("reduced motion: all four named", rmState.headings.length === 4, rmState.headings.join(","));
await p2.screenshot({ path: `${OUT}/sv-reduced.png` });
await rm.close();

// ── Mobile: stacked flow, no hover dependency ──────────────────────────────
const m = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
const p3 = await m.newPage();
await p3.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await p3.waitForTimeout(2600);
const mob = await p3.evaluate(() => {
  const s = document.querySelector("#services");
  return { tabs: s.querySelectorAll('[role="tab"]').length, imgs: s.querySelectorAll("img").length,
           overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
check("mobile: stacked, no tablist", mob.tabs === 0, String(mob.tabs));
check("mobile: four visuals", mob.imgs === 4, String(mob.imgs));
check("mobile: no horizontal overflow", mob.overflow <= 1, String(mob.overflow));
await m.close();

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed===0?0:1);
