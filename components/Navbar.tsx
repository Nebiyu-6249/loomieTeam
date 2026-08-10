"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { gsap } from "gsap";
import { LoomieLogoMark } from "./LoomieLogoMark";

const NAV_ITEMS = [
  { label: "Story", href: "#story", number: "01" },
  { label: "Values", href: "#values", number: "02" },
  { label: "Identity", href: "#identity", number: "03" },
  { label: "Who We Build For", href: "#who-we-build-for", number: "04" },
  { label: "Connect", href: "#contact", number: "05" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showMenuLinks, setShowMenuLinks] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always visible at the top
      if (currentScrollY < 20) {
        setShowMenuLinks(true);
      } else {
        // Scrolling down -> hide middle menu links
        if (currentScrollY > lastScrollY.current + 6) {
          setShowMenuLinks(false);
        }
        // Scrolling up -> reveal middle menu links
        else if (currentScrollY < lastScrollY.current - 6) {
          setShowMenuLinks(true);
        }
      }

      setScrolled(currentScrollY > 120);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // GSAP Powerup & Down Overlay Animation
  const toggleMenu = () => {
    if (!overlayRef.current) return;

    if (!menuOpen) {
      setMenuOpen(true);
      document.body.style.overflow = "hidden";

      const tl = gsap.timeline();

      // Curtain Powerup Down Animation
      tl.to(overlayRef.current, {
        display: "flex",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        duration: 0.75,
        ease: "power4.inOut",
      });

      // Stagger Kinetic Menu Links Slide Up
      if (menuLinksRef.current) {
        tl.fromTo(
          menuLinksRef.current.children,
          { y: 90, opacity: 0, rotateX: -35 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
          },
          "-=0.4"
        );
      }
    } else {
      const tl = gsap.timeline({
        onComplete: () => {
          setMenuOpen(false);
          document.body.style.overflow = "auto";
          if (overlayRef.current) {
            overlayRef.current.style.display = "none";
          }
        },
      });

      // Slide out links
      if (menuLinksRef.current) {
        tl.to(menuLinksRef.current.children, {
          y: -50,
          opacity: 0,
          duration: 0.3,
          stagger: 0.04,
          ease: "power2.in",
        });
      }

      // Curtain Powerdown Up Animation
      tl.to(overlayRef.current, {
        clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
        duration: 0.65,
        ease: "power4.inOut",
      });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-3 bg-glass-bg backdrop-blur-xl border-b border-glass-border shadow-2xl"
            : "py-6 bg-transparent"
        }`}
      >
        <div className="max-w-[1700px] mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Constant Brand Logo Icon */}
          <a
            href="#"
            className="group flex items-center transition-transform duration-300 hover:scale-110 select-none"
            aria-label="LOOMIE Home"
          >
            <LoomieLogoMark className="w-14 h-7" />
          </a>

          {/* Middle Menu Links (Disappears on scroll DOWN, re-appears on scroll UP) */}
          <nav
            className={`hidden md:flex items-center gap-10 xl:gap-14 text-base md:text-lg font-sans transition-all duration-500 transform ${
              showMenuLinks
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground font-medium tracking-normal opacity-90 transition-all duration-300 hover:opacity-100 hover:scale-105 relative group py-1"
              >
                <span>{item.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right Action Group: Menu Trigger (hidden on desktop when text links show) & Lets Talk CTA (hidden on scroll down) */}
          <div className="flex items-center gap-4">
            {/* GSAP Fullscreen Menu Trigger Button: Hidden on desktop when header text links are visible, shown on mobile or on scroll down */}
            <button
              onClick={toggleMenu}
              className={`p-3.5 rounded-none bg-surface-card border border-border-custom text-foreground transition-all duration-500 hover:scale-105 hover:border-foreground items-center gap-2.5 shadow-sm group ${
                showMenuLinks ? "flex md:hidden" : "flex"
              }`}
              aria-label="Toggle Fullscreen Menu"
            >
              <Menu className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />
              <span className="hidden sm:inline-block font-mono text-xs font-bold tracking-wider">
                {menuOpen ? "Close" : "Menu"}
              </span>
            </button>

            {/* "Lets Talk" Button: Hides smoothly on scroll down */}
            <a
              href="#contact"
              className={`px-7 py-3 rounded-none bg-foreground text-background font-medium text-base transition-all duration-500 hover:bg-surface-card hover:text-foreground items-center gap-3 shadow-md border border-foreground transform ${
                showMenuLinks
                  ? "opacity-100 translate-y-0 pointer-events-auto flex"
                  : "opacity-0 -translate-y-4 pointer-events-none hidden"
              }`}
            >
              <span>Lets Talk</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </a>
          </div>
        </div>
      </header>

      {/* GSAP Fullscreen Powerup & Down Curtain Overlay Menu */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[99999] bg-background text-foreground hidden flex-col justify-between p-8 md:p-16 overflow-hidden select-none border-b border-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
          willChange: "clip-path",
        }}
      >
        {/* Overlay Header */}
        <div className="flex items-center justify-between max-w-[1700px] w-full mx-auto pb-8 border-b border-border-custom">
          <div className="flex items-center gap-3">
            <LoomieLogoMark className="w-14 h-7" />
            <span className="font-mono text-xs font-bold tracking-widest text-foreground-secondary uppercase">
              STUDIO NAVIGATION ENGINE
            </span>
          </div>

          <button
            onClick={toggleMenu}
            className="p-4 rounded-none bg-foreground text-background font-bold text-sm transition-all duration-300 hover:scale-110 flex items-center gap-2"
          >
            <span>Close</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Large GSAP Powerup Menu Links */}
        <div className="max-w-[1700px] w-full mx-auto my-auto py-8">
          <div
            ref={menuLinksRef}
            className="flex flex-col gap-4 md:gap-6 font-sans font-bold"
            style={{ perspective: "1000px" }}
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={toggleMenu}
                className="group flex items-center gap-6 text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-foreground-secondary hover:text-foreground transition-all duration-500 hover:translate-x-4"
              >
                <span className="font-mono text-base md:text-xl font-bold opacity-40 group-hover:opacity-100 text-foreground transition-opacity">
                  ({item.number})
                </span>
                <span className="group-hover:tracking-wider transition-all duration-500">
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Overlay Footer */}
        <div className="max-w-[1700px] w-full mx-auto pt-8 border-t border-border-custom flex flex-col md:flex-row items-center justify-between text-xs font-mono text-foreground-secondary gap-4">
          <div>
            <span>LOOMIE STUDIO 2026</span> • <span>TOKYO / LONDON / NYC</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              X / Twitter ↗
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              Instagram ↗
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              LinkedIn ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
