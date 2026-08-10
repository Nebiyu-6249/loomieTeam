"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * One continuous sentence flowing horizontally as the page scrolls. Ticker
 * tape, not a deck: a single flex row where every fragment and glyph is a
 * sibling, with uneven gaps so the rhythm never settles into slide spacing.
 *
 * The glyphs are punctuation. They sit in the flow, not in panels of their own.
 */

type Glyph = "snowflake" | "eyes" | "river";

type Item =
  | { kind: "text"; value: string; gap: string }
  | { kind: "glyph"; glyph: Glyph; gap: string };

/** Loomie's own brand line. Gaps vary from 3rem to 10rem. */
const SENTENCE: Item[] = [
  { kind: "text", value: "Loomie began the way snow does", gap: "6rem" },
  { kind: "glyph", glyph: "snowflake", gap: "4rem" },
  {
    kind: "text",
    value: "quietly, without competing for attention",
    gap: "9rem",
  },
  { kind: "glyph", glyph: "eyes", gap: "3.5rem" },
  {
    kind: "text",
    value:
      "it doesn't chase the nightlights, the loud trend-lit brilliance that's gone by morning",
    gap: "7rem",
  },
  { kind: "glyph", glyph: "river", gap: "5rem" },
  { kind: "text", value: "snow becomes a river in summer", gap: "10rem" },
  { kind: "glyph", glyph: "eyes", gap: "3rem" },
  { kind: "text", value: "and a river reaches everywhere", gap: "0rem" },
];

/** Plain reading of the sentence, for the accessible label. */
const SENTENCE_TEXT = SENTENCE.filter(
  (item): item is Extract<Item, { kind: "text" }> => item.kind === "text"
)
  .map((item) => item.value)
  .join(" ");

function GlyphMark({ glyph }: { glyph: Glyph }) {
  const shared = "h-[0.62em] w-auto shrink-0 text-foreground-secondary";

  if (glyph === "snowflake") {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={shared}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <path d="M50 8 V92 M14 29 L86 71 M86 29 L14 71" />
        <path d="M50 24 L38 14 M50 24 L62 14 M50 76 L38 86 M50 76 L62 86" />
        <path d="M28 36 L15 37 M28 36 L22 25 M72 64 L85 63 M72 64 L78 75" />
        <path d="M72 36 L85 37 M72 36 L78 25 M28 64 L15 63 M28 64 L22 75" />
      </svg>
    );
  }

  if (glyph === "river") {
    return (
      <svg
        viewBox="0 0 140 60"
        aria-hidden="true"
        className={shared}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M6 42 C34 42 34 18 62 18 C90 18 90 42 134 42" />
      </svg>
    );
  }

  // The mark itself, drawn flat rather than through LoomieEyes: this one is
  // punctuation inside a line of type and must not track the cursor.
  return (
    <svg
      viewBox="0 0 360 185"
      aria-hidden="true"
      className={shared}
      fill="none"
    >
      <rect
        x="5"
        y="5"
        width="350"
        height="175"
        rx="87.5"
        className="fill-foreground-secondary"
      />
      <circle cx="113" cy="92.5" r="46" className="fill-background" />
      <circle cx="247" cy="92.5" r="46" className="fill-background" />
    </svg>
  );
}

export function TickerSentence() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      // Desktop only. A pinned horizontal scroll on a phone is miserable.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const row = rowRef.current;
          const section = sectionRef.current;
          if (!row || !section) return;

          // Recomputed on every refresh, so a resize or a font swap that
          // changes the row width does not leave the travel wrong.
          const distance = () => Math.max(row.scrollWidth - window.innerWidth, 0);

          const tween = gsap.to(row, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });

          return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
          };
        }
      );
    }, sectionRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  // Reads fine as a paragraph, which is a good sign the copy is doing work.
  if (prefersReducedMotion) {
    return (
      <section
        data-ticker-section=""
        className="py-24 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
      >
        <p className="font-display text-3xl md:text-5xl leading-snug text-foreground max-w-5xl">
          {SENTENCE.map((item, index) =>
            item.kind === "text" ? (
              <span key={index}>{item.value} </span>
            ) : (
              <span
                key={index}
                className="inline-flex items-center align-middle mx-3"
              >
                <GlyphMark glyph={item.glyph} />
              </span>
            )
          )}
        </p>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      data-ticker-section=""
      aria-label={SENTENCE_TEXT}
      className="border-t border-border-custom overflow-hidden"
    >
      {/* Desktop: pinned, scrubbed horizontally. */}
      <div className="hidden md:flex h-screen items-center">
        <div
          ref={rowRef}
          data-ticker-row=""
          className="flex flex-nowrap items-center whitespace-nowrap will-change-transform px-[6vw]"
        >
          {SENTENCE.map((item, index) => (
            <span
              key={index}
              aria-hidden="true"
              style={{ marginRight: item.gap }}
              className="inline-flex items-center font-display text-6xl lg:text-8xl xl:text-9xl leading-none text-foreground"
            >
              {item.kind === "text" ? (
                item.value
              ) : (
                <GlyphMark glyph={item.glyph} />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Mobile: no pin. The same sentence as a continuous marquee, reusing
          the tripled-copy translate from Marquee.tsx. */}
      <div className="md:hidden py-16 overflow-hidden">
        <div className="animate-marquee-smooth items-center" aria-hidden="true">
          {[0, 1, 2].map((copy) => (
            <div key={copy} className="flex flex-nowrap items-center">
              {SENTENCE.map((item, index) => (
                <span
                  key={`${copy}-${index}`}
                  style={{ marginRight: item.gap }}
                  className="inline-flex items-center font-display text-3xl leading-none text-foreground whitespace-nowrap"
                >
                  {item.kind === "text" ? (
                    item.value
                  ) : (
                    <GlyphMark glyph={item.glyph} />
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
