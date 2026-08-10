"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { ArrowDown, Plus, ChevronDown, ArrowUpRight } from "lucide-react";

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
  },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const pillBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Master Initial Landing Page Animation Timeline
      const masterTL = gsap.timeline({ delay: 0.1 });

      // 1. Kinetic Headline 3D Character Entry
      if (headlineRef.current) {
        const textSplit = new SplitType(headlineRef.current, {
          types: "chars,words",
          tagName: "span",
        });

        if (textSplit.chars) {
          masterTL.fromTo(
            textSplit.chars,
            {
              y: 120,
              rotateX: -85,
              opacity: 0,
              scale: 0.85,
            },
            {
              y: 0,
              rotateX: 0,
              opacity: 1,
              scale: 1,
              duration: 1.2,
              stagger: 0.025,
              ease: "power4.out",
            }
          );
        }
      }

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
      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current.children,
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.15,
            ease: "power3.out",
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
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const filteredCards =
    activeFilter === "ALL"
      ? BENTO_GRID_ITEMS
      : BENTO_GRID_ITEMS.filter((item) => {
          if (activeFilter === "FOOD") return item.categoryCode === "food";
          if (activeFilter === "TECH") return item.categoryCode === "tech";
          if (activeFilter === "ENTERTAINMENT") return item.categoryCode === "entertainment";
          if (activeFilter === "INDUSTRIAL") return item.categoryCode === "industrial";
          return true;
        });

  return (
    <section
      ref={containerRef}
      className="pt-36 pb-24 md:pt-44 md:pb-36 px-6 md:px-12 max-w-[1700px] mx-auto overflow-hidden select-none"
    >
      {/* Studio Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-foreground/10 border border-foreground/20 text-foreground text-xs font-mono font-bold uppercase tracking-wider mb-8">
        <span className="w-2 h-2 bg-foreground rounded-none animate-pulse" />
        <span>LOOMIE STUDIO 2026 EDITION</span>
      </div>

      {/* Headline & Subtitle Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16 md:mb-20">
        <div className="lg:col-span-7">
          <h1
            ref={headlineRef}
            className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.8rem] font-extrabold tracking-tight leading-[0.92] text-foreground font-sans uppercase max-w-3xl"
            style={{ perspective: "1000px", willChange: "transform, opacity" }}
          >
            <span>Design</span>{" "}
            <span>that</span>{" "}
            <span className="text-foreground border-b-4 border-foreground pb-1">connects</span>
          </h1>
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
      <div ref={pillBarRef} className="flex flex-wrap items-center gap-3.5 mb-16 select-none">
        {[
          { id: "ALL", label: "ALL", count: 24 },
          { id: "ECOMMERCE", label: "ECOMMERCE", count: 7 },
          { id: "FOOD", label: "FOOD & BEVERAGE", count: 2 },
          { id: "ENTERTAINMENT", label: "ENTERTAINMENT", count: 3 },
          { id: "INDUSTRIAL", label: "MANUFACTURING & INDUSTRIAL", count: 2 },
          { id: "TECH", label: "TECH", count: 4 },
        ].map((pill) => (
          <button
            key={pill.id}
            onClick={() => setActiveFilter(pill.id)}
            className={`px-6 py-3.5 rounded-none text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2.5 ${
              activeFilter === pill.id
                ? "bg-foreground text-background shadow-xl scale-105 border border-foreground"
                : "bg-surface-card border border-border-custom text-foreground-secondary hover:text-foreground hover:border-foreground"
            }`}
          >
            <span>
              {pill.label} <sup className="text-[11px] opacity-70">({pill.count})</sup>
            </span>
            <Plus className="w-4 h-4" />
          </button>
        ))}

        <button className="px-6 py-3.5 rounded-none bg-surface-card border border-border-custom text-foreground-secondary hover:text-foreground text-xs sm:text-sm font-mono font-bold tracking-wider uppercase flex items-center gap-2.5">
          <span>SEE MORE</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Bento Grid Showcase */}
      <div ref={gridRef} className="grid grid-cols-12 gap-8 md:gap-10">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className={`${card.span} group relative rounded-none overflow-hidden bg-surface-card border border-border-custom shadow-2xl transition-all duration-500 hover:border-foreground cursor-pointer`}
          >
            <div className={`w-full ${card.aspect} relative overflow-hidden rounded-none`}>
              <Image
                src={card.image}
                alt={card.title}
                fill
                priority
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
          </div>
        ))}
      </div>
    </section>
  );
}
