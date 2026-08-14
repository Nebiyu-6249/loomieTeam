"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";

/**
 * Projects, which are three things at once.
 *
 * A row, a list of disciplines, three named prose sections and an ordered
 * gallery — all edited on one screen because that is how somebody thinks about
 * a case study. The generic resource machinery covers the row; this covers the
 * rest.
 *
 * ── Why the children are replaced rather than diffed ─────────────────────
 * Disciplines and sections are small, wholly derived from what the form
 * submitted, and have no identity worth preserving: a discipline is a string,
 * a section is one of exactly three kinds. Deleting and re-inserting them is
 * simpler than computing a diff and cannot leave a half-applied state. The
 * gallery is different — its rows point at media and carry per-image alt text
 * — so it is matched by media id and only genuinely new entries are inserted.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const Project = z.object({
  slug: z.string().trim().min(1).max(80).regex(SLUG, "Lower case letters, numbers and single hyphens only."),
  index: z.string().trim().min(1).max(8),
  title: z.string().trim().min(1).max(120),
  sector: z.string().trim().max(120),
  year: z.string().trim().max(20),
  summary: z.string().trim().max(400),
  study_type: z.enum(["concept", "client"]),
  status: z.enum(["placeholder", "real", "archived"]),
  cover_image_id: z.string().uuid().nullable(),
  hero_image_id: z.string().uuid().nullable(),
  display_order: z.number().int().min(-9999).max(9999),
  featured: z.boolean(),
  published: z.boolean(),
});

const Sections = z.object({
  scenario: z.string().trim().max(4000),
  direction: z.string().trim().max(4000),
  demonstration: z.string().trim().max(4000),
});

/** A comma-separated list, cleaned up and de-duplicated in order. */
function disciplinesFrom(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.length <= 60)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

/** Gallery rows arrive as parallel `gallery_media[]` and `gallery_alt[]`. */
function galleryFrom(form: FormData) {
  const ids = form.getAll("gallery_media").map(String);
  const alts = form.getAll("gallery_alt").map(String);

  return ids
    .map((mediaId, index) => ({ mediaId, alt: (alts[index] ?? "").trim().slice(0, 300) }))
    .filter((entry) => entry.mediaId !== "");
}

function fields(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "");
  const flag = (name: string) => form.get(name) === "on";

  return {
    row: {
      slug: text("slug"),
      index: text("index"),
      title: text("title"),
      sector: text("sector"),
      year: text("year"),
      summary: text("summary"),
      study_type: text("study_type") || "concept",
      status: text("status") || "placeholder",
      cover_image_id: text("cover_image_id") || null,
      hero_image_id: text("hero_image_id") || null,
      display_order: Number(text("display_order") || 0),
      featured: flag("featured"),
      published: flag("published"),
    },
    sections: {
      scenario: text("scenario"),
      direction: text("direction"),
      demonstration: text("demonstration"),
    },
    disciplines: disciplinesFrom(text("disciplines")),
    gallery: galleryFrom(form),
  };
}

const PATHS = ["/", "/work"];

function refresh(slug?: string) {
  for (const path of PATHS) revalidatePath(path);
  if (slug) revalidatePath(`/work/${slug}`);
  revalidatePath("/admin/projects");
}

/** Replaces a project's children to match what the form submitted. */
async function writeChildren(
  supabase: Awaited<ReturnType<typeof serverClient>>,
  projectId: string,
  parsedSections: z.infer<typeof Sections>,
  disciplines: string[],
  gallery: { mediaId: string; alt: string }[]
) {
  await supabase.from("project_disciplines").delete().eq("project_id", projectId);
  if (disciplines.length > 0) {
    await supabase.from("project_disciplines").insert(
      disciplines.map((discipline, order) => ({
        project_id: projectId,
        discipline,
        display_order: order,
      }))
    );
  }

  await supabase.from("project_sections").delete().eq("project_id", projectId);
  await supabase.from("project_sections").insert(
    (["scenario", "direction", "demonstration"] as const).map((kind, order) => ({
      project_id: projectId,
      kind,
      body: parsedSections[kind],
      display_order: order,
    }))
  );

  // The gallery is matched rather than replaced: project_media references
  // media with ON DELETE RESTRICT, and deleting every row on every save would
  // churn foreign keys for no reason.
  const { data: existing } = await supabase
    .from("project_media")
    .select("id, media_id")
    .eq("project_id", projectId);

  const current = (existing ?? []) as { id: string; media_id: string }[];
  const wanted = new Set(gallery.map((entry) => entry.mediaId));

  const removed = current.filter((row) => !wanted.has(row.media_id));
  if (removed.length > 0) {
    await supabase
      .from("project_media")
      .delete()
      .in("id", removed.map((row) => row.id));
  }

  for (const [order, entry] of gallery.entries()) {
    const already = current.find((row) => row.media_id === entry.mediaId);
    if (already) {
      await supabase
        .from("project_media")
        .update({ alt: entry.alt, display_order: order })
        .eq("id", already.id);
    } else {
      await supabase.from("project_media").insert({
        project_id: projectId,
        media_id: entry.mediaId,
        role: "gallery",
        alt: entry.alt,
        display_order: order,
      });
    }
  }
}

export async function saveProject(
  id: string | null,
  _: FormState,
  form: FormData
): Promise<FormState> {
  await requireAdmin();

  const raw = fields(form);
  const parsedRow = Project.safeParse(raw.row);
  if (!parsedRow.success) {
    const first = parsedRow.error.issues[0];
    return { error: first.message, field: String(first.path[0] ?? "") };
  }

  const parsedSections = Sections.safeParse(raw.sections);
  if (!parsedSections.success) {
    return { error: "One of the three sections is too long." };
  }

  const supabase = await serverClient();

  let projectId = id;
  if (id) {
    const { data, error } = await supabase
      .from("projects")
      .update(parsedRow.data)
      .eq("id", id)
      .select("id");

    if (error) {
      return {
        error:
          error.code === "23505"
            ? "Another project already uses that slug."
            : error.message,
      };
    }
    if (!data || data.length === 0) {
      return { error: "Nothing was saved — your account may not be allowed to change this." };
    }
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert(parsedRow.data)
      .select("id")
      .single();

    if (error) {
      return {
        error:
          error.code === "23505"
            ? "Another project already uses that slug."
            : error.message,
      };
    }
    projectId = (data as { id: string }).id;
  }

  await writeChildren(
    supabase,
    projectId as string,
    parsedSections.data,
    raw.disciplines,
    raw.gallery
  );

  refresh(parsedRow.data.slug);
  redirect(`/admin/projects/${projectId}?saved=1`);
}

export async function deleteProject(id: string, slug: string) {
  await requireAdmin();

  const supabase = await serverClient();

  // The children cascade on delete; the gallery rows do not hold media back
  // once they are gone. Deleting them first keeps the order explicit.
  await supabase.from("project_media").delete().eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    redirect(`/admin/projects?error=${encodeURIComponent(error.message)}`);
  }

  refresh(slug);
  redirect("/admin/projects");
}
