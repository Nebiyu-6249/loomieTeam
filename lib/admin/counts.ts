import "server-only";

import { serverClient } from "@/lib/supabase/server";

/**
 * What the overview screen counts.
 *
 * Every figure is a real `count` from the database, read through the signed-in
 * administrator's session so row level security decides what they are allowed
 * to total. An editor cannot read bookings, so an editor's overview does not
 * show a booking count — not because the interface hides it, but because the
 * query returns nothing to hide.
 *
 * `head: true` asks Postgres for the count without transferring the rows, which
 * is the difference between a dashboard and a full table scan rendered as a
 * number.
 */

export interface Pair {
  published: number;
  total: number;
}

export interface Overview {
  projects: Pair;
  services: Pair;
  team: Pair;
  sectors: Pair;
  partners: Pair;
  media: number;
  /** Null when the signed-in role may not read them. */
  bookings: { upcoming: number; pending: number } | null;
  enquiries: { unanswered: number; total: number } | null;
}

/** The content tables that carry a `published` flag. */
type ContentTable = "projects" | "services" | "team_members" | "sectors" | "partners";

export async function getOverview(canSeeEnquiries: boolean): Promise<Overview> {
  const supabase = await serverClient();
  const now = new Date().toISOString();

  /** Published and total for one content table. */
  const pair = async (table: ContentTable): Promise<Pair> => {
    const [published, total] = await Promise.all([
      supabase.from(table).select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from(table).select("*", { count: "exact", head: true }),
    ]);
    return { published: published.count ?? 0, total: total.count ?? 0 };
  };

  const [projects, services, team, sectors, partners, media] = await Promise.all([
    pair("projects"),
    pair("services"),
    pair("team_members"),
    pair("sectors"),
    pair("partners"),
    supabase.from("media").select("*", { count: "exact", head: true }),
  ]);

  const base = {
    projects,
    services,
    team,
    sectors,
    partners,
    media: media.count ?? 0,
  };

  if (!canSeeEnquiries) {
    return { ...base, bookings: null, enquiries: null };
  }

  const [upcoming, pending, unanswered, enquiryTotal] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_at", now)
      .in("status", ["pending", "confirmed"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("enquiries")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "in_progress"]),
    supabase.from("enquiries").select("*", { count: "exact", head: true }),
  ]);

  return {
    ...base,
    bookings: { upcoming: upcoming.count ?? 0, pending: pending.count ?? 0 },
    enquiries: { unanswered: unanswered.count ?? 0, total: enquiryTotal.count ?? 0 },
  };
}
