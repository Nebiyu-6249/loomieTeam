"use client";

import React from "react";
import Image from "next/image";
import { SERVICES, type Service } from "@/lib/services";

/**
 * Four services, each with a picture.
 *
 * The previous version was a sticky-scrolled list of four numbered paragraphs
 * — the same layout four times, differing only in wording, explaining in
 * three clauses what an image says at a glance. Each service now gets a frame
 * from the same graded set as the work, one sentence, and a different
 * proportion, so the section has rhythm without four different designs.
 *
 * No cards. There is no panel, no border and no shadow around any of these:
 * the image is the object.
 */

const FRAME = {
  wide: { span: "md:col-span-7", aspect: "aspect-[16/10]", offset: "" },
  tall: { span: "md:col-span-5", aspect: "aspect-[3/4]", offset: "" },
  square: { span: "md:col-span-4", aspect: "aspect-square", offset: "md:mt-16" },
} as const;

function ServiceEntry({ service }: { service: Service }) {
  const frame = FRAME[service.span];

  return (
    <article className={`col-span-12 ${frame.span} ${frame.offset}`}>
      <div className={`relative w-full ${frame.aspect} overflow-hidden bg-surface-card`}>
        <Image
          src={service.image.src}
          alt={service.image.alt}
          fill
          quality={80}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover"
        />
      </div>

      <div className="mt-5 flex items-baseline gap-4">
        <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
          {service.number}
        </span>
        <h3 className="font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
          {service.title}
        </h3>
      </div>

      <p className="mt-3 max-w-sm text-sm leading-snug text-foreground-secondary">
        {service.summary}
      </p>
    </article>
  );
}

export function ServicesSection() {
  return (
    <section
      id="services"
      className="px-6 md:px-12 max-w-[1700px] mx-auto py-16 md:py-22 border-t border-border-custom"
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-10 md:mb-14">
        What we do
      </h2>

      <div className="grid grid-cols-12 gap-x-8 gap-y-14 md:gap-y-16">
        {SERVICES.map((service) => (
          <ServiceEntry key={service.number} service={service} />
        ))}
      </div>
    </section>
  );
}
