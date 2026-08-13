/**
 * The four things the studio sells.
 *
 * One sentence each. The previous copy explained the deliverable in three
 * clauses; the visual does that job better, and a homepage that reads like a
 * proposal document is a homepage nobody finishes.
 *
 * Imagery is drawn from the same graded set as the work, so a service and a
 * project look like they came out of the same studio.
 */

export interface Service {
  number: string;
  title: string;
  /** One sentence. If it needs two, the visual is not doing enough. */
  summary: string;
  image: { src: string; alt: string };
  /** Varies the composition without breaking the system. */
  span: "wide" | "tall" | "square";
}

export const SERVICES: Service[] = [
  {
    number: "01",
    title: "Identity",
    summary: "A mark that holds at twelve millimetres and at twelve metres.",
    image: {
      src: "/images/work/form.jpg",
      alt: "A faceted metal form casting hard shadows",
    },
    span: "tall",
  },
  {
    number: "02",
    title: "Web identity",
    summary:
      "A practical system for type, colour, layout and digital application.",
    image: {
      src: "/images/work/keys.jpg",
      alt: "A close crop of controls and keys",
    },
    span: "square",
  },
  {
    number: "03",
    title: "Marketing design",
    summary: "Campaign work built from your system, not beside it.",
    image: {
      src: "/images/work/concrete.jpg",
      alt: "Concrete forms meeting at an angle",
    },
    span: "square",
  },
  {
    number: "04",
    title: "Websites",
    summary: "Fast, legible, and still standing after the tenth new page.",
    image: {
      src: "/images/work/structure.jpg",
      alt: "A low building seen through trees",
    },
    span: "wide",
  },
];

/** The values the booking form offers. Same source, so they cannot drift. */
export const SERVICE_OPTIONS = SERVICES.map((service) => service.title);
