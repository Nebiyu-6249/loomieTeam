"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FilterBar, type FilterCategory } from "./FilterBar";

interface CaseStudy {
  id: string;
  title: string;
  category: string;
  categoryCode: "ecommerce" | "food" | "entertainment" | "tech" | "industrial" | "spatial";
  image: string;
  aspect: string;
  span: string;
  logoOverlay?: string;
  overlayStyle?: "white" | "dark" | "blue" | "orange";
  /** Set only where a matching slug exists in PROJECTS_DATA. */
  href?: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs1",
    title: "VORTEX Matte Titanium Module",
    category: "Spatial Hardware & Industrial Design",
    categoryCode: "industrial",
    image: "/images/project-minimal.jpg",
    aspect: "aspect-[4/3]",
    span: "col-span-12 md:col-span-7",
    logoOverlay: "VORTEX",
    href: "/work/vortex-titanium-module",
  },
  {
    id: "cs2",
    title: "OUTFINDR Mountain Dynamics",
    category: "Outdoor & Spatial Exploration",
    categoryCode: "spatial",
    image: "/images/project-spatial.jpg",
    aspect: "aspect-[1/1]",
    span: "col-span-12 md:col-span-5",
    logoOverlay: "OUTFINDR",
    href: "/work/outfindr-mountain-dynamics",
  },
  {
    id: "cs3",
    title: "SAT Cybernetic System HUD",
    category: "Autonomous WebGL Interface",
    categoryCode: "tech",
    image: "/images/project-digital.jpg",
    aspect: "aspect-[16/10]",
    span: "col-span-12 md:col-span-6",
    logoOverlay: "SAT",
    href: "/work/sat-cybernetic-hud",
  },
  {
    id: "cs4",
    title: "LUMINO 3D Kinetic Realm",
    category: "Motion Shaders & WebGL",
    categoryCode: "tech",
    image: "/images/hero-3d-fluid.jpg",
    aspect: "aspect-[16/10]",
    span: "col-span-12 md:col-span-6",
    logoOverlay: "LUMINO",
  },
  {
    id: "cs5",
    title: "Brutalist Spatial Pavilion",
    category: "Architecture & Acoustics",
    categoryCode: "spatial",
    image: "/images/project-spatial.jpg",
    aspect: "aspect-[16/10]",
    span: "col-span-12 md:col-span-7",
    logoOverlay: "AURA",
  },
  {
    id: "cs6",
    title: "Monochrome Editorial N°5",
    category: "Editorial & Grid Typography",
    categoryCode: "entertainment",
    image: "/images/project-editorial.jpg",
    aspect: "aspect-[1/1]",
    span: "col-span-12 md:col-span-5",
    logoOverlay: "EDITORIAL",
  },
  {
    id: "cs7",
    title: "JEA Architectural Interior",
    category: "Spatial Living & Craft",
    categoryCode: "spatial",
    image: "/images/hero-3d-fluid.jpg",
    aspect: "aspect-[16/9]",
    span: "col-span-12 md:col-span-6",
    logoOverlay: "JEA",
  },
  {
    id: "cs8",
    title: "LAUR High-Fashion Identity",
    category: "Luxury Identity & Craft",
    categoryCode: "ecommerce",
    image: "/images/project-editorial.jpg",
    aspect: "aspect-[16/9]",
    span: "col-span-12 md:col-span-6",
    logoOverlay: "LAUR",
  },
];

const CATEGORIES: FilterCategory[] = [
  { id: "ALL", label: "ALL" },
  { id: "ECOMMERCE", label: "ECOMMERCE" },
  { id: "FOOD", label: "FOOD & BEVERAGE" },
  { id: "ENTERTAINMENT", label: "ENTERTAINMENT" },
  { id: "INDUSTRIAL", label: "MANUFACTURING & INDUSTRIAL" },
  { id: "TECH", label: "TECH" },
  { id: "SPATIAL", label: "SPATIAL" },
];

export function PortfolioGrid() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filteredStudies =
    activeFilter === "ALL"
      ? CASE_STUDIES
      : CASE_STUDIES.filter(
          (item) => item.categoryCode === activeFilter.toLowerCase()
        );

  return (
    <section id="grid" className="py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom select-none">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary mb-2 block">
            02 / CREATIVE ARCHIVE
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-foreground">
            EXPLORATION <span className="text-foreground border-b-4 border-foreground pb-1">GRID</span>
          </h2>
        </div>
      </div>

      <FilterBar
        items={CASE_STUDIES}
        categories={CATEGORIES}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* 2-Column Asymmetric Case Study Showcase (Matching Reference Screenshot 100%) */}
      <div className="grid grid-cols-12 gap-8 md:gap-12">
        {filteredStudies.map((study) => {
          const cardClassName = `${study.span} group flex flex-col justify-between${
            study.href ? " cursor-pointer" : ""
          }`;

          const cardBody = (
            <>
            {/* Image Container with Brand Overlay */}
            <div className={`w-full ${study.aspect} relative overflow-hidden rounded-none bg-surface-card border border-border-custom shadow-xl transition-all duration-500 group-hover:border-foreground`}>
              <Image
                src={study.image}
                alt={study.title}
                fill
                quality={80}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover rounded-none transition-all duration-700 ease-out group-hover:scale-105 group-hover:contrast-[1.08] group-hover:brightness-[1.05]"
                loading="lazy"
                style={{ transform: "translateZ(0)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-45 transition-opacity duration-300" />

              {/* Brand Logo Overlay Centered */}
              {study.logoOverlay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter text-white/30 uppercase font-sans group-hover:text-white/60 group-hover:scale-105 transition-all duration-500">
                    {study.logoOverlay}
                  </span>
                </div>
              )}
            </div>

            {/* Case Study Meta Description Below Card (Matching Screenshot Structure) */}
            <div className="pt-4 pb-2 flex items-center justify-between border-b border-border-custom/60">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase text-foreground leading-tight">
                  {study.title}
                </h3>
                <span className="text-xs font-mono text-foreground-secondary uppercase tracking-wider mt-1 block font-medium">
                  {study.category}
                </span>
              </div>

              <div className="w-10 h-10 rounded-none bg-surface-card border border-border-custom flex items-center justify-center text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300 shadow-sm">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            </>
          );

          return study.href ? (
            <Link key={study.id} href={study.href} className={cardClassName}>
              {cardBody}
            </Link>
          ) : (
            <div key={study.id} className={cardClassName}>
              {cardBody}
            </div>
          );
        })}
      </div>

      {filteredStudies.length === 0 && (
        <p className="font-mono text-sm text-foreground-secondary uppercase tracking-widest">
          No work in this category yet.
        </p>
      )}
    </section>
  );
}
