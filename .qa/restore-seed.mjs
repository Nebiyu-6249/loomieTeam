/** Puts the local fixture database back to the seeded text after a test run. */
import pg from "pg";
import { SEED_PROJECTS } from "../lib/seed-content.ts";

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();

let fixed = 0;
for (const project of SEED_PROJECTS) {
  for (const section of project.sections) {
    const r = await c.query(
      `update project_sections s set body = $1
         from projects p
        where p.id = s.project_id and p.slug = $2 and s.kind = $3 and s.body <> $1`,
      [section.body, project.slug, section.kind]
    );
    fixed += r.rowCount;
  }
}
console.log(`restored ${fixed} section(s)`);
await c.end();
