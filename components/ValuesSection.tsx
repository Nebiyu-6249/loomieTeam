"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BlurText } from "./BlurText";

const VALUES = [
  {
    number: "01",
    title: "Legible before clever",
    body: "If a mark only works at one size, in one colour, on one background, it is a picture rather than an identity. Everything gets tested small and in one colour first.",
  },
  {
    number: "02",
    title: "Rules, not vibes",
    body: "A brand that lives in someone's taste dies when that person leaves. Written rules survive handover, freelancers and the fortieth social post.",
  },
  {
    number: "03",
    title: "Built to be added to",
    body: "You will want a page nobody planned for. The system should absorb that without a redesign, which is a decision made at the start or not at all.",
  },
  {
    number: "04",
    title: "Fast is a feature",
    body: "A site that takes four seconds to load has already lost the argument. Performance is treated as part of the design, not a thing to fix afterwards.",
  },
];

/**
 * PLACEHOLDER DATA — awaiting real archive pieces from the founder.
 * Titles and mediums here are descriptive, not claims about real projects.
 */
/**
 * Three pieces, three weights. An archive wall is not a feature row: three
 * equal columns of equal height is the layout that makes a page look
 * generated rather than laid out, so the pieces differ in span, in proportion
 * and in where they sit vertically.
 */
const ARCHIVE_PIECES = [
  {
    id: "p1",
    title: "Monochrome Editorial Grid",
    medium: "Print / Variable type",
    image: "/images/project-editorial.jpg",
    span: "md:col-span-5",
    aspect: "aspect-[3/4]",
    offset: "",
  },
  {
    id: "p2",
    title: "Tactile Packaging Identity",
    medium: "Packaging / Matte stock",
    image: "/images/project-packaging.jpg",
    span: "md:col-span-4",
    aspect: "aspect-[4/5]",
    offset: "md:mt-20",
  },
  {
    id: "p3",
    title: "Spatial Pavilion Study",
    medium: "Spatial / Concrete",
    image: "/images/project-spatial.jpg",
    span: "md:col-span-3",
    aspect: "aspect-[2/3]",
    offset: "md:mt-8",
  },
];

export function ValuesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (listRef.current) {
          gsap.fromTo(
            listRef.current.children,
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: listRef.current,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      });
    }, sectionRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="values"
      ref={sectionRef}
      className="scroll-mt-28 py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
    >
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
        02 / Values
      </span>

      <BlurText
        as="h2"
        text="What we hold to"
        className="font-display font-normal text-4xl sm:text-6xl md:text-7xl tracking-[-0.02em] text-foreground leading-[0.95] max-w-4xl"
      />

      <div
        ref={listRef}
        className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border-custom border border-border-custom mt-16"
      >
        {VALUES.map((value) => (
          <div
            key={value.number}
            className="bg-surface-card p-8 md:p-12 flex flex-col"
          >
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
              {value.number}
            </span>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground mt-4 mb-4">
              {value.title}
            </h3>
            <p className="text-sm md:text-base text-foreground-secondary leading-relaxed">
              {value.body}
            </p>
          </div>
        ))}
      </div>

      {/* Archive pieces */}
      <div className="mt-24">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-8">
          Archive
        </span>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {ARCHIVE_PIECES.map((piece, index) => (
            <figure
              key={piece.id}
              className={`group flex flex-col ${piece.span} ${piece.offset}`}
            >
              <div
                className={`w-full ${piece.aspect} relative overflow-hidden bg-surface-card border border-border-custom shadow-xl transition-colors duration-500 group-hover:border-foreground`}
              >
                <Image
                  src={piece.image}
                  alt={piece.title}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  quality={80}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>

              <figcaption className="pt-4 flex flex-col gap-1 font-mono text-xs uppercase tracking-widest">
                <span className="text-foreground font-bold">{piece.title}</span>
                <span className="text-foreground-secondary">{`// ${piece.medium}`}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
