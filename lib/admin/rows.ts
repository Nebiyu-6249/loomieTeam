import "server-only";

import { serverClient } from "@/lib/supabase/server";
import type { Resource } from "./resources";
import type { MediaOption } from "@/components/admin/ResourceForm";

/** Reading rows for the admin. Session client throughout, so RLS applies. */

export async function listRows(resource: Resource) {
  const supabase = await serverClient();
  const query = supabase.from(resource.table as never).select("*");

  const { data, error } = resource.orderable
    ? await query.order("display_order", { ascending: true })
    : await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function getRow(resource: Resource, id: string) {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from(resource.table as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Record<string, unknown> | null;
}

/**
 * Everything an image picker can offer.
 *
 * Labelled by alt text where there is one and by path where there is not,
 * because "work/sheet-type.jpg" is a worse answer than "A type specimen sheet"
 * and a better one than nothing.
 */
export async function mediaOptions(): Promise<MediaOption[]> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("media")
    .select("id, path, alt")
    .order("created_at", { ascending: false });

  if (error) return [];

  return ((data ?? []) as { id: string; path: string; alt: string }[]).map((row) => ({
    id: row.id,
    label: row.alt ? `${row.alt} — ${row.path}` : row.path,
  }));
}
