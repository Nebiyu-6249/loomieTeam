"use client";

import React from "react";
import Image from "next/image";
import type { Partner } from "@/lib/content-types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The partner belt, deliberately quiet.
 *
 * It used to open with "TRUSTED BY" set in 6xl black uppercase above six
 * invented names. Placeholder names cannot carry a trust claim, and setting
 * them as though they could is the least honest thing the page could do. The
 * heading is now the same small label every other section uses, the names run
 * at reading size, and the belt sits low in the page where a partner list
 * belongs.
 *
 * Partners come from the database. A partner with an uploaded logo shows it; a
 * partner without one gets a mark drawn from primitives in the current text
 * colour, so nothing on this belt is ever a third party's trademark that
 * somebody did not deliberately upload.
 */

const KINDS = ["polygon", "circle", "bars", "path", "pair"] as const;
type MarkKind = (typeof KINDS)[number];

/**
 * Which of the five shapes a partner gets.
 *
 * Derived from the name rather than stored, because the shape is decoration
 * for a row that has no logo yet — not a fact about the partner. Deterministic,
 * so a given name always draws the same mark and the belt does not reshuffle
 * itself between renders.
 */
function markFor(name: string): MarkKind {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return KINDS[hash % KINDS.length];
}

function Mark({ kind }: { kind: MarkKind }) {
  switch (kind) {
    case "polygon":
      return <polygon points="10,4 18,20 2,20" className="fill-current" />;
    case "circle":
      return (
        <circle cx="10" cy="12" r="8" className="fill-none stroke-current" strokeWidth="2.5" />
      );
    case "path":
      return (
        <path d="M2 20 L10 4 L18 20" className="fill-none stroke-current" strokeWidth="2.5" />
      );
    case "pair":
      return (
        <>
          <circle cx="7" cy="12" r="5" className="fill-current" />
          <circle cx="14" cy="12" r="5" className="fill-none stroke-current" strokeWidth="2.5" />
        </>
      );
    default:
      return (
        <>
          <rect x="2" y="10" width="16" height="4" className="fill-current" />
          <rect x="8" y="4" width="4" height="16" className="fill-current" />
        </>
      );
  }
}

function Wordmark({ partner }: { partner: Partner }) {
  return (
    <div className="flex items-center gap-3 mr-14 shrink-0">
      {partner.logo ? (
        <span className="relative block w-5 h-5">
          <Image
            src={partner.logo.src}
            alt=""
            fill
            sizes="20px"
            className="object-contain"
          />
        </span>
      ) : (
        <svg viewBox="0 0 20 24" className="w-4 h-5" aria-hidden="true">
          <Mark kind={markFor(partner.name)} />
        </svg>
      )}
      <span className="font-mono text-sm uppercase tracking-[0.18em] whitespace-nowrap">
        {partner.name}
      </span>
    </div>
  );
}

export function PartnersMarquee({ partners }: { partners: Partner[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (partners.length === 0) return null;

  return (
    <section className="py-16 md:py-20 border-t border-border-custom overflow-hidden">
      <div className="max-w-[1700px] mx-auto px-6 md:px-12 mb-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          Partners
        </h2>
      </div>

      {/* Reduced motion gets a wrapped list rather than a stopped belt: a
          marquee frozen mid-scroll is a row of half-visible words. */}
      {prefersReducedMotion ? (
        <ul className="max-w-[1700px] mx-auto px-6 md:px-12 flex flex-wrap gap-x-10 gap-y-4 text-foreground-secondary">
          {partners.map((partner) => (
            <li key={partner.id}>
              <Wordmark partner={partner} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="group w-full select-none">
          <div
            className="animate-marquee-smooth items-center text-foreground-secondary transition-opacity duration-[400ms] group-hover:opacity-100 group-hover:[animation-play-state:paused] opacity-70"
            aria-hidden="true"
          >
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <Wordmark key={`${partner.id}-${index}`} partner={partner} />
            ))}
          </div>

          <p className="sr-only">
            Partners: {partners.map((partner) => partner.name).join(", ")}.
          </p>
        </div>
      )}
    </section>
  );
}
