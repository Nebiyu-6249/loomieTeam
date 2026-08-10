"use client";

import React from "react";
import Image from "next/image";
import { BlurText } from "./BlurText";

/**
 * PLACEHOLDER COPY — studio history and figures below are deliberately
 * non-specific. No founding dates, headcounts or client claims are stated
 * beyond the existing "EST. 2026" placeholder already used elsewhere.
 */
const TIMELINE = [
  {
    number: "01",
    title: "It starts with a conversation",
    body: "Before anything gets designed, we work out what you actually sell, who buys it, and what is currently getting in the way. Most of the useful decisions get made here.",
  },
  {
    number: "02",
    title: "Then it gets written down",
    body: "Colours, type, spacing and tone become rules on a page rather than opinions in someone's head. That is what stops the website, the deck and the social grid drifting apart.",
  },
  {
    number: "03",
    title: "Then it gets built",
    body: "Design and build happen together, not in sequence, so nothing gets designed that cannot be made and nothing gets made that nobody designed.",
  },
];

export function StorySection() {
  // The heading is the only animated element here and BlurText owns it, so
  // this section carries no GSAP context of its own.
  return (
    <section
      id="story"
      className="scroll-mt-28 py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto"
    >
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
        01 / Story
      </span>

      <BlurText
        as="h2"
        text="How the work gets made"
        className="font-display font-normal text-4xl sm:text-6xl md:text-7xl tracking-[-0.02em] text-foreground leading-[0.95] max-w-4xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mt-16 items-start">
        <div className="lg:col-span-6">
          <div className="w-full aspect-[4/5] relative overflow-hidden rounded-none bg-surface-card border border-border-custom shadow-2xl">
            <Image
              src="/images/project-editorial.jpg"
              alt="LOOMIE studio process"
              fill
              loading="lazy"
              quality={80}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover rounded-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col">
          <p className="text-base sm:text-lg text-foreground-secondary leading-relaxed mb-12 max-w-xl">
            LOOMIE is a small design studio. The work is brand identity and the
            websites that carry it. There is no account layer between you and
            the people doing the work, which is the main reason things move.
          </p>

          <div className="border-t border-border-custom">
            {TIMELINE.map((step) => (
              <div
                key={step.number}
                className="py-8 border-b border-border-custom"
              >
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
                  {step.number}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mt-3 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-foreground-secondary leading-relaxed max-w-xl">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
