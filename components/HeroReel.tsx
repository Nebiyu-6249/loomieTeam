"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import type { Service } from "@/lib/content-types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The hero's right-hand system: four services on one turning object.
 *
 * The problem it replaces was not that the old treatment was ugly — it was
 * that it was disconnected. Four images cross-fading in the same rectangle
 * gave no sense that they were four faces of one thing, so pointing at a
 * service in the index and watching a picture change read as a slideshow with
 * a remote control rather than as a system answering a question.
 *
 * So this is one object with four faces, and the index turns it. A visitor can
 * see the next artefact coming and the last one leaving, which is the whole
 * argument the studio is making — that these are four parts of one practice —
 * demonstrated instead of asserted.
 *
 * ── Why CSS 3D and not another renderer ──────────────────────────────────
 * The homepage already defers three.js until Snow → River → Light is near, and
 * that work is worth keeping. Four planes on a rotating drum is exactly what
 * CSS transforms are for: no context to create, no shaders to compile, no
 * bytes added to the initial load, and the images are ordinary next/image so
 * they are still resized, lazy where appropriate and cached.
 *
 * ── The mechanism ────────────────────────────────────────────────────────
 * A perspective stage, a drum inside it, four faces on the drum. Each face is
 * rotated a quarter turn further round the X axis and pushed out along Z by
 * the drum's radius, so they sit on the surface of a square prism. Turning the
 * drum by −90° per service brings the next face to the front.
 *
 * The drum itself is pushed *back* by that same radius, which is the part that
 * is easy to leave out and immediately obvious when you do: without it the
 * front face sits a whole radius nearer the viewer than the frame, perspective
 * magnifies it by about fifteen percent, and the artefact spills over the edges
 * of the composition it is supposed to sit inside. Moving the drum back lands
 * the front face exactly on the frame plane at exactly its true size, and every
 * other face behind it.
 *
 * The radius is measured rather than assumed, because the stage is fluid and a
 * hardcoded one makes the faces float or sink at every width except the one it
 * was written at.
 *
 * ── Restraint ────────────────────────────────────────────────────────────
 * Nothing spins on its own once anybody has touched it. Before that, and only
 * when reduced motion is off, it advances slowly so a visitor who has not
 * realised the index is interactive still sees that the thing moves; the first
 * hover, focus, click or tap ends that for the rest of the session.
 *
 * Reduced motion gets no rotation at all — the faces stack flat and cross-fade,
 * which is the same information without the movement.
 */

/** Long enough to read as a turn, short enough not to be waited on. */
const TURN = 0.55;

/** How long the reel advances by itself before anybody interacts. */
const IDLE_INTERVAL = 5.5;

/** Within the 1600–2200px band: deep enough to be dimensional, not a fisheye. */
const PERSPECTIVE = 1800;

export function HeroReel({
  services,
  active,
  /** Called when the reel advances itself, so the index stays in step. */
  onIdleAdvance,
  /** True once the visitor has done anything at all. */
  engaged,
  labelledBy,
}: {
  services: Service[];
  active: number;
  onIdleAdvance: (index: number) => void;
  engaged: boolean;
  labelledBy: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const drumRef = useRef<HTMLDivElement>(null);

  /** Measured, so the faces sit on the frame at every width. */
  const [radius, setRadius] = useState(0);

  /**
   * The drum's absolute angle, accumulated rather than derived.
   *
   * Deriving it as `active * -90` means going from the fourth service back to
   * the first unwinds three quarters of a turn backwards — a long, showy spin
   * that says something has gone wrong. Tracking the angle and moving by the
   * shortest signed step keeps every change one quarter turn.
   */
  const angle = useRef(0);
  const previous = useRef(active);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => setRadius(stage.getBoundingClientRect().height / 2);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /**
   * The drum sits a radius back, so the front face lands on the frame plane.
   *
   * Written through GSAP rather than as a style, because GSAP owns this
   * element's transform once it starts animating rotateX — setting the two
   * from different places means whichever writes last wins and the depth
   * silently disappears mid-turn.
   */
  useEffect(() => {
    const drum = drumRef.current;
    if (!drum || prefersReducedMotion) return;
    gsap.set(drum, { z: -radius, rotateX: angle.current });
  }, [radius, prefersReducedMotion]);

  /* ── The turn ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const drum = drumRef.current;
    const from = previous.current;
    previous.current = active;
    if (!drum || from === active || services.length === 0) return;

    // Shortest way round: -2 becomes +2, +3 becomes -1.
    const count = services.length;
    let step = active - from;
    if (step > count / 2) step -= count;
    if (step < -count / 2) step += count;

    angle.current -= step * (360 / count);

    if (prefersReducedMotion) {
      gsap.set(drum, { rotateX: angle.current });
      return;
    }

    gsap.to(drum, {
      rotateX: angle.current,
      duration: TURN,
      ease: "power3.out",
      overwrite: true,
    });
  }, [active, prefersReducedMotion, services.length]);

  /* ── The slow advance, until somebody takes over ──────────────────────── */

  useEffect(() => {
    if (engaged || prefersReducedMotion || services.length < 2) return;

    // A repeating call rather than a timeline: it advances the index through
    // the same path a hover would, so there is only one way the reel moves.
    const tick = gsap.delayedCall(IDLE_INTERVAL, function advance(this: gsap.core.Tween) {
      onIdleAdvance((previous.current + 1) % services.length);
      tick.restart(true);
    });

    return () => {
      tick.kill();
    };
  }, [engaged, prefersReducedMotion, services.length, onIdleAdvance]);

  /* ── Pointer parallax ─────────────────────────────────────────────────── */

  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // Applied to a wrapper, not the drum: the drum owns rotateX and writing
    // both onto one element means the two animations fight over `transform`.
    const turn = gsap.quickTo(tilt, "rotateY", { duration: 0.9, ease: "power3.out" });
    const lift = gsap.quickTo(tilt, "rotateX", { duration: 0.9, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      turn(x * 3.2);
      lift(y * -1.6);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.to(tilt, { rotateY: 0, rotateX: 0, duration: 0.4 });
    };
  }, [prefersReducedMotion]);

  const step = services.length > 0 ? 360 / services.length : 90;

  return (
    <div
      ref={stageRef}
      id="hero-visual"
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="relative mt-4 aspect-[4/5] sm:aspect-[3/2] lg:aspect-auto lg:flex-1 lg:min-h-[470px] overflow-hidden"
      style={
        prefersReducedMotion
          ? undefined
          : { perspective: `${PERSPECTIVE}px`, perspectiveOrigin: "50% 50%" }
      }
    >
      <div
        ref={tiltRef}
        className="absolute inset-0"
        style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
      >
        <div
          ref={drumRef}
          className="absolute inset-0"
          style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
        >
          {services.map((service, index) => {
            const current = index === active;

            /**
             * Flat and stacked under reduced motion; on the surface of the
             * drum otherwise. Before the stage has been measured the radius is
             * zero, which collapses the drum to a single plane — correct as a
             * first paint, and the measurement lands in the same frame.
             */
            const face: React.CSSProperties = prefersReducedMotion
              ? {
                  opacity: current ? 1 : 0,
                  visibility: current ? "visible" : "hidden",
                  transition: "opacity 450ms ease-out",
                }
              : {
                  transform: `rotateX(${index * step}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                };

            return (
              <div
                key={service.id}
                className="absolute inset-0 overflow-hidden bg-surface-card"
                style={face}
                // Only the face in front is part of the document for anyone
                // reading it rather than looking at it; the rest are scenery.
                aria-hidden={current ? undefined : true}
              >
                <Image
                  src={service.hero.src}
                  alt={current ? service.hero.alt : ""}
                  fill
                  priority={index === 0}
                  quality={82}
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
