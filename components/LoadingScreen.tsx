"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { LoomieEyes } from "./LoomieEyes";
import { markLoaderFinished } from "./loaderSignal";
import { publishLoader, whenSceneDrawing } from "./three/sceneStore";

/**
 * Plays on every hard load and never between routes.
 *
 * The gate is module-level rather than sessionStorage. Module state resets on
 * a hard page load or direct entry, and survives client-side navigation, which
 * is exactly the wanted behaviour. It is only ever set from an effect, so the
 * server module never flips it and SSR always renders the overlay, matching
 * the client's first render on a fresh load.
 *
 * A10: this is not a screen in front of the page, it is the page's first
 * frame. The particle field the page scrolls through is the same field that
 * assembles the mark here; the loader only drives it, and hands it over when
 * the counter reaches a hundred. What the overlay itself contributes is the
 * background hiding the page and the counter.
 */
let hasPlayed = false;

/**
 * Once per session rather than once per page load. Module state resets on a
 * hard reload, which meant the loader replayed every time somebody refreshed;
 * sessionStorage survives that and still clears when the tab closes, so a
 * returning visitor gets straight to the page.
 */
const SESSION_KEY = "loomie-loader-played";

const playedThisSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

const markPlayed = () => {
  hasPlayed = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode: the module flag still covers this tab's navigations */
  }
};

/**
 * The counter climb, and then the clear. Together under a second.
 *
 * This was 1.6s of counting plus 0.85s of wipe — two and a half seconds of
 * deliberately withholding the page to play an animation. Nobody arrives
 * wanting that twice.
 */
const COUNT_DURATION = 0.62;
const CLEAR_DURATION = 0.34;

export function LoadingScreen() {
  const [present, setPresent] = useState(() => !hasPlayed);
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Every exit path signals, so a waiter can never hang. This covers the
    // client-side navigation case, where the overlay never mounts at all.
    if (!present) {
      markLoaderFinished();
      return;
    }

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      playedThisSession()
    ) {
      markPlayed();
      markLoaderFinished();
      // Already display:none from the head script, so unmounting on the next
      // frame is invisible.
      const id = requestAnimationFrame(() => setPresent(false));
      return () => cancelAnimationFrame(id);
    }

    // Claim the field. This runs before the dynamically imported canvas has
    // mounted, so the first frame it ever draws is already the loader's.
    const state = { count: 0, form: 0, handoff: 0 };
    publishLoader({ form: 0, handoff: 0 });

    /**
     * The drawn mark holds the position until the particle mark can take it,
     * and then dissolves into it over whatever is left of the counter.
     *
     * Both halves of that matter. The scene arrives on a dynamic import and
     * can take longer to draw its first frame than the whole loader lasts, so
     * fading the drawn mark on a timer leaves the loading screen with no mark
     * on it at all. And fading it the moment the canvas draws is just as
     * wrong: the particles are still scattered across the viewport then, so
     * there is again nothing that reads as a mark. It hands over as the
     * particles assemble, not before.
     */
    let handedOver = false;
    let formAtHandover: number | null = null;

    whenSceneDrawing().then(() => {
      if (handedOver) return;
      formAtHandover = state.form;
    });

    const fadeDrawnMark = () => {
      if (formAtHandover === null || !markRef.current) return;
      const remaining = Math.max(1 - formAtHandover, 0.001);
      const done = Math.min((state.form - formAtHandover) / remaining, 1);
      markRef.current.style.opacity = String(1 - done);
    };

    const timeline = gsap.timeline({
      onComplete: () => {
        markPlayed();
        publishLoader({ form: 1, handoff: 1 });
        markLoaderFinished();
        setPresent(false);
      },
    });

    // The counter and the mark are the same motion: the particles fly in and
    // freeze as the number climbs.
    timeline.to(state, {
      count: 100,
      form: 1,
      duration: COUNT_DURATION,
      ease: "power2.inOut",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = String(
            Math.round(state.count)
          ).padStart(2, "0");
        }
        publishLoader({ form: state.form, handoff: state.handoff });
        fadeDrawnMark();
      },
    });

    // The crack and clear. The overlay wipes off the page while the field
    // disperses out of the mark, so the two are one movement rather than a
    // screen leaving and a scene arriving.
    timeline.to(
      state,
      {
        handoff: 1,
        duration: CLEAR_DURATION,
        ease: "power4.inOut",
        onUpdate: () => {
          publishLoader({ form: state.form, handoff: state.handoff });
        },
      },
      "+=0.15"
    );

    timeline.to(
      overlayRef.current,
      {
        clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
        duration: CLEAR_DURATION,
        ease: "power4.inOut",
      },
      "<"
    );

    return () => {
      handedOver = true;
      timeline.kill();
      // A torn-down loader must not leave the field frozen in the mark.
      publishLoader({ form: 1, handoff: 1 });
    };
  }, [present]);

  if (!present) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="loading-screen fixed inset-0 z-[999999] bg-background flex items-center justify-center select-none"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        willChange: "clip-path",
      }}
    >
      {/*
        The mark is the only flex child, so it sits on the viewport's centre
        and the particle mark — which is centred on the canvas — lands exactly
        on top of it. With the counter in the flow they were a group, centred
        together, and the two marks were sixty pixels apart.
      */}
      <div ref={markRef}>
        <LoomieEyes className="w-40 h-20 md:w-64 md:h-32" track={false} />
      </div>

      <span
        ref={counterRef}
        className="absolute left-1/2 -translate-x-1/2 top-[calc(50%+5.5rem)] font-mono text-5xl md:text-7xl font-bold tabular-nums tracking-tight text-foreground"
      >
        00
      </span>
    </div>
  );
}
