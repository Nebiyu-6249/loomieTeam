"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Mail, MapPin, Globe } from "lucide-react";
import { LoomieLogoMark } from "./LoomieLogoMark";

export function Footer() {
  const giantLogoRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Monumental Animated Logo Reveal for L [LOGO] M I E
      if (giantLogoRef.current) {
        const children = giantLogoRef.current.children;
        if (children && children.length > 0) {
          gsap.fromTo(
            Array.from(children),
            { y: 140, opacity: 0, scale: 0.85 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1.3,
              stagger: 0.06,
              ease: "power4.out",
              scrollTrigger: {
                trigger: giantLogoRef.current,
                start: "top 92%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      }
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer id="contact" ref={footerRef} className="relative bg-surface border-t border-border-custom pt-24 pb-12 overflow-hidden select-none">
      <div className="max-w-[1700px] mx-auto px-6 md:px-12">
        {/* Main CTA Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-10">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-foreground font-bold">
              03 / GET IN TOUCH
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mt-4 max-w-3xl leading-[1.05]">
              LET&apos;S BUILD SOMETHING <span className="text-foreground border-b-4 border-foreground pb-1">EXTRAORDINARY</span>.
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <a
              href="mailto:hello@loomiestudio.com"
              className="inline-flex items-center gap-4 px-8 py-5 rounded-none bg-foreground text-background font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white hover:text-black border border-foreground group"
            >
              <Mail className="w-5 h-5" />
              <span>hello@loomiestudio.com</span>
              <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
          </div>
        </div>

        {/* Full-Width Showcase Visual Banner that fills the page well */}
        <div className="w-full h-[380px] md:h-[540px] relative overflow-hidden my-14 rounded-none border border-border-custom shadow-2xl group cursor-pointer">
          <Image
            src="/images/hero-3d-fluid.jpg"
            alt="LOOMIE Studio Visual Anchor"
            fill
            priority
            quality={85}
            sizes="(max-width: 1700px) 100vw, 1700px"
            className="object-cover transition-all duration-1000 ease-out group-hover:scale-105 group-hover:brightness-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="absolute inset-0 p-8 md:p-14 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold uppercase tracking-widest">
                LOOMIE KINETIC ENGINE
              </span>
              <span className="text-white font-mono text-xs font-bold tracking-widest uppercase">
                EST. 2026
              </span>
            </div>

            <div>
              <h3 className="text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight max-w-3xl leading-none">
                WHERE IDEAS TURN INTO IDENTITIES
              </h3>
              <p className="text-white/80 font-mono text-xs md:text-sm tracking-wider uppercase mt-4">
                Brutalist Spatial Concepts • Kinetic Web Architecture • Brand Systems
              </p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-border-custom text-sm">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <LoomieLogoMark className="w-12 h-6" />
              <span className="font-bold text-base tracking-wider uppercase font-sans">
                LOOMIE
              </span>
            </div>
            <p className="text-foreground-secondary max-w-sm leading-relaxed mb-6">
              LOOMIE is a premium design & technology studio specializing in kinetic web development, brutalist spatial concepts, and digital branding.
            </p>
            <div className="flex items-center gap-6 text-foreground-secondary font-mono text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-foreground" />
                <span>Tokyo / London / NYC</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-foreground" />
                <span>Worldwide Operations</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-xs text-foreground mb-4 font-mono">
              Navigation
            </h4>
            <ul className="space-y-3 text-foreground-secondary">
              <li>
                <a href="#grid" className="hover:text-foreground transition-colors">
                  Work Showcase
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-foreground transition-colors">
                  Technical Architecture
                </a>
              </li>
              <li>
                <a href="#grid" className="hover:text-foreground transition-colors">
                  Creative Archive
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-foreground transition-colors">
                  Start a Project
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-xs text-foreground mb-4 font-mono">
              Social Connect
            </h4>
            <ul className="space-y-3 text-foreground-secondary">
              <li>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center justify-between">
                  <span>X / Twitter</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
              <li>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Instagram</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
              <li>
                <a href="https://dribbble.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Dribbble</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center justify-between">
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Elegant Proportional LOOMIE Brand Headline */}
        <div className="w-full pt-8 pb-4 overflow-hidden border-b border-border-custom bg-surface flex justify-center items-center">
          <h2
            ref={giantLogoRef}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-none text-foreground uppercase select-none font-sans text-center flex items-center justify-center gap-1 sm:gap-2 max-w-full"
            style={{ perspective: "1000px" }}
          >
            <span className="inline-block">L</span>
            <span className="inline-flex items-center justify-center px-0.5 sm:px-1">
              <LoomieLogoMark className="h-[0.65em] w-auto inline-block align-middle" />
            </span>
            <span className="inline-block">M</span>
            <span className="inline-block">I</span>
            <span className="inline-block">E</span>
          </h2>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-foreground-secondary font-mono">
          <p>© {new Date().getFullYear()} LOOMIE Studio. All rights reserved.</p>
          <p>ENGINEERED WITH GSAP & LENIS</p>
        </div>
      </div>
    </footer>
  );
}
