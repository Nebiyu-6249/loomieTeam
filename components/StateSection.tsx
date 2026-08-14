"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SceneAnchor } from "./three/SceneAnchor";
import { clearProgress, publishProgress } from "./three/sceneStore";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Snow, river, light — once, in one place.
 *
 * The idea used to be distributed across the entire site: the loader, the
 * page background temperature, the grain density, a route transition, a
 * scrolling paragraph about snow, a permanent particle field behind every
 * section, and a separate three-language morph. Spread that thin it stopped
 * being an idea and became weather.
 *
 * It happens here and nowhere else. Three states, three words, one field of
 * particles that actually changes between them, and then the page moves on.
 *
 * The three are not equals, and the section no longer pretends they are.
 * River is the primary echo: it is the state the studio's proposition is
 * actually about — material that has started moving and, in moving, connects
 * things that were separate. Snow and Light are secondary, and they are here
 * to give River its meaning: the before, where everything needed is present
 * but inert, and the after, where it has arrived and can be read. Set at the
 * same size all three read as a list of moods. Set with River larger, and
 * holding the middle half of the scroll, they read as one thing with a middle.
 */

const PROGRESS_ID = "state";

interface State {
  id: string;
  label: string;
  line: string;
  /** Where in the section's scroll this state is the current one. */
  at: number;
  /**
   * Primary carries the idea; secondary are the endpoints that give it a
   * shape. Nearest-state-wins already hands River the middle half of the
   * scroll — this is the same hierarchy said in type.
   */
  weight: "primary" | "secondary";
}

const STATES: State[] = [
  {
    id: "snow",
    label: "Snow",
    line: "Still, and holding everything it needs.",
    at: 0,
    weight: "secondary",
  },
  {
    id: "river",
    label: "River",
    line: "Moving, and now it connects things.",
    at: 0.5,
    weight: "primary",
  },
  {
    id: "light",
    label: "Light",
    line: "Arrived, and legible.",
    at: 1,
    weight: "secondary",
  },
];

/** One step apart, sharing a baseline so the change is in size, not position. */
const WEIGHT = {
  primary: "text-6xl md:text-8xl lg:text-9xl text-foreground",
  secondary: "text-5xl md:text-6xl lg:text-7xl text-foreground-secondary",
} as const;

export function StateSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=200%",
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        publishProgress(PROGRESS_ID, self.progress);
        // Nearest state wins, so the word matches what the field is doing.
        let nearest = 0;
        let best = Infinity;
        STATES.forEach((state, index) => {
          const distance = Math.abs(state.at - self.progress);
          if (distance < best) {
            best = distance;
            nearest = index;
          }
        });
        setActive(nearest);
      },
    });

    return () => {
      trigger.kill();
      clearProgress(PROGRESS_ID);
    };
  }, [prefersReducedMotion]);

  /**
   * Reduced motion gets the same three states as a legible list, with no
   * pin, no scrub and no canvas. The idea survives without the animation,
   * which is the test of whether it was an idea.
   */
  if (prefersReducedMotion) {
    return (
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto py-24 border-t border-border-custom">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-12">
          One idea, three states
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STATES.map((state) => (
            <div key={state.id}>
              <dt
                className={`font-display font-normal ${
                  state.weight === "primary"
                    ? "text-5xl md:text-6xl text-foreground"
                    : "text-3xl md:text-4xl text-foreground-secondary"
                }`}
              >
                {state.label}
              </dt>
              <dd className="mt-3 text-sm text-foreground-secondary">{state.line}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      data-state-section=""
      className="relative h-screen flex flex-col justify-end pb-[16vh] overflow-hidden"
    >
      {/* The field is drawn into the shared canvas across this whole block. */}
      <SceneAnchor id="state" className="absolute inset-0" />

      <div className="relative px-6 md:px-12 max-w-[1700px] mx-auto w-full">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          One idea, three states
        </h2>

        {/*
          The three words occupy the same place, so the change reads as one
          thing becoming another rather than a list scrolling past.
        */}
        <div className="relative mt-10 h-[7.5rem] md:h-[11rem]">
          {STATES.map((state, index) => (
            <p
              key={state.id}
              aria-hidden={index !== active}
              className={`absolute inset-x-0 bottom-0 font-display font-normal leading-none tracking-[-0.03em] transition-opacity duration-[500ms] ${
                WEIGHT[state.weight]
              }`}
              style={{ opacity: index === active ? 1 : 0 }}
            >
              {state.label}
            </p>
          ))}
        </div>

        <div className="relative h-6 mt-2">
          {STATES.map((state, index) => (
            <p
              key={state.id}
              aria-hidden={index !== active}
              className="absolute inset-0 text-sm md:text-base text-foreground-secondary transition-opacity duration-[500ms]"
              style={{ opacity: index === active ? 1 : 0 }}
            >
              {state.line}
            </p>
          ))}
        </div>
      </div>

      {/* Announced once, so a screen reader gets the idea without the scroll. */}
      <p className="sr-only">
        {STATES.map((state) => `${state.label}. ${state.line}`).join(" ")}
      </p>
    </section>
  );
}
