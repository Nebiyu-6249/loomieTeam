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

const shown = () => page.evaluate(() => {
  const panel = document.querySelector("#hero-visual");
  const plates = [...panel.querySelectorAll(":scope > div")];
  const visible = plates.filter(p => Number(getComputedStyle(p).opacity) > 0.5);
  return {
    src: visible[0]?.querySelector("img")?.getAttribute("src") ?? "",
    count: visible.length,
    label: document.querySelector("figcaption")?.innerText ?? "",
  };
});

const first = await shown();
check("one plate visible at rest", first.count === 1, String(first.count));
check("defaults to the mark sheet", /sheet-mark/.test(first.src), first.src.slice(0, 70));
check("label reads Identity", /IDENTITY/i.test(first.label), first.label);
await page.screenshot({ path: `${OUT}/h-identity.png` });

const hero = page.getByRole("tablist", { name: "Services overview" });
const tabs = hero.getByRole("tab");
check("four tabs", await tabs.count() === 4, String(await tabs.count()));

const expect = [
  ["Web identity", /sheet-tone/, /WEB IDENTITY/i],
  ["Marketing design", /sheet-campaign/, /MARKETING/i],
  ["Websites", /sheet-interface/, /WEBSITES/i],
];
for (const [name, srcRe, labelRe] of expect) {
  await hero.getByRole("tab", { name: new RegExp(name, "i") }).hover();
  await page.waitForTimeout(900);
  const s = await shown();
  check(`hover "${name}" swaps the visual`, srcRe.test(s.src), s.src.slice(0, 70));
  check(`  and updates the header`, labelRe.test(s.label), s.label);
  check(`  only one plate visible`, s.count === 1, String(s.count));
  await page.screenshot({ path: `${OUT}/h-${name.split(" ")[0].toLowerCase()}.png` });
}

// aria wiring
const aria = await page.evaluate(() => {
  // Scoped: the services section further down has a tablist of its own now.
  const list = document.querySelector('[aria-label="Services overview"]');
  const selected = list.querySelector('[role="tab"][aria-selected="true"]');
  const panel = document.querySelector('#hero-visual');
  return {
    selectedId: selected?.id ?? "",
    panelRole: panel?.getAttribute("role"),
    labelledby: panel?.getAttribute("aria-labelledby"),
    roving: [...list.querySelectorAll('[role="tab"]')].map(t => t.getAttribute("tabindex")).join(","),
  };
});
check("panel is labelled by the selected tab", aria.labelledby === aria.selectedId, JSON.stringify(aria));
check("panel has tabpanel role", aria.panelRole === "tabpanel", String(aria.panelRole));
check("roving tabindex leaves one stop", aria.roving.split(",").filter(v => v === "0").length === 1, aria.roving);

// Keyboard: arrows move the selection.
await page.evaluate(() => window.scrollTo(0, 0));
await hero.getByRole("tab", { selected: true }).focus();
// The hover loop left the selection on the last tab, where ArrowRight wraps.
// Start from a known position instead.
await page.keyboard.press("Home");
await page.waitForTimeout(700);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(800);
const afterArrow = await shown();
check("ArrowRight advances to the second service", /sheet-tone/.test(afterArrow.src), afterArrow.src.slice(0, 70));
await page.keyboard.press("Home");
await page.waitForTimeout(800);
check("Home returns to the first", /sheet-mark/.test((await shown()).src));

check("no page errors", errors.length === 0, errors.join(" ; "));
await ctx.close();

// Mobile: tap must work, and no hover dependency.
const m = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
const mp = await m.newPage();
await mp.goto("http://localhost:3210/", { waitUntil: "networkidle" });
await mp.waitForTimeout(3000);
await mp.getByRole("tablist", { name: "Services overview" }).getByRole("tab", { name: /marketing/i }).tap();
await mp.waitForTimeout(900);
const mobile = await mp.evaluate(() => {
  const plates = [...document.querySelectorAll("#hero-visual > div")];
  const v = plates.filter(p => Number(getComputedStyle(p).opacity) > 0.5);
  return v[0]?.querySelector("img")?.getAttribute("src") ?? "";
});
check("tap swaps the visual on mobile", /sheet-campaign/.test(mobile), mobile.slice(0, 70));
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow at 375", overflow <= 1, String(overflow));
await mp.screenshot({ path: `${OUT}/h-mobile.png`, fullPage: false });
await m.close();

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed===0?0:1);
