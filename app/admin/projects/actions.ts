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
 * ── One database call, because that is what atomic means ─────────────────
 * The row, the disciplines, the three sections and the gallery all move
 * together through public.save_project. Doing it as six REST calls and
 * checking each error was never atomic: any of them could be the last one to
 * succeed, and the project would be left in a state nobody chose.
 *
 * Inside that function, disciplines and sections are replaced — they are
 * wholly derived from the form and have no identity worth preserving — while
 * the gallery is matched by media id, because its rows reference media under
 * ON DELETE RESTRICT.
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

  /**
   * One call, one transaction.
   *
   * This used to be a row update followed by six child statements over
   * separate REST calls, with each error checked — which is not atomicity, it
   * is a sequence that can stop in the middle. A save that failed on the
   * gallery left the project carrying new prose, no disciplines and a
   * half-replaced set of sections, and nothing about the result said so.
   *
   * save_project is SECURITY INVOKER, so the administrator's own policies
   * still decide what the statements inside may touch. It raises rather than
   * returning zero rows when row level security filters the update away, which
   * is how "nothing was saved" reaches the interface as an error instead of as
   * a confirmation.
   */
  const { data, error } = await supabase.rpc("save_project", {
    p_id: id,
    p_project: parsedRow.data,
    p_disciplines: raw.disciplines,
    p_sections: (["scenario", "direction", "demonstration"] as const).map((kind) => ({
      kind,
      body: parsedSections.data[kind],
    })),
    p_gallery: raw.gallery.map((entry) => ({ media_id: entry.mediaId, alt: entry.alt })),
  });

  if (error) {
    if (error.code === "23505") return { error: "Another project already uses that slug." };
    if (error.code === "42501") {
      return { error: "Nothing was saved — your account may not be allowed to change this." };
    }
    if (error.code === "23503") {
      return { error: "One of the chosen images no longer exists. Reload and try again." };
    }
    return { error: error.message };
  }

  const projectId = data as unknown as string;

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
