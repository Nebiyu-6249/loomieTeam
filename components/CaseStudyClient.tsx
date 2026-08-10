"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import type { ProjectDetail } from "@/app/work/[slug]/page";

const SECTIONS = [
  { key: "challenge", number: "01", label: "The Challenge" },
  { key: "solution", number: "02", label: "The Solution" },
  { key: "impact", number: "03", label: "The Impact" },
] as const;

export function CaseStudyClient({ project }: { project: ProjectDetail }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (heroImageRef.current) {
          gsap.fromTo(
            heroImageRef.current,
            { scale: 1.08 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: heroImageRef.current,
                start: "top top",
                end: "bottom top",
                scrub: 0.6,
              },
            }
          );
        }
      });
    }, containerRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef}>
      {/* Hero */}
      <section className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
          Case Study / {project.year}
        </span>

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-foreground leading-[0.95] max-w-5xl">
          {project.title}
        </h1>

        <p className="mt-6 text-base sm:text-lg text-foreground-secondary max-w-2xl leading-relaxed">
          {project.subtitle}
        </p>

        <div className="w-full aspect-[16/9] relative overflow-hidden rounded-none bg-surface-card border border-border-custom shadow-2xl mt-14">
          <div ref={heroImageRef} className="absolute inset-0">
            <Image
              src={project.heroImage}
              alt={project.title}
              fill
              priority
              quality={85}
              sizes="(max-width: 1700px) 100vw, 1700px"
              className="object-cover rounded-none"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Metadata strip */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto mt-14">
        <dl className="grid grid-cols-1 md:grid-cols-3 border-y border-border-custom divide-y md:divide-y-0 md:divide-x divide-border-custom">
          <div className="p-8 md:p-10">
            <dt className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
              Client
            </dt>
            <dd className="mt-3 text-lg md:text-xl font-bold text-foreground">
              {project.client}
            </dd>
          </div>

          <div className="p-8 md:p-10">
            <dt className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
              Year
            </dt>
            <dd className="mt-3 text-lg md:text-xl font-bold text-foreground font-mono">
              {project.year}
            </dd>
          </div>

          <div className="p-8 md:p-10">
            <dt className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
              Services
            </dt>
            <dd className="mt-3 flex flex-wrap gap-2">
              {project.services.map((service) => (
                <span
                  key={service}
                  className="px-3.5 py-1 rounded-none bg-surface-card border border-border-custom text-xs font-mono text-foreground-secondary"
                >
                  {service}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      {/* Challenge / Solution / Impact */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto py-24 md:py-32">
        <div className="flex flex-col gap-16 md:gap-24">
          {SECTIONS.map((section) => (
            <div
              key={section.key}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start"
            >
              <div className="lg:col-span-4">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-3">
                  {section.number} / {section.label}
                </span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-foreground leading-tight">
                  {section.label}
                </h2>
              </div>

              <p className="lg:col-span-8 text-base md:text-lg text-foreground-secondary leading-relaxed max-w-3xl">
                {project[section.key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-24 md:pb-32">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-8">
          04 / Gallery
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {project.gallery.map((item, index) => (
            <figure
              key={`${item.src}-${index}`}
              className="group flex flex-col"
            >
              <div className="w-full aspect-[4/3] relative overflow-hidden rounded-none bg-surface-card border border-border-custom shadow-xl transition-colors duration-500 group-hover:border-foreground">
                <Image
                  src={item.src}
                  alt={item.caption}
                  fill
                  loading="lazy"
                  quality={80}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover rounded-none transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <figcaption className="pt-4 text-xs font-mono uppercase tracking-widest text-foreground-secondary">
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Next project */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-24 md:pb-32">
        <Link
          href={`/work/${project.nextSlug}`}
          className="group block p-8 md:p-14 rounded-none bg-surface-card border border-border-custom transition-colors duration-500 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
            Next Project
          </span>

          <div className="mt-4 flex items-center justify-between gap-8">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-foreground leading-tight">
              {project.nextTitle}
            </h2>

            <div className="shrink-0 w-14 h-14 rounded-none bg-background border border-border-custom flex items-center justify-center text-foreground transition-all duration-300 group-hover:bg-foreground group-hover:text-background">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
