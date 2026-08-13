"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { LoomieLogoMark } from "./LoomieLogoMark";

/**
 * The footer, with the theatre removed.
 *
 * It used to carry a 540px banner of the purple CGI gradient, a badge naming
 * a nonexistent engine, an establishment date and a headline promising
 * something extraordinary. None of it was information. What a footer
 * owes the visitor is a way to get in touch, a way to get to the other pages,
 * and the studio's name — so that is what is here.
 *
 * The wordmark wipe stays. It is one animation, tied to scroll, at the end of
 * the page, and it is the only flourish left down here.
 */

const NAVIGATION = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/studio", label: "Studio" },
  { href: "/clients", label: "Who we work with" },
];

/**
 * ── PLACEHOLDER ─────────────────────────────────────────────────────────
 * Loomie's real social accounts have not been supplied. Linking to
 * instagram.com and linkedin.com as though they were the studio's own is a
 * broken promise on every click, so the list is empty and the column is not
 * rendered. Add the real URLs here and it comes back.
 */
const ELSEWHERE: { href: string; label: string }[] = [];

export function Footer() {
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!wordmarkRef.current) return;

        gsap.fromTo(
          wordmarkRef.current,
          { clipPath: "inset(0% 100% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: {
              // Ends on the wordmark's own bottom edge: it sits at the end of
              // the document, so a viewport fraction is never reached and the
              // wipe would stall half-drawn.
              trigger: wordmarkRef.current,
              start: "top bottom",
              end: "bottom bottom",
              scrub: 0.6,
            },
          }
        );
      });
    }, footerRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <footer
      id="contact"
      ref={footerRef}
      className="relative bg-surface border-t border-border-custom pt-20 md:pt-28 pb-10 overflow-hidden"
    >
      <div className="max-w-[1700px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-12 lg:col-span-6">
            <h2 className="font-display font-normal text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-foreground max-w-xl">
              Tell us what you are building.
            </h2>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/contact"
                className="group inline-flex items-baseline gap-3 text-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              >
                <span className="border-b border-foreground/40 pb-1 transition-colors duration-[250ms] group-hover:border-foreground">
                  Book an intro call
                </span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-[250ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <a
                href="mailto:hello@loomiestudio.com"
                className="font-mono text-xs uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-[250ms] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              >
                hello@loomiestudio.com
              </a>
            </div>
          </div>

          <nav className="col-span-6 lg:col-span-3 lg:col-start-8" aria-label="Footer">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary mb-5">
              Pages
            </h3>
            <ul className="space-y-3">
              {NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-foreground-secondary transition-colors duration-[250ms] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {ELSEWHERE.length > 0 && (
          <div className="col-span-6 lg:col-span-2">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary mb-5">
              Elsewhere
            </h3>
            <ul className="space-y-3">
              {ELSEWHERE.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground-secondary transition-colors duration-[250ms] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          )}
        </div>

        {/* The wordmark, with the mark standing in for the double O. */}
        <p
          ref={wordmarkRef}
          aria-label="Loomie"
          className="mt-20 md:mt-28 flex items-center justify-center gap-1 sm:gap-2 select-none font-sans font-black uppercase tracking-tighter leading-none text-foreground text-[19vw]"
        >
          <span aria-hidden="true">L</span>
          <LoomieLogoMark className="w-[26vw] h-[13vw]" />
          <span aria-hidden="true">MIE</span>
        </p>

        <div className="mt-12 pt-6 border-t border-border-custom flex flex-wrap items-center justify-between gap-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-foreground-secondary">
          <span>© {new Date().getFullYear()} Loomie Studio</span>
          <span>Working remotely, worldwide</span>
        </div>
      </div>
    </footer>
  );
}
