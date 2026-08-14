import "server-only";

import { serverClient } from "./supabase/server";
import {
  SupabaseNotConfiguredError,
  announceSeedFallback,
  isProduction,
  isSupabaseConfigured,
} from "./supabase/config";
import {
  SEED_ENGAGEMENTS,
  SEED_MEDIA,
  SEED_PARTNERS,
  SEED_PROJECTS,
  SEED_SECTORS,
  SEED_SERVICES,
  SEED_SETTINGS,
  SEED_SOCIAL,
  SEED_TEAM,
} from "./seed-content";
import type { SocialPlatform } from "./supabase/types";

/**
 * Everything the public site reads, from one place.
 *
 * The point of this file is that there is exactly one answer to "where does
 * content come from" at any moment. Supabase when it is configured; the seed
 * when it is not and this is development; a refusal when it is not and this is
 * production. No page decides for itself, so the site cannot end up in the
 * state worth preventing — an admin writing to a database while the pages
 * render constants.
 *
 * Server-only. These functions read cookies and a service connection, and
 * importing them from a Client Component is a build error rather than a
 * runtime surprise.
 */

/* ── Domain shapes ─────────────────────────────────────────────────────────
 *
 * The shapes the components already use. Kept deliberately: the database is a
 * new source for the same content, and rewriting every component's props to
 * match table columns would be churn without a reason.
 */

export interface ContentImage {
  src: string;
  alt: string;
}

export type ProjectStudyStatus = "concept" | "client";

export interface Project {
  slug: string;
  index: string;
  title: string;
  sector: string;
  year: string;
  disciplines: string[];
  summary: string;
  cover: ContentImage;
  hero: ContentImage;
  gallery: ContentImage[];
  scenario: string;
  direction: string;
  demonstration: string;
  studyType: ProjectStudyStatus;
}

export interface Service {
  id: string;
  number: string;
  title: string;
  summary: string;
  image: ContentImage;
  hero: ContentImage & { label: string; note: string };
}

export interface TeamMember {
  slug: string;
  index: string;
  name: string;
  role: string;
  shortBio: string;
  longBio: string;
  photo: ContentImage | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
}

export interface Sector {
  slug: string;
  number: string;
  name: string;
  summary: string;
  problem: string;
  visual: ContentImage | null;
}

export interface Engagement {
  number: string;
  title: string;
  duration: string;
  description: string;
}

export interface Partner {
  id: string;
  name: string;
  placeholder: boolean;
}

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  url: string;
}

export type SettingKey =
  | "contact_email"
  | "booking_email"
  | "site_title"
  | "site_description"
  | "availability_text"
  | "footer_statement";

export type Settings = Record<SettingKey, string>;

/** What a concept study is called, in one place so the wording cannot drift. */
export const STUDY_LABEL: Record<ProjectStudyStatus, string> = {
  concept: "Concept study",
  client: "Client project",
};

/* ── The decision ──────────────────────────────────────────────────────── */

/**
 * Whether to read the seed instead of the database.
 *
 * Throws in production rather than returning true, so a misconfigured deploy
 * fails visibly on the first content page instead of quietly serving copy that
 * nothing can edit.
 */
function useSeed(what: string) {
  if (isSupabaseConfigured()) return false;
  if (isProduction()) throw new SupabaseNotConfiguredError(what);
  announceSeedFallback();
  return true;
}

const seedMediaByKey = new Map(SEED_MEDIA.map((m) => [m.key, m]));

const seedImage = (key: string, fallbackAlt = ""): ContentImage => {
  const found = seedMediaByKey.get(key);
  return { src: found?.publicUrl ?? "", alt: found?.alt ?? fallbackAlt };
};

/** A media row joined from Supabase, reduced to what a component needs. */
type JoinedMedia = { public_url: string | null; alt: string | null } | null;

const image = (media: JoinedMedia, overrideAlt?: string): ContentImage => ({
  src: media?.public_url ?? "",
  alt: overrideAlt || media?.alt || "",
});

/* ── Projects ──────────────────────────────────────────────────────────── */

const seedProjects = (): Project[] =>
  SEED_PROJECTS.map((project) => ({
    slug: project.slug,
    index: project.index,
    title: project.title,
    sector: project.sector,
    year: project.year,
    disciplines: project.disciplines,
    summary: project.summary,
    cover: seedImage(project.coverKey),
    hero: seedImage(project.heroKey),
    gallery: project.gallery.map((g) => ({ ...seedImage(g.key), alt: g.alt })),
    scenario: project.sections.find((s) => s.kind === "scenario")?.body ?? "",
    direction: project.sections.find((s) => s.kind === "direction")?.body ?? "",
    demonstration: project.sections.find((s) => s.kind === "demonstration")?.body ?? "",
    studyType: "concept",
  }));

const PROJECT_QUERY = `
  slug, index, title, sector, year, summary, study_type, display_order,
  cover:cover_image_id ( public_url, alt ),
  hero:hero_image_id ( public_url, alt ),
  project_disciplines ( discipline, display_order ),
  project_sections ( kind, body ),
  project_media ( role, alt, caption, display_order, media:media_id ( public_url, alt ) )
`;

interface ProjectQueryRow {
  slug: string;
  index: string;
  title: string;
  sector: string;
  year: string;
  summary: string;
  study_type: ProjectStudyStatus;
  display_order: number;
  cover: JoinedMedia;
  hero: JoinedMedia;
  project_disciplines: { discipline: string; display_order: number }[];
  project_sections: { kind: string; body: string }[];
  project_media: {
    role: string;
    alt: string;
    display_order: number;
    media: JoinedMedia;
  }[];
}

function toProject(row: ProjectQueryRow): Project {
  const section = (kind: string) =>
    row.project_sections.find((s) => s.kind === kind)?.body ?? "";

  return {
    slug: row.slug,
    index: row.index,
    title: row.title,
    sector: row.sector,
    year: row.year,
    summary: row.summary,
    studyType: row.study_type,
    disciplines: [...row.project_disciplines]
      .sort((a, b) => a.display_order - b.display_order)
      .map((d) => d.discipline),
    cover: image(row.cover),
    hero: image(row.hero),
    gallery: [...row.project_media]
      .filter((m) => m.role === "gallery" || m.role === "detail")
      .sort((a, b) => a.display_order - b.display_order)
      .map((m) => image(m.media, m.alt)),
    scenario: section("scenario"),
    direction: section("direction"),
    demonstration: section("demonstration"),
  };
}

export async function getProjects(): Promise<Project[]> {
  if (useSeed("The work archive")) return seedProjects();

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_QUERY)
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as unknown as ProjectQueryRow[]).map(toProject);
}

/** The homepage shows three; the archive shows everything published. */
export async function getSelectedProjects(): Promise<Project[]> {
  return (await getProjects()).slice(0, 3);
}

export async function getProject(slug: string): Promise<Project | null> {
  if (useSeed("This case study")) {
    return seedProjects().find((p) => p.slug === slug) ?? null;
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_QUERY)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  return data ? toProject(data as unknown as ProjectQueryRow) : null;
}

/** Wraps, so the last study leads back to the first. */
export async function getNextProject(slug: string): Promise<Project | null> {
  const all = await getProjects();
  if (all.length === 0) return null;
  const at = all.findIndex((p) => p.slug === slug);
  return all[(at + 1) % all.length] ?? null;
}

/* ── Services ──────────────────────────────────────────────────────────── */

export async function getServices(): Promise<Service[]> {
  if (useSeed("The services section")) {
    return SEED_SERVICES.map((s) => ({
      id: s.slug,
      number: s.number,
      title: s.title,
      summary: s.shortDescription,
      image: seedImage(s.visualKey),
      hero: { ...seedImage(s.heroKey), label: s.heroLabel, note: s.heroDescription },
    }));
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      `id, slug, number, title, short_description, hero_label, hero_description,
       visual:visual_media_id ( public_url, alt ),
       hero:hero_media_id ( public_url, alt )`
    )
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data as unknown as {
    id: string;
    number: string;
    title: string;
    short_description: string;
    hero_label: string;
    hero_description: string;
    visual: JoinedMedia;
    hero: JoinedMedia;
  }[]).map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    summary: row.short_description,
    image: image(row.visual),
    hero: {
      ...image(row.hero),
      label: row.hero_label,
      note: row.hero_description,
    },
  }));
}

/* ── Team ──────────────────────────────────────────────────────────────── */

export async function getTeam(): Promise<TeamMember[]> {
  const number = (i: number) => String(i + 1).padStart(2, "0");

  if (useSeed("The team")) {
    return SEED_TEAM.map((person, i) => ({
      slug: person.slug,
      index: number(i),
      name: person.name,
      role: person.role,
      shortBio: "",
      longBio: "",
      photo: null,
      linkedinUrl: null,
      instagramUrl: null,
      twitterUrl: null,
    }));
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `slug, name, role, short_bio, long_bio, linkedin_url, instagram_url, twitter_url,
       photo:photo_media_id ( public_url, alt )`
    )
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data as unknown as {
    slug: string;
    name: string;
    role: string;
    short_bio: string;
    long_bio: string;
    linkedin_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    photo: JoinedMedia;
  }[]).map((row, i) => ({
    slug: row.slug,
    index: number(i),
    name: row.name,
    role: row.role,
    shortBio: row.short_bio,
    longBio: row.long_bio,
    photo: row.photo?.public_url
      ? image(row.photo, row.photo.alt ?? `${row.name}, ${row.role}`)
      : null,
    linkedinUrl: row.linkedin_url,
    instagramUrl: row.instagram_url,
    twitterUrl: row.twitter_url,
  }));
}

/* ── Who we work with ──────────────────────────────────────────────────── */

export async function getSectors(): Promise<Sector[]> {
  if (useSeed("The sectors page")) {
    return SEED_SECTORS.map((s) => ({
      slug: s.slug,
      number: s.number,
      name: s.name,
      summary: s.summary,
      problem: s.problem,
      visual: seedImage(s.visualKey),
    }));
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("sectors")
    .select(
      `slug, number, name, summary, problem, visual:visual_media_id ( public_url, alt )`
    )
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data as unknown as {
    slug: string;
    number: string;
    name: string;
    summary: string;
    problem: string;
    visual: JoinedMedia;
  }[]).map((row) => ({
    slug: row.slug,
    number: row.number,
    name: row.name,
    summary: row.summary,
    problem: row.problem,
    visual: row.visual?.public_url ? image(row.visual) : null,
  }));
}

export async function getEngagements(): Promise<Engagement[]> {
  if (useSeed("Engagements")) return SEED_ENGAGEMENTS;

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("engagements")
    .select("number, title, duration, description")
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data as Engagement[];
}

/* ── Partners ──────────────────────────────────────────────────────────── */

export async function getPartners(): Promise<Partner[]> {
  if (useSeed("Partners")) {
    return SEED_PARTNERS.map((p) => ({
      id: p.name.toLowerCase().replace(/\s+/g, "-"),
      name: p.name,
      placeholder: true,
    }));
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, name, placeholder")
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data as Partner[];
}

/* ── Social links ──────────────────────────────────────────────────────── */

/**
 * Only links that are switched on and actually have a URL.
 *
 * The database enforces the same pair, so there is no arrangement of settings
 * that produces a link to nowhere. Seeded empty and disabled, because no
 * account addresses were supplied: the section simply does not render until
 * somebody puts real ones in.
 */
export async function getSocialLinks(): Promise<SocialLink[]> {
  if (useSeed("Social links")) {
    return SEED_SOCIAL.filter(() => false).map((s) => ({
      platform: s.platform,
      label: s.label,
      url: "",
    }));
  }

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("platform, label, url")
    .eq("enabled", true)
    .not("url", "is", null)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as { platform: SocialPlatform; label: string; url: string }[]) ?? [];
}

/* ── Settings ──────────────────────────────────────────────────────────── */

export async function getSettings(): Promise<Settings> {
  const defaults = SEED_SETTINGS as Settings;

  if (useSeed("Site settings")) return defaults;

  const supabase = await serverClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw error;

  const merged = { ...defaults };
  for (const row of data ?? []) {
    if (row.value) merged[row.key as SettingKey] = row.value;
  }
  return merged;
}
