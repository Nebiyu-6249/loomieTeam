import { startPostgrestStub } from "./postgrestStub.mjs";
import { createClient } from "@supabase/supabase-js";

const stub = await startPostgrestStub(3395, process.env.SUPABASE_DB_URL);
const c = createClient(stub.url, "stub-key");

const svc = await c.from("services").select("slug, number, title").eq("published", true).order("display_order", { ascending: true });
console.log("services:", svc.error ? svc.error : svc.data.map(s => s.slug).join(", "));

await stub.reset();

const start = "2026-09-01T09:00:00.000Z";
const one = await c.from("bookings").insert({
  booking_code: "LM-AAAAAA", name: "Ada", email: "ada@example.com",
  start_at: start, end_at: "2026-09-01T09:20:00.000Z",
  visitor_timezone: "Europe/London", status: "pending",
});
console.log("first insert:", one.error ? one.error.code + " " + one.error.message : "ok");

const two = await c.from("bookings").insert({
  booking_code: "LM-BBBBBB", name: "Bob", email: "bob@example.com",
  start_at: start, end_at: "2026-09-01T09:20:00.000Z",
  visitor_timezone: "Europe/London", status: "pending",
});
console.log("second insert:", two.error ? two.error.code + " (refused)" : "ok (WRONG — double booked)");

const got = await c.from("bookings")
  .select("booking_code, name, email, start_at, visitor_timezone, note, visitor_confirmed, created_at, services:service_id ( slug, title )")
  .eq("start_at", start).neq("status", "cancelled").maybeSingle();
console.log("read back:", got.error ? got.error : JSON.stringify(got.data));

const proj = await c.from("projects").select(`
  slug, index, title, sector, year, summary, study_type, display_order,
  cover:cover_image_id ( public_url, alt ),
  project_disciplines ( discipline, display_order ),
  project_sections ( kind, body )
`).eq("published", true).order("display_order", { ascending: true });
console.log("projects:", proj.error ? proj.error : proj.data.map(p => `${p.slug}[${p.project_disciplines.length}d/${p.project_sections.length}s/${p.cover?.public_url}]`).join(" "));

await stub.reset();
await stub.close();
