/**
 * The four things the studio sells.
 *
 * One sentence each. The previous copy explained the deliverable in three
 * clauses; the visual does that job better, and a homepage that reads like a
 * proposal document is a homepage nobody finishes.
 *
 * Imagery is the studio's own system plates. Each service is illustrated by the
 * artefact it actually produces — a type specimen for identity, a tonal ramp
 * for web identity, a campaign in three formats for marketing, a built page for
 * websites — because a photograph of concrete standing in for marketing design
 * told a visitor nothing about marketing design.
 *
 * The section reads them as chapters rather than as a gallery, so `span` is
 * gone: the composition no longer varies per service, one stage shows whichever
 * service is active, and the varying frame sizes were the thing that made this
 * read as a second image grid straight after the work archive.
 *
 * `hero` is the same idea one step earlier. The hero's service index drives the
 * visual beside it, so pointing at a service in the index shows the artefact
 * that service makes. The index and the image used to be two unrelated things
 * sharing a viewport; now the index is the control and the image is the state.
 * Identity is the one service whose two views differ — the hero leads with the
 * mark and the section shows the type — so the homepage's resting state has no
 * repeated image, and every match a visitor does see is one they caused.
 */

export interface Service {
  number: string;
  title: string;
  /** One sentence. If it needs two, the visual is not doing enough. */
  summary: string;
  image: { src: string; alt: string };
  /** What the hero shows while this service is the active one. */
  hero: {
    src: string;
    alt: string;
    /** The small header above the hero image. Three terms, widest first. */
    label: string;
    /** One short line, and only shown while the service is active. */
    note: string;
  };
}

export const SERVICES: Service[] = [
  {
    number: "01",
    title: "Identity",
    summary: "Marks and systems made to stay recognisable.",
    image: {
      src: "/images/work/sheet-type.jpg",
      alt: "A type specimen sheet showing the display face at three sizes",
    },
    hero: {
      src: "/images/work/sheet-mark.jpg",
      alt: "Loomie's mark drawn on its construction geometry, with the aperture radius and overall measures marked",
      label: "Identity / Mark / System",
      note: "Drawn from its own geometry.",
    },
  },
  {
    number: "02",
    title: "Web identity",
    summary: "Rules for type, colour and layout across digital surfaces.",
    image: {
      src: "/images/work/sheet-tone.jpg",
      alt: "A tonal ramp running from deep blue through to warm off-white",
    },
    hero: {
      src: "/images/work/sheet-tone.jpg",
      alt: "A tonal ramp running from deep blue through to warm off-white, with each step named and specified",
      label: "Web identity / Type / Tone",
      note: "One scale, one ramp, everywhere.",
    },
  },
  {
    number: "03",
    title: "Marketing design",
    summary: "Campaign work built from the brand, not beside it.",
    image: {
      src: "/images/work/sheet-campaign.jpg",
      alt: "A campaign sheet: one line and one mark set as a poster, a square and a banner",
    },
    hero: {
      src: "/images/work/sheet-campaign.jpg",
      alt: "A campaign sheet: one line and one mark set as a poster, a square and a banner, with the measurements they share",
      label: "Marketing / Campaign / Formats",
      note: "One line, every format.",
    },
  },
  {
    number: "04",
    title: "Websites",
    summary: "Fast, legible sites designed to keep growing.",
    image: {
      src: "/images/work/sheet-interface.jpg",
      alt: "A built page shown at desktop and phone width: navigation, headline, photography and a run of studies",
    },
    hero: {
      src: "/images/work/sheet-interface.jpg",
      alt: "A built page shown at desktop and phone width: navigation, headline, photography and a run of studies",
      label: "Websites / Layout / Interface",
      note: "The system, actually built.",
    },
  },
];

/** The values the booking form offers. Same source, so they cannot drift. */
export const SERVICE_OPTIONS = SERVICES.map((service) => service.title);
