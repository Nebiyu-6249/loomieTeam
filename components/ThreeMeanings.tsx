"use client";

import React, { useId, useState } from "react";

/**
 * A7 — three meanings.
 *
 * One pronunciation, three meanings, one coherent identity. The word stays
 * fixed; everything around it changes meaning.
 *
 * This is the CSS-only version. It is deliberately built as one set of points
 * moving between three precomputed position sets, which is exactly the shape
 * the WebGL version takes later: swapping the transition for a uMode uniform
 * replaces the renderer without touching the interaction, the copy or the
 * accessibility.
 */

type Mode = "finnish" | "albanian" | "italian";

interface Meaning {
  id: Mode;
  /** The label, exactly as the brief specifies: the language, nothing more. */
  language: string;
  /**
   * Describes the state you are looking at, not a translation. If the brand
   * deck carries a specific gloss per language, it belongs here and nowhere
   * else.
   */
  state: string;
  tint: string;
  point: string;
  glow: string;
}

const MEANINGS: Meaning[] = [
  {
    id: "finnish",
    language: "Finnish",
    state: "Suspended snow",
    tint: "radial-gradient(circle at 50% 38%, rgba(150,182,216,0.16), transparent 68%)",
    point: "#DCE6F0",
    glow: "none",
  },
  {
    id: "albanian",
    language: "Albanian",
    state: "The river",
    tint: "linear-gradient(158deg, rgba(84,132,178,0.20), transparent 62%)",
    point: "#9FBEDA",
    glow: "none",
  },
  {
    id: "italian",
    language: "Italian",
    state: "Points of light",
    tint: "radial-gradient(circle at 50% 56%, rgba(232,223,160,0.16), transparent 64%)",
    point: "var(--accent-brand)",
    glow: "0 0 10px 1px rgba(232,223,160,0.55)",
  },
];

const POINT_COUNT = 54;

/** Deterministic, so server and client agree and there is no hydration jump. */
const noise = (n: number) => {
  const value = Math.sin(n * 91.7) * 34719.317;
  return value - Math.floor(value);
};

interface PointStates {
  finnish: { x: number; y: number; size: number };
  albanian: { x: number; y: number; size: number };
  italian: { x: number; y: number; size: number };
}

/**
 * One point set, three arrangements. Snow hangs scattered and still; the river
 * gathers the same points onto a curve; the lights cluster them into warm
 * knots. The morph is the same points moving, never a swap between three
 * different things.
 */
const POINTS: PointStates[] = Array.from({ length: POINT_COUNT }, (_, i) => {
  const a = noise(i + 1);
  const b = noise(i * 3.1 + 7);
  const c = noise(i * 5.7 + 13);

  const t = i / (POINT_COUNT - 1);

  return {
    finnish: {
      x: a * 100,
      y: b * 100,
      size: 2 + c * 2.6,
    },
    albanian: {
      // Along a meander, with just enough scatter to read as flow not a line.
      x: t * 108 - 4,
      y: 50 + Math.sin(t * Math.PI * 2.2) * 19 + (c - 0.5) * 13,
      size: 1.6 + b * 2.2,
    },
    italian: {
      // Three loose knots rather than an even spread.
      x: [22, 52, 78][i % 3] + (a - 0.5) * 30,
      y: [42, 62, 38][i % 3] + (b - 0.5) * 34,
      size: 2.2 + c * 3.4,
    },
  };
});

export function ThreeMeanings() {
  const [mode, setMode] = useState<Mode>("finnish");
  const liveId = useId();

  const active = MEANINGS.find((meaning) => meaning.id === mode) ?? MEANINGS[0];

  return (
    <section
      id="meanings"
      data-three-meanings=""
      className="scroll-mt-28 relative overflow-hidden border-t border-border-custom py-24 md:py-32"
    >
      {/* Ground tint. One layer per mode, cross-faded. */}
      {MEANINGS.map((meaning) => (
        <div
          key={meaning.id}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none [transition:opacity_900ms_cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
          style={{
            background: meaning.tint,
            opacity: meaning.id === mode ? 1 : 0,
          }}
        />
      ))}

      {/* The point field. Same points, three arrangements. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        data-meaning-field=""
      >
        {POINTS.map((point, index) => {
          const state = point[mode];
          return (
            <span
              key={index}
              data-meaning-point=""
              className="absolute rounded-full [transition:transform_900ms_cubic-bezier(0.4,0,0.2,1),width_900ms_ease,height_900ms_ease,background-color_900ms_ease,box-shadow_900ms_ease] motion-reduce:transition-none"
              style={{
                left: 0,
                top: 0,
                width: `${state.size}px`,
                height: `${state.size}px`,
                transform: `translate(${state.x}vw, ${state.y}%)`,
                backgroundColor: active.point,
                boxShadow: active.glow,
                opacity: 0.75,
              }}
            />
          );
        })}
      </div>

      <div className="relative px-6 md:px-12 max-w-[1700px] mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-10">
          04 / One name
        </span>

        {/* The word does not move. Everything around it does. */}
        <p className="font-display font-normal text-[22vw] md:text-[16vw] leading-[0.8] tracking-[-0.04em] text-foreground select-none">
          Loomie
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          {MEANINGS.map((meaning) => {
            const isActive = meaning.id === mode;
            return (
              <button
                key={meaning.id}
                type="button"
                aria-pressed={isActive}
                onMouseEnter={() => setMode(meaning.id)}
                onFocus={() => setMode(meaning.id)}
                onClick={() => setMode(meaning.id)}
                className={`px-5 py-2.5 rounded-none border font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground-secondary border-border-custom hover:text-foreground hover:border-foreground"
                }`}
              >
                {meaning.language}
              </button>
            );
          })}
        </div>

        <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-accent-warm">
          {active.state}
        </p>

        {/* Hover and focus both change the section, so the change is announced. */}
        <p id={liveId} aria-live="polite" className="sr-only">
          {`${active.language}: ${active.state}`}
        </p>
      </div>
    </section>
  );
}
