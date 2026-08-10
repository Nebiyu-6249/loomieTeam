"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Sparkles } from "lucide-react";

interface Project {
  id: string;
  number: string;
  title: string;
  client: string;
  category: string;
  description: string;
  tags: string[];
  year: string;
  image: string;
  aspect: string;
}

const PROJECTS: Project[] = [
  {
    id: "spatial",
    number: "01",
    title: "Brutalist Spatial Pavilion",
    client: "ARCH STUDIO / TOKYO",
    category: "Architecture & Spatial Dynamics",
    description:
      "A monolithic concrete pavilion exploring spatial acoustics, geometric shadows, and interactive brutalism in high-density urban environments.",
    tags: ["Spatial Design", "Acoustics", "Concrete Art"],
    year: "2026",
    image: "/images/project-spatial.jpg",
    aspect: "aspect-[4/5]",
  },
  {
    id: "packaging",
    number: "02",
    title: "Tactile Packaging Identity",
    client: "AURA LUXURY / PARIS",
    category: "Tactile Industrial & Packaging",
    description:
      "Minimalist, zero-plastic matte packaging identity engineered for sensory consumer rituals and sustainable luxury products.",
    tags: ["Packaging", "Tactile Identity", "Eco Luxury"],
    year: "2025",
    image: "/images/project-packaging.jpg",
    aspect: "aspect-[4/3]",
  },
  {
    id: "digital",
    number: "03",
    title: "Cybernetic HUD Module",
    client: "SAT LABS / ZURICH",
    category: "Digital Brand & WebGL Systems",
    description:
      "A futuristic hardware dashboard and interactive design system engineered for autonomous drone control centers.",
    tags: ["Interface Design", "WebGL 3D", "Autonomous UI"],
    year: "2026",
    image: "/images/project-digital.jpg",
    aspect: "aspect-[1/1]",
  },
  {
    id: "editorial",
    number: "04",
    title: "High-Contrast Editorial Grid",
    client: "MAGAZINE N°5 / LONDON",
    category: "Editorial Typography Architecture",
    description:
      "Monochrome magazine publication system featuring variable kinetic type dynamics, modular grid layouts, and archival typography.",
    tags: ["Editorial", "Variable Type", "Print Grid"],
    year: "2025",
    image: "/images/project-editorial.jpg",
    aspect: "aspect-[16/10]",
  },
];

export function PinnedProjects() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];

      cards.forEach((card, index) => {
        if (index === cards.length - 1) return;

        const nextCard = cards[index + 1];

        gsap.to(card, {
          scale: 0.9,
          opacity: 0.4,
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: nextCard,
            start: "top 85%",
            end: "top 25%",
            scrub: 0.5,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="py-32 px-6 md:px-12 max-w-[1700px] mx-auto relative"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 pb-8 border-b border-border-custom gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-accent mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>01 / SELECTED CASE STUDIES</span>
          </div>
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase text-foreground">
            PINNED <span className="text-accent">STACK</span>
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-foreground-secondary">
          <span className="px-4 py-2 rounded-none bg-surface-card border border-border-custom">
            4 FLAGSHIP PROJECTS
          </span>
          <span className="hidden sm:inline-block">SCROLL TO STACK</span>
        </div>
      </div>

      <div className="relative flex flex-col gap-24">
        {PROJECTS.map((project, index) => (
          <div
            key={project.id}
            ref={(el) => {
              cardsRef.current[index] = el;
            }}
            className="sticky top-28 w-full rounded-none bg-surface-card/95 backdrop-blur-xl border border-border-custom p-8 md:p-14 shadow-2xl transition-all duration-500 overflow-hidden group"
            style={{
              zIndex: index + 10,
            }}
            data-cursor="card"
            data-cursor-text={`VIEW ${project.number}`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-mono font-black text-foreground px-4 py-1.5 rounded-none bg-foreground/10 border border-foreground/20">
                      CASE {project.number}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono text-foreground-secondary">
                      <span>{project.client}</span>
                      <span>•</span>
                      <span>{project.year}</span>
                    </div>
                  </div>

                  <h3 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4 leading-[1.05]">
                    {project.title}
                  </h3>

                  <p className="text-xs uppercase font-mono tracking-widest text-foreground font-bold mb-6">
                    {project.category}
                  </p>

                  <p className="text-foreground-secondary text-base leading-relaxed mb-8">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {project.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-3.5 py-1 rounded-none bg-background border border-border-custom text-xs font-mono text-foreground-secondary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-none bg-foreground text-background font-bold text-sm uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
                    data-cursor="hover"
                  >
                    <span>Inspect Case Study</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div
                  className={`w-full ${project.aspect} relative rounded-none overflow-hidden shadow-2xl border border-white/10 group-hover:border-foreground transition-colors duration-500`}
                >
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    quality={75}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover rounded-none transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ transform: "translateZ(0)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                  <div className="absolute top-6 right-6 px-4 py-2 rounded-none bg-black/60 backdrop-blur-md border border-white/15 text-white font-mono text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-none bg-white animate-pulse" />
                    <span>{project.number} / 04</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
