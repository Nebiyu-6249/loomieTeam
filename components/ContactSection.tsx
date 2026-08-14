"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { BookingPanel } from "./BookingPanel";
import { SocialLinks } from "./SocialLinks";
import type { Service, Settings, SocialLink } from "@/lib/content-types";

/**
 * Start a project: two ways in, and nothing else.
 *
 * The page used to lead with a live Dubai clock. It looked good and it asked
 * the visitor to do the timezone arithmetic themselves, which is work the
 * computer should be doing. The clock is gone; the booking panel does the
 * conversion and shows the studio's time alongside it.
 *
 * ── PLACEHOLDER COPY ─────────────────────────────────────────────────────
 * The FAQ answers are structural rather than specific. No price, turnaround
 * or client claim is stated, because none have been supplied.
 */

const FAQS = [
  {
    question: "What does a project cost?",
    answer:
      "It depends on how much there is to make. You get a fixed price before any work starts, not an hourly rate that moves.",
  },
  {
    question: "How long does it take?",
    answer:
      "A schedule comes with the quote, and it lists what we owe you and what you owe us on each date.",
  },
  {
    question: "Do you work with clients outside the studio's timezone?",
    answer:
      "Yes. The times above are already converted to yours, and most of the work runs on email between calls.",
  },
  {
    question: "What do you need from me to start?",
    answer:
      "What you sell, who buys it, anything we should keep, and one person who can approve work. The last one saves the most time.",
  },
];

export function ContactSection({
  services,
  settings,
  socials,
}: {
  services: Service[];
  settings: Settings;
  socials: SocialLink[];
}) {
  return (
    <section className="pt-32 md:pt-40 pb-24 md:pb-32 px-6 md:px-12 max-w-[1700px] mx-auto">
      <div className="grid grid-cols-12 gap-x-8 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <h1 className="font-display font-normal text-[12vw] sm:text-6xl lg:text-7xl leading-[0.9] tracking-[-0.03em] text-foreground">
            Start a project
          </h1>

          <p className="mt-6 max-w-sm text-base leading-snug text-foreground-secondary">
            {settings.availability_text}
          </p>

          {/* The email path stays obvious, and stays second. The address is a
              setting rather than a string in this file, so changing it is one
              edit in the admin instead of a deploy. */}
          <a
            href={`mailto:${settings.contact_email}`}
            className="group mt-8 flex items-center justify-between gap-6 border-t border-b border-border-custom py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <span>
              <span className="block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                Prefer email?
              </span>
              <span className="mt-1 block text-base md:text-lg text-foreground break-all">
                {settings.contact_email}
              </span>
            </span>
            <ArrowUpRight className="w-5 h-5 shrink-0 text-foreground transition-transform duration-[250ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <SocialLinks links={socials} className="mt-12" />
        </div>

        <div className="col-span-12 lg:col-span-7 lg:col-start-6 min-w-0">
          <BookingPanel services={services} />
        </div>
      </div>

      <div className="mt-20 md:mt-24 grid grid-cols-12">
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-8">
            Before you write
          </h2>

          <div className="border-t border-border-custom">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group border-b border-border-custom">
                <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none text-base md:text-xl text-foreground transition-colors duration-[250ms] hover:text-foreground-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-mono text-lg leading-none text-foreground-secondary transition-transform duration-[250ms] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-7 pr-10 max-w-2xl text-sm md:text-base leading-snug text-foreground-secondary">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
