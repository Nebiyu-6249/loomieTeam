"use client";

import React from "react";
import { LoomieEyes } from "./LoomieEyes";
import { BlurText } from "./BlurText";

const SPECS = [
  { label: "Construction", value: "Pill + two apertures" },
  { label: "Aperture ratio", value: "0.53 of cap height" },
  { label: "Minimum size", value: "24 px wide" },
  { label: "Colour", value: "One colour, either polarity" },
];

export function IdentitySection() {
  return (
    <section
      id="identity"
      className="scroll-mt-28 py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
    >
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
        03 / Identity
      </span>

      <BlurText
        as="h2"
        text="The mark"
        className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase text-foreground leading-[0.95] max-w-4xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mt-16 items-center">
        {/* Blueprint */}
        <div className="lg:col-span-7 p-10 md:p-16 rounded-none bg-surface-card border border-border-custom flex items-center justify-center">
          <LoomieEyes
            className="w-full max-w-[340px] h-auto"
            label="The LOOMIE mark: a pill containing two apertures that follow the cursor"
          />
        </div>

        {/* Specs */}
        <div className="lg:col-span-5">
          <p className="text-base sm:text-lg text-foreground-secondary leading-relaxed mb-10 max-w-xl">
            Two apertures in a rounded field. It reads as a pair of eyes at
            large sizes and as a single solid shape at small ones, which is the
            only test a mark really has to pass.
          </p>

          <dl className="border-t border-border-custom">
            {SPECS.map((spec) => (
              <div
                key={spec.label}
                className="py-5 border-b border-border-custom flex items-baseline justify-between gap-6 font-mono text-xs uppercase tracking-widest"
              >
                <dt className="text-foreground-secondary">{spec.label}</dt>
                <dd className="text-foreground font-bold text-right">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
