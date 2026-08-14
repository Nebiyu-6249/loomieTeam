/**
 * The shapes the site renders, and the words it uses for them.
 *
 * Split out of lib/content because that module is server-only: it opens a
 * database connection and reads cookies, so importing it from a Client
 * Component is a build error. Components still need the types, and a couple of
 * them need the labels, so those live here where both sides can reach them.
 *
 * Nothing in this file reads anything. It is types, plus two label maps that
 * exist so the same word cannot be spelled two ways in two components.
 */

import type { SocialPlatform } from "./supabase/types";

export type { SocialPlatform };

export interface ContentImage {
  src: string;
  alt: string;
}

export type ProjectStudyStatus = "concept" | "client";

export interface Project {
  slug: string;
  /**
   * Archive numbering, stored rather than derived, so adding a project never
   * renumbers the ones already published and linked to.
   */
  index: string;
  title: string;
  sector: string;
  year: string;
  disciplines: string[];
  /** One line. The archive shows this and nothing more. */
  summary: string;
  cover: ContentImage;
  hero: ContentImage;
  gallery: ContentImage[];
  /**
   * Three short paragraphs. Named for what a concept study actually contains:
   * the situation it was set against, the direction taken, and what was made
   * to show it. The previous names — brief, approach, outcome — each asserted
   * something that had not happened, because nobody briefed this work and it
   * has no outcome to report.
   */
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
  /** What the hero shows while this service is the active one. */
  hero: ContentImage & { label: string; note: string };
}

export interface TeamMember {
  slug: string;
  index: string;
  name: string;
  role: string;
  shortBio: string;
  longBio: string;
  /** Null until somebody uploads one. Never a stock portrait. */
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
  /** True while the name is standing in for one nobody has supplied yet. */
  placeholder: boolean;
  /** A real uploaded logo, or null — in which case a drawn mark stands in. */
  logo: ContentImage | null;
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

/** The three parts of a study, in order, with the headings they are set under. */
export const STUDY_PARTS = [
  { key: "scenario", label: "Scenario" },
  { key: "direction", label: "Direction" },
  { key: "demonstration", label: "Demonstration" },
] as const;
