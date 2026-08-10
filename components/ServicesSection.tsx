"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface Service {
  number: string;
  title: string;
  description: string;
}

const SERVICES: Service[] = [
  {
    number: "01",
    title: "Logo design",
    description:
      "A mark that still reads at 24 pixels, on a business card, and stitched onto a shirt. You get the full file set, not a single PNG.",
  },
  {
    number: "02",
    title: "Web brand identity",
    description:
      "Your colours, type and spacing written down as actual rules, so the website, the deck and the Instagram grid stop looking like three different companies.",
  },
  {
    number: "03",
    title: "Marketing design",
    description:
      "Campaign and social assets built from your own system, so the fortieth post still looks like it came from the same place as the first.",
  },
  {
    number: "04",
    title: "Website design",
    description:
      "Sites that load fast, read properly on a phone, and do not fall apart the first time you add a page.",
  },
];

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      itemsRef.current.forEach((item, index) => {
        if (!item) return;

        ScrollTrigger.create({
          trigger: item,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => setActiveIndex(index),
          onEnterBack: () => setActiveIndex(index),
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
    >
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-3">
        01 / Services
      </span>

      <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-foreground mb-16">
        Services
      </h2>

      <div className="flex flex-col gap-6">
        {SERVICES.map((service, index) => {
          const isActive = activeIndex === index;

          return (
            <div
              key={service.number}
              ref={(el) => {
                itemsRef.current[index] = el;
              }}
              className={`sticky top-28 rounded-none border p-8 md:p-14 transition-all duration-500 ${
                isActive
                  ? "bg-foreground text-background border-foreground opacity-100"
                  : "bg-surface-card border-border-custom opacity-60"
              }`}
              style={{ zIndex: index + 10 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                <span
                  className={`lg:col-span-2 font-mono text-sm font-bold uppercase tracking-widest ${
                    isActive ? "text-background" : "text-foreground-secondary"
                  }`}
                >
                  {service.number}
                </span>

                <h3
                  className={`lg:col-span-5 text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.95] ${
                    isActive ? "text-background" : "text-foreground"
                  }`}
                >
                  {service.title}
                </h3>

                <p
                  className={`lg:col-span-5 text-base md:text-lg leading-relaxed ${
                    isActive ? "text-background/80" : "text-foreground-secondary"
                  }`}
                >
                  {service.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
