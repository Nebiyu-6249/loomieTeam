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
 * Everything marked `status: "concept"` is standing in until real case study
 * material arrives, and the site says so out loud: every one of these carries
 * a "Concept study" label wherever it appears, on the card, in the archive and
 * at the top of the study itself. A visitor should never have to guess whether
 * a project on this page was commissioned. Replacing it means editing this
 * file and nothing else. Two rules held while writing it:
 *
 *   No client is named. These are project titles, not company names, and no
 *   record claims a relationship with a real business. `sector` describes the
 *   kind of work; that is all the site asserts.
 *
 *   No invented results. There are no percentages, no awards and no
 *   testimonials, because inventing those is the one thing placeholder copy
 *   must never do.
 */

export type ProjectStatus = "concept" | "commissioned";

/**
 * What the badge says. One constant, so the wording cannot drift between the
 * card, the archive row and the case study header.
 */
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  concept: "Concept study",
  commissioned: "Client project",
};

export interface ProjectImage {
  src: string;
  alt: string;
}

export interface Project {
  slug: string;
  /**
   * Archive numbering. Written down rather than derived, so adding a project
   * never renumbers the ones already published and linked to. Curating the
   * placeholder set is the one time it is edited by hand.
   */
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
      {
        src: "/images/work/sheet-grid.jpg",
        alt: "The drawing grid the identity and the website are both set on",
      },
      { src: "/images/work/structure-tall.jpg", alt: "The building's full elevation" },
    ],
    brief:
      "A practice with twenty years of built work and no consistent way of presenting it. Drawings, photography and written work each had their own conventions, and none of them agreed.",
    approach:
      "The identity was taken from the drawings rather than applied over them: the same line weights, the same annotation, the same margins. The website is built on that grid, so a project page and a drawing sheet are recognisably the same document.",
    outcome:
      "One system across drawings, print and the site. New work enters it without a redesign.",
    status: "concept",
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
      {
        src: "/images/work/sheet-mark.jpg",
        alt: "The mark on its construction geometry, with the aperture radius marked",
      },
    ],
    brief:
      "A maker working in steel and cast aluminium needed a mark that could be physically applied to the objects, not only printed beside them.",
    approach:
      "The mark was drawn at the size of a stamp first and scaled up afterwards, which is the opposite of the usual order and the reason it holds at twelve millimetres. Packaging uses uncoated board and a single ink.",
    outcome:
      "One mark, stamped into metal and printed on board, with no second version needed for small sizes.",
    status: "concept",
  },
  {
    slug: "signal",
    index: "03",
    title: "Signal",
    sector: "Software product",
    year: "2026",
    disciplines: ["Digital identity", "Website"],
    summary: "Interface and marketing drawn from the same set of parts.",
    cover: {
      src: "/images/work/sheet-structure.jpg",
      alt: "A page structure diagram: regions blocked out and annotated",
    },
    hero: {
      src: "/images/work/sheet-grid.jpg",
      alt: "A twelve-column layout grid with a page part-placed on it",
    },
    gallery: [
      {
        src: "/images/work/sheet-type.jpg",
        alt: "A type specimen showing the display face at three sizes",
      },
      {
        src: "/images/work/sheet-tone.jpg",
        alt: "A tonal ramp running from deep blue to warm off-white",
      },
    ],
    brief:
      "A product whose marketing site and application had been designed by different people at different times, and looked it.",
    approach:
      "A single component set — one type scale, one spacing unit, one tonal ramp — used for the interface, the site and the documentation. The system is published rather than described, so a new screen starts from it instead of beside it.",
    outcome:
      "A product that reads as one thing from the landing page to the settings screen.",
    status: "concept",
  },
  {
    slug: "quarry",
    index: "04",
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
      {
        src: "/images/work/sheet-tone.jpg",
        alt: "The tonal range the literature is printed within",
      },
    ],
    brief:
      "Sales material that specifiers were ignoring because it read as promotion rather than information.",
    approach:
      "The literature was rebuilt around the tables people actually use, with photography as evidence rather than decoration. Nothing is set larger than it needs to be.",
    outcome:
      "Material that gets kept on the desk instead of filed.",
    status: "concept",
  },
];

export const getProject = (slug: string) =>
  PROJECTS.find((project) => project.slug === slug);

/**
 * The homepage shows three. The archive shows all four.
 *
 * It was five. Marne came out after seeing the archive laid out: it was an
 * interiors study covered by canopy.jpg, and Northbank was an architecture
 * study covered by structure.jpg, and both crops are the same building from
 * the same source photograph. Two entries that look like one project shown
 * twice make an archive read as padding, and four studies that each look like
 * their own thing is a stronger claim than five that do not. Every remaining
 * cover comes from a different image.
 *
 * Three on the homepage is what fits its rhythm — wide, narrow, wide — without
 * the section turning into a grid. Nothing counts these anywhere else, so
 * adding a fifth means editing PROJECTS and nothing else.
 *
 * The hero deliberately takes none of them. It leads with the studio's own
 * brand sheet instead, so the first study a visitor sees is in Selected Work
 * rather than spent above it.
 */
export const SELECTED_PROJECTS = PROJECTS.slice(0, 3);

/** Wraps, so the last case study leads back to the first. */
export function nextProject(slug: string): Project {
  const at = PROJECTS.findIndex((project) => project.slug === slug);
  return PROJECTS[(at + 1) % PROJECTS.length];
}
