/**
 * Every project on the site, once.
 *
 * This record powers the homepage selection, the work archive, the case study
 * route, the case study's own next-project link, and the sitemap. Before this
 * file existed there were four separate arrays — in the hero, the portfolio
 * grid, the clients page and the case study route — and they disagreed with
 * each other about how many projects the studio had, what they were called
 * and which sector they belonged to.
 *
 * ── PLACEHOLDER CONTENT ──────────────────────────────────────────────────
 * Everything marked `status: "placeholder"` is standing in until real case
 * study material arrives. Replacing it means editing this file and nothing
 * else. Two rules held while writing it:
 *
 *   No client is named. These are project titles, not company names, and no
 *   record claims a relationship with a real business. `sector` describes the
 *   kind of work; that is all the site asserts.
 *
 *   No invented results. There are no percentages, no awards and no
 *   testimonials, because inventing those is the one thing placeholder copy
 *   must never do.
 */

export type ProjectStatus = "placeholder" | "published";

export interface ProjectImage {
  src: string;
  alt: string;
}

export interface Project {
  slug: string;
  /** Archive numbering. Stable, so it never renumbers when one is added. */
  index: string;
  title: string;
  sector: string;
  year: string;
  disciplines: string[];
  /** One line. The archive shows this and nothing more. */
  summary: string;
  cover: ProjectImage;
  /** Wide rendition for the case study hero. */
  hero: ProjectImage;
  gallery: ProjectImage[];
  /** Three short paragraphs, not three essays. */
  brief: string;
  approach: string;
  outcome: string;
  status: ProjectStatus;
}

export const PROJECTS: Project[] = [
  {
    slug: "northbank",
    index: "01",
    title: "Northbank",
    sector: "Architecture practice",
    year: "2025",
    disciplines: ["Identity", "Website"],
    summary: "An identity built from the practice's own drawing conventions.",
    cover: {
      src: "/images/work/structure.jpg",
      alt: "A low, dark building seen through trees at dusk",
    },
    hero: {
      src: "/images/work/structure.jpg",
      alt: "A low, dark building seen through trees at dusk",
    },
    gallery: [
      { src: "/images/work/canopy.jpg", alt: "The building's roofline against a tree canopy" },
      { src: "/images/work/concrete.jpg", alt: "Concrete beams meeting at an angle" },
      { src: "/images/work/structure-tall.jpg", alt: "The building's full elevation" },
    ],
    brief:
      "A practice with twenty years of built work and no consistent way of presenting it. Drawings, photography and written work each had their own conventions, and none of them agreed.",
    approach:
      "The identity was taken from the drawings rather than applied over them: the same line weights, the same annotation, the same margins. The website is built on that grid, so a project page and a drawing sheet are recognisably the same document.",
    outcome:
      "One system across drawings, print and the site. New work enters it without a redesign.",
    status: "placeholder",
  },
  {
    slug: "ferrous",
    index: "02",
    title: "Ferrous",
    sector: "Objects and furniture",
    year: "2025",
    disciplines: ["Identity", "Packaging"],
    summary: "A mark that survives being stamped, cast and folded.",
    cover: {
      src: "/images/work/form.jpg",
      alt: "A faceted black metal sculpture in a concrete space",
    },
    hero: {
      src: "/images/work/form-wide.jpg",
      alt: "A faceted black metal sculpture in a concrete space",
    },
    gallery: [
      { src: "/images/work/concrete.jpg", alt: "Concrete beams meeting at an angle" },
      { src: "/images/work/form.jpg", alt: "The sculpture seen from the front" },
    ],
    brief:
      "A maker working in steel and cast aluminium needed a mark that could be physically applied to the objects, not only printed beside them.",
    approach:
      "The mark was drawn at the size of a stamp first and scaled up afterwards, which is the opposite of the usual order and the reason it holds at twelve millimetres. Packaging uses uncoated board and a single ink.",
    outcome:
      "One mark, stamped into metal and printed on board, with no second version needed for small sizes.",
    status: "placeholder",
  },
  {
    slug: "signal",
    index: "03",
    title: "Signal",
    sector: "Audio hardware",
    year: "2026",
    disciplines: ["Digital identity", "Website"],
    summary: "Interface and packaging drawn from the same set of parts.",
    cover: {
      src: "/images/work/surface.jpg",
      alt: "Vintage audio and computing hardware under directional light",
    },
    hero: {
      src: "/images/work/surface.jpg",
      alt: "Vintage audio and computing hardware under directional light",
    },
    gallery: [
      { src: "/images/work/keys.jpg", alt: "A close crop of keys and controls" },
      { src: "/images/work/surface.jpg", alt: "The hardware arranged on a surface" },
    ],
    brief:
      "Hardware and software that had been designed by different people at different times, and looked it.",
    approach:
      "A single component set — one type scale, one control geometry, one spacing unit — used for the physical panel, the screen interface and the box. The website documents the set rather than describing it.",
    outcome:
      "A product that reads as one object from the shelf to the settings screen.",
    status: "placeholder",
  },
  {
    slug: "marne",
    index: "04",
    title: "Marne",
    sector: "Interiors",
    year: "2024",
    disciplines: ["Web identity"],
    summary: "A photography-led site that gets out of the photography's way.",
    cover: {
      src: "/images/work/canopy.jpg",
      alt: "A roofline framed by branches",
    },
    hero: {
      src: "/images/work/structure-tall.jpg",
      alt: "A building elevation seen between trees",
    },
    gallery: [
      { src: "/images/work/structure.jpg", alt: "The building at dusk" },
      { src: "/images/work/canopy.jpg", alt: "A roofline framed by branches" },
    ],
    brief:
      "Strong photography arriving in inconsistent crops, sizes and colour, and a site that flattened all of it.",
    approach:
      "A fixed set of frames and one grade, applied on the way in. Everything else on the page is set in one weight so nothing competes with the image.",
    outcome:
      "A site where the work is the only thing asking for attention.",
    status: "placeholder",
  },
  {
    slug: "quarry",
    index: "05",
    title: "Quarry",
    sector: "Materials supply",
    year: "2024",
    disciplines: ["Marketing design"],
    summary: "Trade material that behaves like a specification, not an advert.",
    cover: {
      src: "/images/work/concrete.jpg",
      alt: "Concrete beams meeting at an angle",
    },
    hero: {
      src: "/images/work/form-wide.jpg",
      alt: "Cast forms in a concrete interior",
    },
    gallery: [
      { src: "/images/work/form.jpg", alt: "A cast form seen against concrete" },
      { src: "/images/work/concrete.jpg", alt: "A close crop of concrete" },
    ],
    brief:
      "Sales material that specifiers were ignoring because it read as promotion rather than information.",
    approach:
      "The literature was rebuilt around the tables people actually use, with photography as evidence rather than decoration. Nothing is set larger than it needs to be.",
    outcome:
      "Material that gets kept on the desk instead of filed.",
    status: "placeholder",
  },
];

export const getProject = (slug: string) =>
  PROJECTS.find((project) => project.slug === slug);

/** The homepage shows three. The archive shows everything. */
export const SELECTED_PROJECTS = PROJECTS.slice(0, 3);

/**
 * The one the hero leads with.
 *
 * Deliberately not SELECTED_PROJECTS[0]: the hero and the first study sit
 * within one scroll of each other, and showing the same photograph twice in
 * that distance makes the archive look thinner than it is.
 */
export const HERO_PROJECT = PROJECTS[1];

/** Wraps, so the last case study leads back to the first. */
export function nextProject(slug: string): Project {
  const at = PROJECTS.findIndex((project) => project.slug === slug);
  return PROJECTS[(at + 1) % PROJECTS.length];
}
