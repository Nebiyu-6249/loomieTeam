import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Engagement, Sector } from "@/lib/content-types";

/**
 * Who the studio works with, without inventing anyone it works with.
 *
 * The page used to be four case studies attributed to named companies in named
 * cities — "AURA LUXURY / PARIS" and so on — none of which exist. Those went.
 * What replaced them was honest but thin: a two-column definition list of four
 * sector names with one line each, which is a table of contents for a page that
 * never arrived.
 *
 * This is the page. Each sector gets a full editorial panel: the number, the
 * name, what that sector is usually carrying, the problem it actually presents,
 * and an artefact drawn for it — a line-weight ladder and a plan for
 * architecture, a mark stepped down to its minimum for objects, one component
 * in three housings for hardware, a specification table for trade. The panels
 * alternate side so the page reads down rather than scanning across, and the
 * visuals alternate paper and ink so the rhythm is in the material as well as
 * the layout.
 *
 * Nothing here claims a client. A sector is a description of the studio's own
 * setup, which it can assert; a client list is a description of other people's
 * decisions, which it cannot until they are made.
 *
 * Server component. No state, no scroll behaviour, no motion beyond the hover
 * on the images — this page is read, not operated.
 */

function SectorPanel({ sector, index }: { sector: Sector; index: number }) {
  const flipped = index % 2 === 1;

  return (
    <article className="grid grid-cols-12 items-center gap-x-8 gap-y-8 border-t border-border-custom py-12 md:py-16">
      <div
        className={`col-span-12 md:col-span-6 ${
          flipped ? "md:order-2 md:col-start-7" : "md:order-1"
        }`}
      >
        {sector.visual ? (
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-card">
            <Image
              src={sector.visual.src}
              alt={sector.visual.alt}
              fill
              quality={82}
              loading={index === 0 ? undefined : "lazy"}
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>

      <div
        className={`col-span-12 md:col-span-5 ${
          flipped ? "md:order-1 md:col-start-1" : "md:order-2 md:col-start-8"
        }`}
      >
        <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
          {sector.number}
        </span>

        <h3 className="mt-4 font-display font-normal text-3xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-foreground">
          {sector.name}
        </h3>

        <p className="mt-5 max-w-md text-base md:text-lg leading-snug text-foreground-secondary">
          {sector.summary}
        </p>

        {/* The problem, set apart. It is the reason the sector is on the page
            at all, and running it into the paragraph above loses it. */}
        <div className="mt-7 border-l border-border-custom pl-5">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground-secondary">
            What it usually is
          </span>
          <p className="mt-2 max-w-sm text-base leading-snug text-foreground">
            {sector.problem}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ClientsSection({
  sectors,
  engagements,
}: {
  sectors: Sector[];
  engagements: Engagement[];
}) {
  return (
    <>
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto py-12 md:py-16">
        <p className="max-w-2xl text-lg md:text-2xl leading-snug text-foreground">
          Loomie works with people who make things — buildings, objects,
          products — and need them to be understood.
        </p>
        <p className="mt-6 max-w-xl text-sm md:text-base leading-snug text-foreground-secondary">
          Four sectors, and the same problem in each: work that is already good
          arriving in a form nobody can read.
        </p>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-12 md:pb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-4">
          Sectors
        </h2>

        {sectors.map((sector, index) => (
          <SectorPanel key={sector.slug} sector={sector} index={index} />
        ))}
      </section>

      {/* ── Engagements, as a comparison band ──────────────────────────────
          Three shapes side by side with the same four rows each, so they can
          be compared down a column rather than read as three paragraphs. */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-20 md:pb-24">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-10">
          How we work
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          {engagements.map((engagement) => (
            <li
              key={engagement.number}
              className="flex flex-col border-t border-foreground/25 pt-6"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
                  {engagement.number}
                </span>
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground">
                  {engagement.duration}
                </span>
              </div>

              <h3 className="mt-5 font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
                {engagement.title}
              </h3>

              <p className="mt-4 text-sm md:text-base leading-snug text-foreground-secondary">
                {engagement.description}
              </p>
            </li>
          ))}
        </ol>

        <Link
          href="/contact"
          className="inline-flex items-baseline gap-3 mt-14 font-sans text-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
            Book an intro call
          </span>
        </Link>
      </section>
    </>
  );
}
