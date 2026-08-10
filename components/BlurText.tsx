"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Per-character reveal: the one place in this codebase where filter is
 * animated. It is expensive, so the cost is contained three ways: a hard
 * character ceiling, will-change set only for the duration of the tween, and
 * nothing at all rendered under reduced motion.
 *
 * This replaces SplitType, so there is one text-splitting mechanism here.
 */

const MAX_CHARACTERS = 60;

const FROM = { opacity: 0, y: 24, filter: "blur(10px)" } as const;
const TO = { opacity: 1, y: 0, filter: "blur(0px)" } as const;

const DEFAULT_DURATION = 0.8;
const DEFAULT_STAGGER = 0.03;
const EASE = "power3.out";

const reducedMotionQuery = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)");

const subscribeToReducedMotion = (onChange: () => void) => {
  const query = reducedMotionQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getReducedMotion = () => reducedMotionQuery().matches;

/** The server cannot know, so it renders the animatable markup. */
const getReducedMotionServer = () => false;

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getReducedMotionServer
  );
}

interface BlurTextProps {
  text: string;
  /** Defaults to span. */
  as?: React.ElementType;
  trigger?: "mount" | "scroll";
  /** Seconds before the tween starts. */
  delay?: number;
  className?: string;
  /**
   * Applied to the last word wrapper. Several headings on this site style
   * their final word, and splitting the string would otherwise lose that.
   */
  lastWordClassName?: string;
  /**
   * Optional overrides. The defaults are the specified 0.8s / 0.03s; the page
   * transition runs faster because it has a sub-650ms budget to fit inside.
   */
  duration?: number;
  stagger?: number;
  /**
   * Resolves when the tween may start. Pass a stable module-level function,
   * not an inline closure, or the effect will re-run on every render.
   */
  waitFor?: () => Promise<void>;
}

export function BlurText({
  text,
  as: Tag = "span",
  trigger = "scroll",
  delay = 0,
  className,
  lastWordClassName,
  duration = DEFAULT_DURATION,
  stagger = DEFAULT_STAGGER,
  waitFor,
}: BlurTextProps) {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && text.length > MAX_CHARACTERS) {
      console.warn(
        `BlurText: "${text.slice(0, 40)}..." is ${text.length} characters, over the ${MAX_CHARACTERS} character ceiling. Animating filter across that many elements is expensive. Split it or use a plain heading.`
      );
    }

    if (prefersReducedMotion) return;

    const root = rootRef.current;
    if (!root) return;

    const characters = root.querySelectorAll<HTMLElement>("[data-blur-char]");
    if (characters.length === 0) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Applied immediately so the characters are already hidden before the
        // tween is allowed to start, however long waitFor takes.
        gsap.set(characters, { ...FROM, willChange: "filter, transform" });

        const settle = () => {
          // Leaving will-change on permanently is worse than never setting it.
          gsap.set(characters, { willChange: "auto" });
        };

        const vars = {
          ...TO,
          duration,
          stagger,
          ease: EASE,
          delay,
          onComplete: settle,
        };

        if (trigger === "scroll") {
          const tween = gsap.to(characters, {
            ...vars,
            scrollTrigger: { trigger: root, start: "top 85%", once: true },
          });
          return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
          };
        }

        let cancelled = false;
        const play = () => {
          if (!cancelled) gsap.to(characters, vars);
        };

        if (waitFor) {
          waitFor().then(play);
        } else {
          play();
        }

        return () => {
          cancelled = true;
        };
      });
    }, root);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [text, trigger, delay, duration, stagger, waitFor, prefersReducedMotion]);

  // Plain text, no spans at all.
  if (prefersReducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ");

  return (
    <Tag ref={rootRef} className={className} aria-label={text}>
      {words.map((word, wordIndex) => (
        <React.Fragment key={`${word}-${wordIndex}`}>
          <span
            aria-hidden="true"
            className={`inline-block whitespace-nowrap${
              wordIndex === words.length - 1 && lastWordClassName
                ? ` ${lastWordClassName}`
                : ""
            }`}
          >
            {Array.from(word).map((character, characterIndex) => (
              <span
                key={characterIndex}
                data-blur-char=""
                aria-hidden="true"
                className="inline-block"
              >
                {character}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}
