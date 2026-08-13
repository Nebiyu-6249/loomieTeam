/**
 * Who the studio works with, and how.
 *
 * ── PLACEHOLDER CONTENT ──────────────────────────────────────────────────
 * Real client information has not been supplied. Rather than invent company
 * names, cities and testimonials — which is what the previous version of the
 * clients page did, in four different places — this describes the shape of
 * the work: the sectors, and the three ways an engagement usually runs.
 *
 * None of it claims a relationship with a named business, so it can stay up
 * without being untrue. When real clients arrive, replace SECTORS with them
 * and keep ENGAGEMENTS, which is studio policy rather than placeholder.
 */

export interface Sector {
  id: string;
  label: string;
  /** What the studio tends to be asked for here. One line. */
  note: string;
}

export const SECTORS: Sector[] = [
  {
    id: "architecture",
    label: "Architecture and interiors",
    note: "Practices with more built work than they can present.",
  },
  {
    id: "objects",
    label: "Objects and manufacturing",
    note: "Makers who need a mark that survives the material.",
  },
  {
    id: "hardware",
    label: "Hardware and software",
    note: "Products designed by several teams that should look like one.",
  },
  {
    id: "trade",
    label: "Trade and supply",
    note: "Technical buyers who want information, not persuasion.",
  },
];

export interface Engagement {
  number: string;
  title: string;
  duration: string;
  summary: string;
}

/** Studio policy rather than placeholder: these are real and can stay. */
export const ENGAGEMENTS: Engagement[] = [
  {
    number: "01",
    title: "Identity",
    duration: "4–6 weeks",
    summary: "Mark, type, colour and the rules that keep them together.",
  },
  {
    number: "02",
    title: "Identity and site",
    duration: "8–12 weeks",
    summary: "The system, then the place it lives.",
  },
  {
    number: "03",
    title: "Retained",
    duration: "Monthly",
    summary: "Ongoing campaign and product work inside an existing system.",
  },
];
