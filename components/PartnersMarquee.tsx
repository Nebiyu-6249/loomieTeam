"use client";

import React from "react";

interface PartnerLogo {
  id: string;
  name: string;
  /** Inline mark drawn in the current text colour, sized against a 40px band. */
  mark: React.ReactNode;
}

/**
 * PLACEHOLDER DATA — awaiting real client logos from the founder.
 *
 * Every name and mark below is invented for layout purposes. No third-party
 * logo, wordmark or trademark is referenced, downloaded or embedded here,
 * and none should be added to this array. Replace the whole array when real
 * assets arrive.
 */
const PARTNER_LOGOS: PartnerLogo[] = [
  {
    id: "northwind",
    name: "NORTHWIND",
    mark: <polygon points="10,4 18,20 2,20" className="fill-current" />,
  },
  {
    id: "atlas-co",
    name: "ATLAS CO",
    mark: (
      <circle
        cx="10"
        cy="12"
        r="8"
        className="fill-none stroke-current"
        strokeWidth="2.5"
      />
    ),
  },
  {
    id: "meridian",
    name: "MERIDIAN",
    mark: (
      <>
        <rect x="2" y="4" width="16" height="16" className="fill-current" />
        <rect x="7" y="9" width="6" height="6" className="fill-background" />
      </>
    ),
  },
  {
    id: "kestrel",
    name: "KESTREL",
    mark: (
      <path
        d="M2 20 L10 4 L18 20"
        className="fill-none stroke-current"
        strokeWidth="2.5"
      />
    ),
  },
  {
    id: "halvard",
    name: "HALVARD",
    mark: (
      <>
        <rect x="2" y="10" width="16" height="4" className="fill-current" />
        <rect x="8" y="4" width="4" height="16" className="fill-current" />
      </>
    ),
  },
  {
    id: "oakline",
    name: "OAKLINE",
    mark: (
      <>
        <circle cx="7" cy="12" r="5" className="fill-current" />
        <circle cx="14" cy="12" r="5" className="fill-none stroke-current" strokeWidth="2.5" />
      </>
    ),
  },
];

function PartnerWordmark({ logo }: { logo: PartnerLogo }) {
  return (
    <div className="flex items-center gap-3.5 mr-16 shrink-0">
      <svg viewBox="0 0 20 24" className="w-5 h-6" aria-hidden="true">
        {logo.mark}
      </svg>
      <span className="font-sans font-black text-2xl md:text-3xl tracking-tight uppercase whitespace-nowrap">
        {logo.name}
      </span>
    </div>
  );
}

export function PartnersMarquee() {
  return (
    <section className="py-24 md:py-32 border-t border-border-custom overflow-hidden">
      <div className="max-w-[1700px] mx-auto px-6 md:px-12 mb-12">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-3">
          Partnerships
        </span>
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-foreground">
          Trusted by
        </h2>
      </div>

      {/*
        Greyscale by default, colour and paused on hover. The palette is
        monochrome today so the visible change is the opacity lift; the
        grayscale filter starts doing real work the moment coloured client
        logos replace the placeholders above.
      */}
      <div className="group w-full py-6 select-none">
        <div
          className="animate-marquee-smooth items-center text-foreground opacity-40 grayscale transition-[opacity,filter] duration-500 group-hover:opacity-100 group-hover:grayscale-0 group-hover:[animation-play-state:paused]"
          aria-hidden="true"
        >
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS].map(
            (logo, index) => (
              <PartnerWordmark key={`${logo.id}-${index}`} logo={logo} />
            )
          )}
        </div>

        {/* The belt is decorative; this is the accessible reading of it. */}
        <p className="sr-only">
          Placeholder partner names: {PARTNER_LOGOS.map((l) => l.name).join(", ")}.
        </p>
      </div>
    </section>
  );
}
