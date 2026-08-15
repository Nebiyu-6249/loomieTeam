"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";
import { findResource, type Resource } from "@/lib/admin/resources";
import { revalidateEveryPublicPath } from "@/lib/admin/revalidate";

/**
 * Create, update, reorder and delete, for every resource described in
 * lib/admin/resources.
 *
 * ── Written as the signed-in person, not as the service role ─────────────
 * Every statement here goes through `serverClient()`, which carries the
 * administrator's session, so row level security decides what actually
 * happens. That is deliberate and it is the harder choice: the service key
 * would make all of this work without a single policy, and the first mistake
 * in this file would then be a hole rather than a refusal. An editor who posts
 * a form to a restricted table gets zero rows changed because the database says
 * so, not because this code remembered to check.
 *
 * The checks here are still worth having — they produce a sensible message
 * instead of a silent no-op — but they are the second line, not the only one.
 *
 * ── Revalidation ─────────────────────────────────────────────────────────
 * Each resource names the public paths it appears on. Saving a service
 * revalidates the homepage, the services page and contact; saving a sector
 * revalidates one page. Nothing calls revalidatePath("/", "layout"), which
 * would throw away the whole cache because one row changed.
 */

/**
 * supabase-js types every call against a literal table name; this file works on
 * whichever table the resource names at runtime. `as never` at those call sites
 * is the cost of one implementation instead of eleven identical ones — and the
 * schema, the constraints and the policies are still the real check, so a wrong
 * column name is a refused statement rather than a corrupt row.
 */

export interface FormState {
  error?: string;
  /** Which input to point at, when the error is about one. */
  field?: string;
}

/** Reads a form into the shape the resource's schema expects. */
function values(resource: Resource, form: FormData) {
  const raw: Record<string, unknown> = {};
  for (const field of resource.fields) {
    const value = form.get(field.name);
    raw[field.name] = value === null ? undefined : String(value);
  }
  return raw;
}

async function permitted(resource: Resource) {
  const admin = await requireAdmin();
  if (resource.restricted && !canAdminister(admin.role)) {
    return { admin, allowed: false as const };
  }
  return { admin, allowed: true as const };
}

/**
 * A row in the audit log.
 *
 * Best effort: a failed audit write must not undo a successful edit, so it is
 * caught and logged rather than thrown. The metadata records which row and
 * which resource, never the values — a log of everything anybody typed is a
 * second copy of the database with none of its access controls.
 */
async function record(
  action: string,
  entityType: string,
  entityId: string | null,
  actorId: string
) {
  try {
    const supabase = await serverClient();
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {},
    });
  } catch (error) {
    console.error("[loomie] audit write failed", error);
  }
}

function refresh(resource: Resource) {
  if (resource.siteWide) revalidateEveryPublicPath();
  else for (const path of resource.revalidates) revalidatePath(path);
  revalidatePath(`/admin/${resource.key}`);
}

/** Turns a Postgres error into something a person can act on. */
function readable(error: { code?: string; message: string }, resource: Resource) {
  if (error.code === "23505") {
    return `Another ${resource.one.toLowerCase()} already uses that slug or name.`;
  }
  if (error.code === "23514") {
    return "That combination is not allowed — check the notes under each field.";
  }
  if (error.code === "23503") {
    return "Something else still refers to this. Remove that reference first.";
  }
  if (error.code === "42501") {
    return "Your account is not allowed to change this.";
  }
  return error.message;
}

export async function createRow(
  key: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const resource = findResource(key);
  if (!resource || !resource.creatable) return { error: "Unknown section." };

  const { admin, allowed } = await permitted(resource);
  if (!allowed) return { error: "Your account is not allowed to change this." };

  const parsed = resource.schema.safeParse(values(resource, form));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first.message, field: String(first.path[0] ?? "") };
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from(resource.table as never)
    .insert(parsed.data as never)
    .select("id")
    .single();

  if (error) return { error: readable(error, resource) };

  await record("create", resource.table, (data as { id: string }).id, admin.id);
  refresh(resource);
  redirect(`/admin/${resource.key}/${(data as { id: string }).id}?saved=1`);
}

export async function updateRow(
  key: string,
  id: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const resource = findResource(key);
  if (!resource) return { error: "Unknown section." };

  const { admin, allowed } = await permitted(resource);
  if (!allowed) return { error: "Your account is not allowed to change this." };

  const parsed = resource.schema.safeParse(values(resource, form));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first.message, field: String(first.path[0] ?? "") };
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from(resource.table as never)
    .update(parsed.data as never)
    .eq("id", id)
    .select("id");

  if (error) return { error: readable(error, resource) };

  // An UPDATE that row level security filters to nothing succeeds and changes
  // no rows, so "no error" is not the same as "saved". Say so rather than
  // showing a confirmation for something that did not happen.
  if (!data || data.length === 0) {
    return { error: "Nothing was saved — your account may not be allowed to change this row." };
  }

  await record("update", resource.table, id, admin.id);
  refresh(resource);
  redirect(`/admin/${resource.key}/${id}?saved=1`);
}

export async function deleteRow(key: string, id: string) {
  const resource = findResource(key);
  if (!resource || !resource.deletable) return;

  const { admin, allowed } = await permitted(resource);
  if (!allowed) return;

  const supabase = await serverClient();
  const { error } = await supabase.from(resource.table as never).delete().eq("id", id);
  if (error) {
    console.error("[loomie] delete refused", error.message);
    redirect(`/admin/${resource.key}?error=${encodeURIComponent(readable(error, resource))}`);
  }

  await record("delete", resource.table, id, admin.id);
  refresh(resource);
  redirect(`/admin/${resource.key}`);
}

/**
 * Moves a row one place up or down.
 *
 * The swap is one statement inside public.swap_display_order, not two updates
 * over REST. Two updates can leave both rows holding the same position if the
 * second one fails, and the list then has an order nobody chose and no way to
 * tell which of the two was meant to be first.
 */
export async function reorderRow(key: string, id: string, direction: "up" | "down") {
  const resource = findResource(key);
  if (!resource || !resource.orderable) return;

  const { allowed } = await permitted(resource);
  if (!allowed) return;

  const supabase = await serverClient();
  const table = resource.table as never;

  const { data: current } = await supabase
    .from(table)
    .select("id, display_order")
    .eq("id", id)
    .single();

  if (!current) return;
  const here = current as { id: string; display_order: number };

  const { data: neighbours } = await supabase
    .from(table)
    .select("id, display_order")
    .order("display_order", { ascending: direction === "down" })
    [direction === "down" ? "gt" : "lt"]("display_order", here.display_order)
    .limit(1);

  const neighbour = (neighbours ?? [])[0] as { id: string; display_order: number } | undefined;
  if (!neighbour) return;

  const { error } = await supabase.rpc("swap_display_order", {
    p_table: resource.table,
    p_a: here.id,
    p_b: neighbour.id,
  });

  if (error) {
    console.error("[loomie] reorder refused", error.message);
    return;
  }

  refresh(resource);
}
