"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { FilterBar, type FilterCategory } from "./FilterBar";
import { BlurText } from "./BlurText";
import { whenLoaderFinished } from "./loaderSignal";

interface BentoCard {
  id: string;
  title: string;
  category: string;
  categoryCode: "ecommerce" | "food" | "entertainment" | "tech" | "industrial";
  image: string;
  aspect: string;
  span: string;
  logoOverlay?: string;
  tag?: string;
  /** Set only where a matching slug exists in PROJECTS_DATA. */
  href?: string;
}

const BENTO_GRID_ITEMS: BentoCard[] = [
  {
    id: "b1",
    title: "Fluid 3D Spatial Dynamics",
    category: "Motion & WebGL Shaders",
    categoryCode: "tech",
    image: "/images/hero-3d-fluid.jpg",
    aspect: "aspect-[16/10]",
    span: "col-span-12 lg:col-span-7",
    logoOverlay: "FLUID 3D",
    tag: "FEATURED SHOWCASE",
  },
  {
    id: "b2",
    title: "VORTEX Matte Titanium Module",
    category: "Spatial Hardware & Industrial Design",
    categoryCode: "industrial",
    image: "/images/project-minimal.jpg",
    aspect: "aspect-[16/10]",
    span: "col-span-12 lg:col-span-5",
    logoOverlay: "VORTEX",
    tag: "TITANIUM",
    href: "/work/vortex-titanium-module",
  },
  {
    id: "b3",
    title: "Brutalist Spatial Pavilion",
    category: "Architecture & Spatial Dynamics",
    categoryCode: "industrial",
    image: "/images/project-spatial.jpg",
    aspect: "aspect-[4/3]",
    span: "col-span-12 lg:col-span-5",
    logoOverlay: "AURA",
    tag: "ARCHITECTURAL",
  },
  {
    id: "b4",
    title: "SAT Cybernetic System",
    category: "Autonomous HUD Interface",
    categoryCode: "tech",
    image: "/images/project-digital.jpg",
    aspect: "aspect-[16/9]",
    span: "col-span-12 lg:col-span-7",
    logoOverlay: "SAT",
    tag: "HARDWARE UI",
    href: "/work/sat-cybernetic-hud",
  },
];

const CATEGORIES: FilterCategory[] = [
  { id: "ALL", label: "ALL" },
  { id: "ECOMMERCE", label: "ECOMMERCE" },
  { id: "FOOD", label: "FOOD & BEVERAGE" },
  { id: "ENTERTAINMENT", label: "ENTERTAINMENT" },
  { id: "INDUSTRIAL", label: "MANUFACTURING & INDUSTRIAL" },
  { id: "TECH", label: "TECH" },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const pillBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Master Initial Landing Page Animation Timeline
        const masterTL = gsap.timeline({ delay: 0.1 });

        // 1. The headline is owned by BlurText, which splits and reveals it
        //    per character once the loading screen has finished.

        // 2. Subtitle Fade & Slide Up
        if (subtitleRef.current) {
          masterTL.fromTo(
            subtitleRef.current,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
            "-=0.6"
          );
        }

        // 3. Filter Bar Pop In
        if (pillBarRef.current) {
          masterTL.fromTo(
            pillBarRef.current.children,
            { y: 20, opacity: 0, scale: 0.95 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.5,
              stagger: 0.04,
              ease: "back.out(1.5)",
            },
            "-=0.4"
          );
        }

        // 4. Bento Grid Cards Entrance
        //    Clip-path wipe staggered by grid position rather than array index,
        //    so the grid unfolds diagonally instead of in source order.
        if (gridRef.current) {
          gsap.fromTo(
            gridRef.current.children,
            { clipPath: "inset(0% 0% 100% 0%)", y: 40 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              y: 0,
              duration: 1,
              ease: "power3.out",
              stagger: {
                each: 0.14,
                grid: "auto",
                from: "start",
              },
              scrollTrigger: {
                trigger: gridRef.current,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        // 5. ScrollTrigger Parallax Scrub on Headline after initial entry
        if (headlineRef.current && containerRef.current) {
          gsap.to(headlineRef.current, {
            yPercent: -25,
            opacity: 0.3,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom 30%",
              scrub: 0.5,
            },
          });
        }
      });
    }, containerRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  const filteredCards =
    activeFilter === "ALL"
      ? BENTO_GRID_ITEMS
      : BENTO_GRID_ITEMS.filter(
          (item) => item.categoryCode === activeFilter.toLowerCase()
        );

  return (
    <section
      ref={containerRef}
      className="pt-36 pb-24 md:pt-44 md:pb-36 px-6 md:px-12 max-w-[1700px] mx-auto overflow-hidden"
    >
      {/* Studio Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-foreground/10 border border-foreground/20 text-foreground text-xs font-mono font-bold uppercase tracking-wider mb-8">
        <span className="w-2 h-2 bg-foreground rounded-none animate-pulse" />
        <span>LOOMIE STUDIO 2026 EDITION</span>
      </div>

      {/* Headline & Subtitle Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16 md:mb-20">
        <div className="lg:col-span-7">
          <div ref={headlineRef}>
            <BlurText
              as="h1"
              text="Design that connects"
              trigger="mount"
              waitFor={whenLoaderFinished}
              lastWordClassName="text-foreground border-b-4 border-foreground pb-1"
              className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.8rem] font-extrabold tracking-tight leading-[0.92] text-foreground font-sans uppercase max-w-3xl"
            />
          </div>
        </div>

        <div
          ref={subtitleRef}
          className="lg:col-span-5 flex flex-col justify-end space-y-6 lg:pl-10 text-foreground-secondary text-base sm:text-lg font-sans"
        >
          <p className="leading-snug font-normal max-w-md">
            Where ideas turn into identities we craft experience that resonates
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-border-custom font-mono text-xs sm:text-sm text-foreground font-bold tracking-wider">
            <span>Lat : 19.075983 Long : 72.877655</span>
            <ArrowDown className="w-5 h-5 text-foreground animate-bounce" />
          </div>
        </div>
      </div>

      {/* Pill Filter Bar */}
      <div ref={pillBarRef}>
        <FilterBar
          items={BENTO_GRID_ITEMS}
          categories={CATEGORIES}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      {/* Bento Grid Showcase */}
      <div ref={gridRef} className="grid grid-cols-12 gap-8 md:gap-10">
        {filteredCards.map((card, index) => {
          const cardClassName = `${card.span} group relative rounded-none overflow-hidden bg-surface-card border border-border-custom shadow-2xl transition-all duration-500 hover:border-foreground${
            card.href ? " cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground" : ""
          }`;

          const cardBody = (
            <>
            <div className={`w-full ${card.aspect} relative overflow-hidden rounded-none`}>
              <Image
                src={card.image}
                alt={card.title}
                fill
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                quality={80}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover rounded-none transition-all duration-700 ease-out group-hover:scale-105 group-hover:contrast-[1.08] group-hover:brightness-[1.05]"
                style={{ transform: "translateZ(0)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-75 group-hover:opacity-50 transition-opacity duration-300" />

              {card.tag && (
                <div className="absolute top-6 left-6 px-3.5 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 text-white font-mono text-xs font-bold tracking-widest uppercase">
                  {card.tag}
                </div>
              )}

              {card.logoOverlay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-black text-6xl md:text-8xl tracking-tighter text-white/20 uppercase font-sans group-hover:text-white/45 group-hover:scale-105 transition-all duration-500">
                    {card.logoOverlay}
                  </span>
                </div>
              )}
            </div>

            <div className="p-8 md:p-10 flex items-center justify-between bg-surface-card border-t border-border-custom">
              <div>
                <h3 className="text-2xl md:text-3xl font-black uppercase text-foreground leading-tight">
                  {card.title}
                </h3>
                <span className="text-xs sm:text-sm font-mono text-foreground-secondary uppercase tracking-widest mt-2 block font-semibold">
                  {card.category}
                </span>
              </div>

              <div className="w-12 h-12 rounded-none bg-background border border-border-custom flex items-center justify-center text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300 shadow-md">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            </>
          );

          return card.href ? (
            <Link key={card.id} href={card.href} className={cardClassName}>
              {cardBody}
            </Link>
          ) : (
            <div key={card.id} className={cardClassName}>
              {cardBody}
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <p className="font-mono text-sm text-foreground-secondary uppercase tracking-widest">
          No work in this category yet.
        </p>
      )}
    </section>
  );
}
