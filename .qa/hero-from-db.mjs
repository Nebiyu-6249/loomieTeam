/**
 * The hero's visuals come from the database, not from a constant.
 *
 * Changes a service's hero image in Postgres, revalidates, and checks the
 * homepage shows the new one. If the hero were still reading lib/services this
 * would pass locally and be a lie the first time somebody edited a service.
 */
import pg from "pg";

const base = "http://localhost:3210";
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) { passed += 1; console.log(`  PASS  ${label}`); }
  else { failed += 1; console.log(`  FAIL  ${label}  ${detail}`); }
};

const { rows: services } = await db.query(
  `select s.slug, s.title, s.hero_label, m.public_url as hero_url, v.public_url as visual_url
     from services s
     left join media m on m.id = s.hero_media_id
     left join media v on v.id = s.visual_media_id
    where s.published order by s.display_order`
);

const home = await (await fetch(base)).text();

check("every published service appears in the hero index",
  services.every((s) => home.includes(s.title)),
  services.map((s) => s.title).join(", "));

check("each service's hero image is on the page",
  services.every((s) => !s.hero_url || home.includes(s.hero_url.replace(/&/g, "&amp;"))
    || home.includes(encodeURIComponent(s.hero_url))),
  services.map((s) => s.hero_url).join(", "));

check("and its hero label",
  services.every((s) => !s.hero_label || home.includes(s.hero_label.replace(/&/g, "&amp;"))),
  services.map((s) => s.hero_label).join(" | "));

const servicesPage = await (await fetch(`${base}/services`)).text();
check("the services chapter uses the section images",
  services.every((s) => !s.visual_url || servicesPage.includes(encodeURIComponent(s.visual_url))
    || servicesPage.includes(s.visual_url)),
  services.map((s) => s.visual_url).join(", "));

/* ── The real test: change one and see the page change ─────────────────── */

const target = services[0];
const { rows: other } = await db.query(
  `select id, public_url from media where public_url is not null
     and public_url <> $1 limit 1`, [target.hero_url]
);

await db.query("update services set hero_media_id = $1 where slug = $2", [other[0].id, target.slug]);

// The admin revalidates on save; here the change is made behind the
// application's back, so the cache is cleared the same way a deploy would.
await fetch(`${base}/api/availability`);
const fresh = await (await fetch(`${base}/`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })).text();

check("changing a hero image in the database changes the homepage",
  fresh.includes(encodeURIComponent(other[0].public_url)) || fresh.includes(other[0].public_url),
  `expected ${other[0].public_url}`);

await db.query("update services set hero_media_id = (select id from media where public_url = $1) where slug = $2",
  [target.hero_url, target.slug]);

await db.end();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
