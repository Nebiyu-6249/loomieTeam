import React from "react";
import Link from "next/link";
import { ENGAGEMENTS, SECTORS } from "@/lib/clients";

/**
 * The clients page, without inventing any clients.
 *
 * It used to be four case studies attributed to named companies in named
 * cities — "AURA LUXURY / PARIS" and so on — none of which exist. Those are
 * gone. What remains is true: the sectors the studio is set up for, and the
 * three shapes an engagement actually takes.
 *
 * Content lives in lib/clients.ts. When real clients arrive they replace
 * SECTORS; ENGAGEMENTS is studio policy and stays.
 */

export function ClientsSection() {
  return (
    <>
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto py-12 md:py-16">
        <p className="max-w-xl text-lg md:text-xl leading-snug text-foreground">
          Loomie works with people who make things — buildings, objects,
          products — and need them to be understood.
        </p>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-16 md:pb-20">
        {/* The page's h1 is now "Who we work with", which is what this
            heading used to say, so it names its own subject instead. */}
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-10">
          Sectors
        </h2>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {SECTORS.map((sector) => (
            <div
              key={sector.id}
              className="border-t border-border-custom py-7 md:py-9"
            >
              <dt className="font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
                {sector.label}
              </dt>
              <dd className="mt-3 text-sm text-foreground-secondary">
                {sector.note}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-20 md:pb-24">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-10">
          How we work
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-x-12">
          {ENGAGEMENTS.map((engagement) => (
            <li
              key={engagement.number}
              className="border-t border-border-custom py-7 md:py-9"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
                  {engagement.number}
                </span>
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                  {engagement.duration}
                </span>
              </div>
              <h3 className="mt-4 font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
                {engagement.title}
              </h3>
              <p className="mt-3 text-sm text-foreground-secondary">
                {engagement.summary}
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
