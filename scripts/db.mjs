import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

/**
 * Migrate, seed and test the database.
 *
 *   npm run db:migrate    apply supabase/migrations in order
 *   npm run db:seed       write the launch content, idempotently
 *   npm run db:test       run the row level security suite
 *
 * Talks Postgres directly rather than going through supabase-js, because
 * migrations and RLS tests are not things the REST API can do — and because
 * one code path means the suite that passes locally is the suite that runs
 * against the real project.
 *
 * Connection comes from SUPABASE_DB_URL, which Supabase gives you under
 * Project Settings → Database. It is a setup-time credential: nothing at
 * runtime uses it, and it does not belong in the deployed environment.
 *
 * ── Idempotence ──────────────────────────────────────────────────────────
 * Seeding twice is not an error and does not duplicate anything. Every insert
 * is keyed on something stable — a slug, a bucket and path, a platform, a
 * settings key — and conflicts update the row rather than adding another. What
 * it deliberately does not do is overwrite editorial work: if a project's
 * summary has been changed in the admin, re-seeding leaves it changed. Only
 * rows that do not exist yet are created.
 */

const MIGRATIONS = "supabase/migrations";
const LOCAL_SHIM = "supabase/local-shim.sql";
const TESTS = "supabase/tests/rls.sql";

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(
    "SUPABASE_DB_URL is not set.\n" +
      "Supabase: Project Settings → Database → Connection string (URI).\n" +
      "Locally:  postgres://postgres@localhost:5432/loomie"
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

/** Local Postgres has no `auth` schema; a real project must never be shimmed. */
async function needsShim() {
  const { rows } = await client.query(
    "select exists (select 1 from pg_namespace where nspname = 'auth') as present"
  );
  return !rows[0].present;
}

async function runFile(file) {
  const sql = await readFile(file, "utf8");
  await client.query(sql);
}

async function migrate() {
  if (await needsShim()) {
    console.log("no auth schema found — applying the local shim");
    await runFile(LOCAL_SHIM);
  }

  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    process.stdout.write(`  ${file} … `);
    await runFile(path.join(MIGRATIONS, file));
    console.log("ok");
  }
  console.log(`${files.length} migrations applied`);
}

/* ── Seed ────────────────────────────────────────────────────────────────
 *
 * The content module is TypeScript and is imported as-is: node strips the
 * types itself (22.18 and later, `process.features.typescript === "strip"`),
 * so seeding needs no build step and the script reads exactly the same file
 * the application does. One copy of the content, not two.
 */

async function loadSeedContent() {
  if (process.features.typescript !== "strip") {
    throw new Error(
      `node ${process.version} cannot read lib/seed-content.ts directly. ` +
        "Seeding needs node 22.18 or later."
    );
  }
  return import(path.resolve("lib/seed-content.ts"));
}

async function seed() {
  const content = await loadSeedContent();
  const counts = {};
  const bump = (key, n = 1) => (counts[key] = (counts[key] ?? 0) + n);

  await client.query("begin");

  // ── Media ───────────────────────────────────────────────────────────────
  const mediaId = new Map();
  for (const item of content.SEED_MEDIA) {
    const { rows } = await client.query(
      `insert into media (bucket, path, public_url, alt, mime_type, size_bytes)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (bucket, path) do update set public_url = excluded.public_url
       returning id, (xmax = 0) as inserted`,
      [item.bucket, item.path, item.publicUrl, item.alt, item.mimeType, item.sizeBytes]
    );
    mediaId.set(item.key, rows[0].id);
    if (rows[0].inserted) bump("media");
  }

  // ── Projects ────────────────────────────────────────────────────────────
  for (const [order, project] of content.SEED_PROJECTS.entries()) {
    const { rows } = await client.query(
      `insert into projects
         (slug, index, title, status, study_type, sector, year, summary,
          cover_image_id, hero_image_id, display_order, published)
       values ($1,$2,$3,'placeholder','concept',$4,$5,$6,$7,$8,$9,true)
       on conflict (slug) do nothing
       returning id`,
      [
        project.slug,
        project.index,
        project.title,
        project.sector,
        project.year,
        project.summary,
        mediaId.get(project.coverKey),
        mediaId.get(project.heroKey),
        order,
      ]
    );

    if (rows.length === 0) continue; // already present; editorial work is kept
    const id = rows[0].id;
    bump("projects");

    for (const [i, discipline] of project.disciplines.entries()) {
      await client.query(
        `insert into project_disciplines (project_id, discipline, display_order)
         values ($1,$2,$3) on conflict do nothing`,
        [id, discipline, i]
      );
    }

    for (const [i, section] of project.sections.entries()) {
      await client.query(
        `insert into project_sections (project_id, kind, body, display_order)
         values ($1,$2,$3,$4) on conflict (project_id, kind) do nothing`,
        [id, section.kind, section.body, i]
      );
    }

    for (const [i, shot] of project.gallery.entries()) {
      await client.query(
        `insert into project_media (project_id, media_id, role, alt, display_order)
         values ($1,$2,'gallery',$3,$4)`,
        [id, mediaId.get(shot.key), shot.alt, i]
      );
    }
  }

  // ── Services ────────────────────────────────────────────────────────────
  for (const [order, service] of content.SEED_SERVICES.entries()) {
    const { rowCount } = await client.query(
      `insert into services
         (slug, number, title, short_description, hero_label, hero_description,
          visual_media_id, hero_media_id, display_order, published)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       on conflict (slug) do nothing`,
      [
        service.slug,
        service.number,
        service.title,
        service.shortDescription,
        service.heroLabel,
        service.heroDescription,
        mediaId.get(service.visualKey),
        mediaId.get(service.heroKey),
        order,
      ]
    );
    if (rowCount) bump("services");
  }

  // ── Team ────────────────────────────────────────────────────────────────
  // Names and roles only. No bio text was supplied and inventing one would be
  // inventing a person's history, so the fields stay empty for the team to
  // fill in through the admin.
  for (const [order, person] of content.SEED_TEAM.entries()) {
    const { rowCount } = await client.query(
      `insert into team_members (slug, name, role, display_order, published)
       values ($1,$2,$3,$4,true)
       on conflict (slug) do nothing`,
      [person.slug, person.name, person.role, order]
    );
    if (rowCount) bump("team");
  }

  // ── Sectors and engagements ─────────────────────────────────────────────
  for (const [order, sector] of content.SEED_SECTORS.entries()) {
    const { rowCount } = await client.query(
      `insert into sectors
         (slug, number, name, summary, problem, visual_media_id, display_order, published)
       values ($1,$2,$3,$4,$5,$6,$7,true)
       on conflict (slug) do nothing`,
      [
        sector.slug,
        sector.number,
        sector.name,
        sector.summary,
        sector.problem,
        mediaId.get(sector.visualKey),
        order,
      ]
    );
    if (rowCount) bump("sectors");
  }

  for (const [order, engagement] of content.SEED_ENGAGEMENTS.entries()) {
    const { rows } = await client.query(
      `select 1 from engagements where number = $1`,
      [engagement.number]
    );
    if (rows.length) continue;
    await client.query(
      `insert into engagements (number, title, duration, description, display_order, published)
       values ($1,$2,$3,$4,$5,true)`,
      [engagement.number, engagement.title, engagement.duration, engagement.description, order]
    );
    bump("engagements");
  }

  // ── Partners ────────────────────────────────────────────────────────────
  // Flagged placeholder in the database, because that is what they are.
  for (const [order, partner] of content.SEED_PARTNERS.entries()) {
    const { rows } = await client.query(`select 1 from partners where name = $1`, [
      partner.name,
    ]);
    if (rows.length) continue;
    await client.query(
      `insert into partners (name, display_order, placeholder, published)
       values ($1,$2,true,true)`,
      [partner.name, order]
    );
    bump("partners");
  }

  // ── Social links ────────────────────────────────────────────────────────
  // No URL and disabled: no account addresses were supplied, and the table's
  // constraint means a link cannot be switched on until one is.
  for (const link of content.SEED_SOCIAL) {
    const { rowCount } = await client.query(
      `insert into social_links (platform, label, display_order, enabled)
       values ($1,$2,$3,false)
       on conflict (platform) do nothing`,
      [link.platform, link.label, link.order]
    );
    if (rowCount) bump("social links");
  }

  // ── Settings ────────────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(content.SEED_SETTINGS)) {
    const { rowCount } = await client.query(
      `insert into site_settings (key, value) values ($1,$2)
       on conflict (key) do nothing`,
      [key, value]
    );
    if (rowCount) bump("settings");
  }

  await client.query("commit");

  const created = Object.entries(counts);
  if (created.length === 0) {
    console.log("nothing to do — everything is already seeded");
  } else {
    created.forEach(([what, n]) => console.log(`  created ${n} ${what}`));
  }
}

async function test() {
  const sql = await readFile(TESTS, "utf8");
  // psql meta-commands are for the interactive report; strip them here and
  // read the results table directly.
  const runnable = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("\\"))
    .join("\n")
    .split("select\n  case when passed")[0];

  await client.query(runnable);
  const { rows } = await client.query(
    "select area, description, passed, detail from results order by ctid"
  );

  let failed = 0;
  for (const row of rows) {
    if (!row.passed) failed += 1;
    console.log(
      `  ${row.passed ? "PASS" : "FAIL"}  ${row.area.padEnd(22)}${row.description}` +
        (row.detail ? `  — ${row.detail}` : "")
    );
  }
  console.log(`\n${rows.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

const command = process.argv[2];

await client.connect();
try {
  if (command === "migrate") await migrate();
  else if (command === "seed") await seed();
  else if (command === "test") await test();
  else {
    console.error("usage: node scripts/db.mjs <migrate|seed|test>");
    process.exitCode = 1;
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
