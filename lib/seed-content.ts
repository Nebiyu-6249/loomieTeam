/**
 * The content the site launched with, in one place.
 *
 * Two jobs, and they are the same data on purpose.
 *
 * It is what scripts/seed.mjs writes into a fresh Supabase project, so a new
 * database is never empty and the first admin login shows the site the team
 * already knows rather than a set of empty tables.
 *
 * And it is what lib/content falls back to in development when Supabase is not
 * configured yet, so the site can be worked on and looked at before a project
 * exists. Production refuses that fallback — see lib/supabase/config.
 *
 * ── PLACEHOLDER CONTENT ──────────────────────────────────────────────────
 * The concept studies, the partner names and the sector notes are all
 * invented for layout, and the site says so wherever they appear. No client is
 * named, no result is claimed, and no third party's mark is used. The team
 * records are the seven people supplied, with their roles; the bios are empty
 * because no bio text was supplied, and an empty field is the honest state for
 * something nobody has written yet.
 */

import type { SocialPlatform } from "./supabase/types";

/* ── Media ────────────────────────────────────────────────────────────────
 *
 * Seeded media rows point at files already in /public. The seed registers them
 * so everything else can reference them by id, and so an admin can replace any
 * one of them with an upload without touching code.
 */

export interface SeedMedia {
  key: string;
  bucket: string;
  path: string;
  publicUrl: string;
  alt: string;
  mimeType: string;
  sizeBytes: number;
}

const plate = (key: string, alt: string, bytes: number): SeedMedia => ({
  key,
  bucket: "site",
  path: `work/${key}.jpg`,
  publicUrl: `/images/work/${key}.jpg`,
  alt,
  mimeType: "image/jpeg",
  sizeBytes: bytes,
});

export const SEED_MEDIA: SeedMedia[] = [
  plate("structure", "A low, dark building seen through trees at dusk", 277945),
  plate("structure-tall", "The building's full elevation", 240141),
  plate("canopy", "A roofline framed by branches", 183182),
  plate("form", "A faceted black metal sculpture in a concrete space", 246012),
  plate("form-wide", "Cast forms in a concrete interior", 172072),
  plate("concrete", "Concrete beams meeting at an angle", 113651),
  plate("sheet-mark", "Loomie's mark drawn on its construction geometry", 100894),
  plate("sheet-type", "A type specimen sheet showing the display face at three sizes", 141901),
  plate("sheet-grid", "A twelve-column layout grid with a page part-placed on it", 165205),
  plate("sheet-tone", "A tonal ramp running from deep blue through to warm off-white", 178875),
  plate("sheet-structure", "A page structure diagram: regions blocked out and annotated", 130239),
  plate("sheet-campaign", "A campaign sheet: one line and one mark as a poster, a square and a banner", 116636),
  plate("sheet-interface", "A built page shown at desktop and phone width", 229398),
  plate("sector-architecture", "Drawing conventions and material, set on a sheet", 88404),
  plate("sector-objects", "A mark applied to an object, at the sizes it has to survive", 103050),
  plate("sector-hardware", "One component set across a panel, a screen and a box", 95313),
  plate("sector-trade", "A specification table, set to be used rather than admired", 105529),
  /**
   * The four hero artefacts, kept under their own names.
   *
   * These are the drawn Loomie sheets — the mark on its construction geometry,
   * the type specimen, the campaign formats, the built interface. They live
   * beside `sheet-*` rather than replacing it because `sheet-*` now holds
   * photography, and a hero that is meant to show what the studio makes should
   * point at the studio's own work rather than at a picture of a desk.
   */
  plate("artefact-mark", "Loomie's mark drawn on its construction geometry, with the aperture radius marked", 100894),
  plate("artefact-type", "A type specimen sheet showing the display face at three sizes", 141901),
  plate("artefact-campaign", "A campaign sheet: one line and one mark as a poster, a square and a banner", 116636),
  plate("artefact-interface", "A built page shown at desktop and phone width", 229398),
];

/* ── Projects ─────────────────────────────────────────────────────────── */

export interface SeedProject {
  slug: string;
  index: string;
  title: string;
  sector: string;
  year: string;
  summary: string;
  disciplines: string[];
  coverKey: string;
  heroKey: string;
  gallery: { key: string; alt: string }[];
  sections: { kind: "scenario" | "direction" | "demonstration"; body: string }[];
}

export const SEED_PROJECTS: SeedProject[] = [
  {
    slug: "northbank",
    index: "01",
    title: "Northbank",
    sector: "Architecture practice",
    year: "2025",
    summary: "An identity built from the practice's own drawing conventions.",
    disciplines: ["Brand Identity", "Website Design"],
    coverKey: "structure",
    heroKey: "structure",
    gallery: [
      { key: "canopy", alt: "The building's roofline against a tree canopy" },
      { key: "sheet-grid", alt: "The drawing grid the identity and the website are both set on" },
      { key: "structure-tall", alt: "The building's full elevation" },
    ],
    sections: [
      {
        kind: "scenario",
        body: "A practice with twenty years of built work and no consistent way of presenting it. Drawings, photography and written work each had their own conventions, and none of them agreed.",
      },
      {
        kind: "direction",
        body: "The identity was taken from the drawings rather than applied over them: the same line weights, the same annotation, the same margins. The website is built on that grid, so a project page and a drawing sheet are recognisably the same document.",
      },
      {
        kind: "demonstration",
        body: "One system across drawings, print and the site. New work enters it without a redesign.",
      },
    ],
  },
  {
    slug: "ferrous",
    index: "02",
    title: "Ferrous",
    sector: "Objects and furniture",
    year: "2025",
    summary: "A mark that survives being stamped, cast and folded.",
    disciplines: ["Logo Design", "Packaging"],
    coverKey: "form",
    heroKey: "form-wide",
    gallery: [
      { key: "concrete", alt: "Concrete beams meeting at an angle" },
      { key: "sheet-mark", alt: "The mark on its construction geometry, with the aperture radius marked" },
    ],
    sections: [
      {
        kind: "scenario",
        body: "A maker working in steel and cast aluminium needed a mark that could be physically applied to the objects, not only printed beside them.",
      },
      {
        kind: "direction",
        body: "The mark was drawn at the size of a stamp first and scaled up afterwards, which is the opposite of the usual order and the reason it holds at twelve millimetres. Packaging uses uncoated board and a single ink.",
      },
      {
        kind: "demonstration",
        body: "One mark, stamped into metal and printed on board, with no second version needed for small sizes.",
      },
    ],
  },
  {
    slug: "signal",
    index: "03",
    title: "Signal",
    sector: "Software product",
    year: "2026",
    summary: "Interface and marketing drawn from the same set of parts.",
    disciplines: ["Brand Identity", "Website Design"],
    coverKey: "sheet-structure",
    heroKey: "sheet-grid",
    gallery: [
      { key: "sheet-type", alt: "A type specimen showing the display face at three sizes" },
      { key: "sheet-tone", alt: "A tonal ramp running from deep blue to warm off-white" },
    ],
    sections: [
      {
        kind: "scenario",
        body: "A product whose marketing site and application had been designed by different people at different times, and looked it.",
      },
      {
        kind: "direction",
        body: "A single component set — one type scale, one spacing unit, one tonal ramp — used for the interface, the site and the documentation. The system is published rather than described, so a new screen starts from it instead of beside it.",
      },
      {
        kind: "demonstration",
        body: "A product that reads as one thing from the landing page to the settings screen.",
      },
    ],
  },
  {
    slug: "quarry",
    index: "04",
    title: "Quarry",
    sector: "Materials supply",
    year: "2024",
    summary: "Trade material that behaves like a specification, not an advert.",
    disciplines: ["Marketing Design"],
    coverKey: "concrete",
    heroKey: "form-wide",
    gallery: [
      { key: "form", alt: "A cast form seen against concrete" },
      { key: "sheet-tone", alt: "The tonal range the literature is printed within" },
    ],
    sections: [
      {
        kind: "scenario",
        body: "Sales material that specifiers were ignoring because it read as promotion rather than information.",
      },
      {
        kind: "direction",
        body: "The literature was rebuilt around the tables people actually use, with photography as evidence rather than decoration. Nothing is set larger than it needs to be.",
      },
      {
        kind: "demonstration",
        body: "Material that gets kept on the desk instead of filed.",
      },
    ],
  },
];

/* ── Services ─────────────────────────────────────────────────────────── */

export interface SeedService {
  slug: string;
  number: string;
  title: string;
  shortDescription: string;
  heroLabel: string;
  heroDescription: string;
  visualKey: string;
  heroKey: string;
}

export const SEED_SERVICES: SeedService[] = [
  {
    slug: "logo-design",
    number: "01",
    title: "Logo Design",
    shortDescription: "Marks drawn from their own geometry, built to survive every size.",
    heroLabel: "Logo / Mark / Construction",
    heroDescription: "Drawn from its own geometry.",
    visualKey: "sheet-mark",
    heroKey: "artefact-mark",
  },
  {
    slug: "brand-identity",
    number: "02",
    title: "Brand Identity",
    shortDescription: "Type, colour and the rules that keep a brand recognisable.",
    heroLabel: "Identity / Type / Colour",
    heroDescription: "One system, every surface.",
    visualKey: "sheet-tone",
    heroKey: "artefact-type",
  },
  {
    slug: "marketing-design",
    number: "03",
    title: "Marketing Design",
    shortDescription: "Campaign work built from the brand, not beside it.",
    heroLabel: "Marketing / Campaign / Formats",
    heroDescription: "One line, every format.",
    visualKey: "sheet-campaign",
    heroKey: "artefact-campaign",
  },
  {
    slug: "website-design",
    number: "04",
    title: "Website Design",
    shortDescription: "Fast, legible sites designed to keep growing.",
    heroLabel: "Website / Layout / Interface",
    heroDescription: "The system, actually built.",
    visualKey: "sheet-interface",
    heroKey: "artefact-interface",
  },
];

/* ── Team ─────────────────────────────────────────────────────────────────
 *
 * The seven people supplied, with the roles supplied, and nothing else.
 *
 * Bios are empty on purpose. No bio text reached this build, and the one thing
 * placeholder content must never do is invent a person's history — so the page
 * renders a name and a role until somebody writes the rest in the admin.
 * Portraits are the same: there are none yet, and the roster draws a Loomie
 * frame with the person's initials rather than borrowing a face.
 */

export interface SeedTeamMember {
  slug: string;
  name: string;
  role: string;
}

export const SEED_TEAM: SeedTeamMember[] = [
  { slug: "mohamed-ragab", name: "Mohamed Ragab", role: "Growth & Brand" },
  { slug: "yaya", name: "Yaya", role: "UX Design Intern" },
  { slug: "mohammed-umur", name: "Mohammed Umur", role: "Data, AI & Growth" },
  { slug: "yahya-azez", name: "Yahya Azez", role: "Graphic Designer & Freelancer" },
  { slug: "nebiyu-elias", name: "Nebiyu Elias", role: "Full Stack & AI Engineer" },
  { slug: "samson-imoh", name: "Samson Imoh", role: "Full Stack Engineer" },
  { slug: "jenine-jaradat", name: "Jenine Jaradat", role: "Student — CS & Economics" },
];

/* ── Who we work with ─────────────────────────────────────────────────── */

export interface SeedSector {
  slug: string;
  number: string;
  name: string;
  summary: string;
  problem: string;
  visualKey: string;
}

export const SEED_SECTORS: SeedSector[] = [
  {
    slug: "architecture-and-interiors",
    number: "01",
    name: "Architecture and interiors",
    summary: "Practices with more built work than they can present.",
    problem: "Complex work needs a clear way to be seen.",
    visualKey: "sector-architecture",
  },
  {
    slug: "objects-and-manufacturing",
    number: "02",
    name: "Objects and manufacturing",
    summary: "Makers who need a mark that survives the material.",
    problem: "A mark has to hold when it is stamped, not only when it is printed.",
    visualKey: "sector-objects",
  },
  {
    slug: "hardware-and-software",
    number: "03",
    name: "Hardware and software",
    summary: "Products designed by several teams that should look like one.",
    problem: "One product, assembled from parts that never agreed.",
    visualKey: "sector-hardware",
  },
  {
    slug: "trade-and-supply",
    number: "04",
    name: "Trade and supply",
    summary: "Technical buyers who want information, not persuasion.",
    problem: "Material that gets filed instead of used.",
    visualKey: "sector-trade",
  },
];

export interface SeedEngagement {
  number: string;
  title: string;
  duration: string;
  description: string;
}

export const SEED_ENGAGEMENTS: SeedEngagement[] = [
  {
    number: "01",
    title: "Brand and mark",
    duration: "4–6 weeks",
    description: "For a new visual system: mark, type, colour and the rules that keep them together.",
  },
  {
    number: "02",
    title: "Brand and site",
    duration: "8–12 weeks",
    description: "For identity plus its digital home. The system, then the place it lives.",
  },
  {
    number: "03",
    title: "Retained",
    duration: "Monthly",
    description: "For ongoing campaign and product work inside an existing system.",
  },
];

/* ── Partners ─────────────────────────────────────────────────────────────
 *
 * Invented names, flagged as such in the database, so the marquee can say what
 * it is rather than implying six relationships that do not exist.
 */

export const SEED_PARTNERS: { name: string }[] = [
  { name: "Northwind" },
  { name: "Atlas Co" },
  { name: "Meridian" },
  { name: "Kestrel" },
  { name: "Halvard" },
  { name: "Oakline" },
];

/* ── Social links ─────────────────────────────────────────────────────────
 *
 * Seeded with no URL and disabled, which is the only honest starting state:
 * no account addresses were supplied, and the constraint on the table means a
 * link cannot be switched on until somebody puts a real one in.
 */

export const SEED_SOCIAL: { platform: SocialPlatform; label: string; order: number }[] = [
  { platform: "linkedin", label: "LinkedIn", order: 0 },
  { platform: "instagram", label: "Instagram", order: 1 },
  { platform: "twitter", label: "X / Twitter", order: 2 },
];

/* ── Settings ─────────────────────────────────────────────────────────── */

export const SEED_SETTINGS: Record<string, string> = {
  contact_email: "hello@loomiestudio.com",
  booking_email: "hello@loomiestudio.com",
  site_title: "Loomie — Brand Identity & Digital Design Studio",
  site_description:
    "Loomie builds brand identities, digital systems and websites designed to stay coherent across every touchpoint.",
  availability_text: "Twenty minutes is usually enough to tell whether we are the right studio for it.",
  footer_statement: "Working remotely, worldwide",
};
