"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { gsap } from "gsap";
import { LoomieEyes } from "./LoomieEyes";
import { useLenis } from "./LenisScrollProvider";

const NAV_ITEMS = [
  { label: "Work", href: "/work", number: "01" },
  { label: "Services", href: "/services", number: "02" },
  { label: "Studio", href: "/studio", number: "03" },
  { label: "Clients", href: "/clients", number: "04" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showMenuLinks, setShowMenuLinks] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keyHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
  const lenis = useLenis();

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

  // Scroll must never be left locked, even if the navbar unmounts mid-close.
  // The ref object is aliased so the dependency is the stable object rather
  // than a value read from it; the cleanup still reads the live .current.
  useEffect(() => {
    const scroller = lenis;
    const handler = keyHandlerRef;
    return () => {
      scroller?.current?.start();
      if (handler.current) {
        document.removeEventListener("keydown", handler.current);
        handler.current = null;
      }
    };
  }, [lenis]);

  // GSAP Powerdown Overlay Animation
  const closeMenu = () => {
    if (!overlayRef.current) return;

    if (keyHandlerRef.current) {
      document.removeEventListener("keydown", keyHandlerRef.current);
      keyHandlerRef.current = null;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setMenuOpen(false);
        lenis?.current?.start();
        if (overlayRef.current) {
          overlayRef.current.style.display = "none";
        }
        // Focus goes back where it came from.
        triggerRef.current?.focus();
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
  };

  // Escape closes the overlay and Tab is trapped inside it while open.
  // The listener's lifetime is tied to open/close rather than an effect, so
  // it needs no dependency on closeMenu, which is redefined every render.
  const trapFocus = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusables = () =>
      Array.from(
        overlay.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );

    focusables()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    keyHandlerRef.current = handleKeyDown;
    document.addEventListener("keydown", handleKeyDown);
  };

  // GSAP Powerup Overlay Animation
  const openMenu = () => {
    if (!overlayRef.current) return;

    setMenuOpen(true);
    // Lenis ignores an overflow write on body, so the page would keep
    // scrolling behind the overlay.
    lenis?.current?.stop();

    // GSAP sets this too, but doing it up front means the overlay is
    // focusable now rather than a frame later.
    overlayRef.current.style.display = "flex";
    trapFocus();

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
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
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
          <Link
            href="/"
            className="group flex items-center transition-transform duration-300 hover:scale-110 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            aria-label="LOOMIE Home"
          >
            <LoomieEyes className="w-14 h-7" />
          </Link>

          {/* Middle Menu Links (Disappears on scroll DOWN, re-appears on scroll UP) */}
          <nav
            className={`hidden md:flex items-center gap-10 xl:gap-14 text-base md:text-lg font-sans transition-all duration-500 transform ${
              showMenuLinks
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-foreground font-medium tracking-normal opacity-90 transition-all duration-300 hover:opacity-100 hover:scale-105 relative group py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span>{item.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-foreground transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Right Action Group: Menu Trigger (hidden on desktop when text links show) & Lets Talk CTA (hidden on scroll down) */}
          <div className="flex items-center gap-4">
            {/* GSAP Fullscreen Menu Trigger Button: Hidden on desktop when header text links are visible, shown on mobile or on scroll down */}
            <button
              ref={triggerRef}
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              className={`p-3.5 rounded-none bg-surface-card border border-border-custom text-foreground transition-all duration-500 hover:scale-105 hover:border-foreground items-center gap-2.5 shadow-sm group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
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
            <Link
              href="/contact"
              className={`px-7 py-3 rounded-none bg-foreground text-background font-medium text-base transition-all duration-500 hover:bg-surface-card hover:text-foreground items-center gap-3 shadow-md border border-foreground transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                showMenuLinks
                  ? "opacity-100 translate-y-0 pointer-events-auto flex"
                  : "opacity-0 -translate-y-4 pointer-events-none hidden"
              }`}
            >
              <span>Let&apos;s Talk</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* GSAP Fullscreen Powerup & Down Curtain Overlay Menu */}
      <div
        ref={overlayRef}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="fixed inset-0 z-[99999] bg-background text-foreground hidden flex-col justify-between p-8 md:p-16 overflow-hidden select-none border-b border-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
          willChange: "clip-path",
        }}
      >
        {/* Overlay Header */}
        <div className="flex items-center justify-between max-w-[1700px] w-full mx-auto pb-8 border-b border-border-custom">
          <div className="flex items-center gap-3">
            <LoomieEyes className="w-14 h-7" />
            <span className="font-mono text-xs font-bold tracking-widest text-foreground-secondary uppercase">
              STUDIO NAVIGATION ENGINE
            </span>
          </div>

          <button
            onClick={toggleMenu}
            className="p-4 rounded-none bg-foreground text-background font-bold text-sm transition-all duration-300 hover:scale-110 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
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
              <Link
                key={item.label}
                href={item.href}
                onClick={toggleMenu}
                className="group flex items-center gap-6 text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-foreground-secondary hover:text-foreground transition-all duration-500 hover:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span className="font-mono text-base md:text-xl font-bold opacity-40 group-hover:opacity-100 text-foreground transition-opacity">
                  ({item.number})
                </span>
                <span className="group-hover:tracking-wider transition-all duration-500">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Overlay Footer */}
        <div className="max-w-[1700px] w-full mx-auto pt-8 border-t border-border-custom flex flex-col md:flex-row items-center justify-between text-xs font-mono text-foreground-secondary gap-4">
          <div>
            <span>LOOMIE STUDIO 2026</span> • <span>TOKYO / LONDON / NYC</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
              X / Twitter ↗
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
              Instagram ↗
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
              LinkedIn ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
