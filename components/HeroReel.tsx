"use client";

import React, { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import type { Service } from "@/lib/content-types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The hero's right-hand system: four services as one spatial object.
 *
 * ── What was wrong with the version before this ──────────────────────────
 * The previous reel was a closed prism: four faces at 90° on a drum, the drum
 * pushed back by its own radius so the front face landed exactly on the frame.
 * Geometrically that was correct, and visually it was self-defeating. A face at
 * 90° is edge-on to the viewer, so it projects to a hairline; a face at 180° is
 * pointing away and `backface-visibility: hidden` removed it entirely. The
 * result at rest was one rectangular photograph filling the frame, with its
 * neighbours reduced to invisible slivers and the stage clipping whatever was
 * left. The three-dimensionality existed only during the 550ms of the turn — so
 * a still screenshot of the hero was indistinguishable from a flat image card,
 * which is exactly what it was meant to replace.
 *
 * ── What this is instead ─────────────────────────────────────────────────
 * An open stack rather than a closed solid. The planes are never edge-on and
 * never face away: they fan back and to the side, each one further in Z, offset
 * in X and Y, turned a few degrees and dimmed. The active plane is dominant and
 * square to the reader; the previous one sits low and to the left; the next two
 * step up and back to the right. Depth is legible without motion, which is the
 * whole point — the object reads as an object in a screenshot.
 *
 * Choosing a service re-slots every plane at once, so the selected one comes
 * forward, the last one recedes and the neighbours visibly reorganise. That is
 * the same argument the old one was trying to make, made where it can be seen.
 *
 * ── Why CSS 3D and not another renderer ──────────────────────────────────
 * The homepage defers three.js until Snow → River → Light is near, and that work
 * is worth keeping. A handful of planes on an arc is exactly what CSS transforms
 * are for: no context, no shaders, nothing added to the initial load, and the
 * images stay ordinary next/image so they are resized and cached.
 *
 * ── Restraint ────────────────────────────────────────────────────────────
 * Nothing spins. There is a slow depth drift measured in single degrees, and an
 * auto-advance that runs only before the visitor has touched anything and only
 * when reduced motion is off. The first hover, focus, click, key or swipe ends
 * the auto-advance for the session — an object that keeps moving after you have
 * taken hold of it is a demo, not a control.
 *
 * Reduced motion keeps the layered composition exactly as it is and replaces the
 * rotation with a direct move: same depth, same reading, no turning.
 */

/** Inside the 500–700ms the direction calls for. */
const TURN = 0.62;

/** How long the stack advances by itself before anybody interacts. */
const IDLE_INTERVAL = 5.5;

/** Deep enough to be dimensional, shallow enough not to distort. */
const PERSPECTIVE = 1900;

const COMPACT = "(max-width: 767px)";

interface Slot {
  x: number;
  y: number;
  z: number;
  ry: number;
  scale: number;
  opacity: number;
}

/**
 * Where each plane sits, by its signed distance from the active one.
 *
 * 0 is the face being read. +1 and +2 step back and to the right, so what is
 * coming next is visible before it arrives. −1 drops low and left, so what has
 * just left is still on the page rather than having vanished. The asymmetry is
 * deliberate: a symmetrical fan reads as an ornament, and this has to read as a
 * sequence with a position in it.
 */
const WIDE: Record<string, Slot> = {
  "0": { x: -152, y: 0, z: 0, ry: -7, scale: 1, opacity: 1 },
  "1": { x: 12, y: -48, z: -230, ry: -17, scale: 0.9, opacity: 0.54 },
  "2": { x: 106, y: -86, z: -430, ry: -23, scale: 0.82, opacity: 0.28 },
  "-1": { x: -282, y: 56, z: -180, ry: 6, scale: 0.9, opacity: 0.44 },
};

/** The same idea with the offsets pulled in, so nothing leaves a phone screen. */
const NARROW: Record<string, Slot> = {
  "0": { x: -10, y: 0, z: 0, ry: -5, scale: 1, opacity: 1 },
  "1": { x: 66, y: -26, z: -170, ry: -13, scale: 0.9, opacity: 0.5 },
  "2": { x: 112, y: -46, z: -320, ry: -18, scale: 0.83, opacity: 0.24 },
  "-1": { x: -86, y: 30, z: -140, ry: 5, scale: 0.9, opacity: 0.38 },
};

/** Signed distance from the active index: 0, +1, +2, −1 for four services. */
function offsetFrom(index: number, active: number, count: number) {
  let offset = ((index - active) % count + count) % count;
  if (offset > count / 2) offset -= count;
  return offset;
}

function slotFor(offset: number, compact: boolean): Slot {
  const table = compact ? NARROW : WIDE;
  const key = String(offset);
  if (table[key]) return table[key];
  // More than four services: keep stepping back rather than falling over.
  const far = table[offset < 0 ? "-1" : "2"];
  return { ...far, opacity: 0, z: far.z - 120 };
}

export function HeroReel({
  services,
  active,
  onIdleAdvance,
  /** A swipe on the object itself, so a phone is not index-only. */
  onSwipe,
  engaged,
  labelledBy,
}: {
  services: Service[];
  active: number;
  onIdleAdvance: (index: number) => void;
  onSwipe: (index: number) => void;
  engaged: boolean;
  labelledBy: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const planesRef = useRef<(HTMLDivElement | null)[]>([]);

  const compact = useSyncExternalStore(subscribeCompact, readCompact, readCompactServer);

  const count = services.length;

  /* ── Placing the planes ───────────────────────────────────────────────── */

  useEffect(() => {
    if (count === 0) return;

    planesRef.current.forEach((plane, index) => {
      if (!plane) return;
      const slot = slotFor(offsetFrom(index, active, count), compact);

      const to = {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        z: slot.z,
        rotateY: slot.ry,
        scale: slot.scale,
        opacity: slot.opacity,
        // Nearer planes over further ones. preserve-3d sorts by depth on its
        // own, but opacity makes each plane its own stacking context and the
        // sorting stops being reliable — so it is stated.
        zIndex: 100 - Math.abs(offsetFrom(index, active, count)),
      };

      if (prefersReducedMotion) {
        // The composition is kept; only the turning is dropped. rotateY is
        // flattened so nothing rotates, and the move is direct.
        gsap.to(plane, {
          ...to,
          rotateY: 0,
          duration: 0.25,
          ease: "none",
          overwrite: true,
        });
        return;
      }

      gsap.to(plane, { ...to, duration: TURN, ease: "power3.out", overwrite: true });
    });
  }, [active, compact, count, prefersReducedMotion]);

  /* ── The slow advance, until somebody takes over ──────────────────────── */

  useEffect(() => {
    if (engaged || prefersReducedMotion || count < 2) return;

    const tick = gsap.delayedCall(IDLE_INTERVAL, function advance() {
      onIdleAdvance((active + 1) % count);
      tick.restart(true);
    });

    return () => {
      tick.kill();
    };
  }, [engaged, prefersReducedMotion, count, onIdleAdvance, active]);

  /* ── Idle depth drift ─────────────────────────────────────────────────── */

  useEffect(() => {
    const drift = driftRef.current;
    if (!drift || prefersReducedMotion) return;

    // Single digits, over six seconds. Enough that the object is alive when
    // nothing is happening; not enough to read as an animation.
    const tween = gsap.to(drift, {
      z: 26,
      rotateY: 2.2,
      duration: 6,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    return () => {
      tween.kill();
    };
  }, [prefersReducedMotion]);

  /* ── Pointer parallax ─────────────────────────────────────────────────── */

  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // On its own wrapper: the drift owns the element inside it and the planes
    // own themselves, so no two animations write the same transform.
    const turn = gsap.quickTo(tilt, "rotateY", { duration: 0.9, ease: "power3.out" });
    const lift = gsap.quickTo(tilt, "rotateX", { duration: 0.9, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      turn(x * 3.4);
      lift(y * -1.8);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.to(tilt, { rotateY: 0, rotateX: 0, duration: 0.4 });
    };
  }, [prefersReducedMotion]);

  /* ── Swipe ────────────────────────────────────────────────────────────── */

  const gesture = useRef<{ x: number; y: number; used: boolean } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    gesture.current = { x: event.clientX, y: event.clientY, used: false };
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const start = gesture.current;
      if (!start || start.used || count < 2) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;

      // Vertical intent belongs to the page. Nothing is prevented here, ever —
      // a hero that eats a downward swipe is a hero nobody can scroll past.
      if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy)) return;

      start.used = true;
      onSwipe(dx < 0 ? (active + 1) % count : (active - 1 + count) % count);
    },
    [active, count, onSwipe]
  );

  const endGesture = useCallback(() => {
    gesture.current = null;
  }, []);

  if (count === 0) return null;

  return (
    <div
      ref={stageRef}
      id="hero-visual"
      role="tabpanel"
      aria-labelledby={labelledBy}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      // No overflow clipping: the object is meant to sit *in* space with room
      // around it, and a clip is what made the last one read as a picture in a
      // frame. touch-action stays on the page so vertical scrolling is native.
      className="relative mt-4 h-[70vw] max-h-[460px] sm:h-[46vw] sm:max-h-[480px] lg:h-auto lg:max-h-none lg:flex-1 lg:min-h-[520px] touch-pan-y"
      style={
        prefersReducedMotion
          ? undefined
          : { perspective: `${PERSPECTIVE}px`, perspectiveOrigin: "55% 45%" }
      }
    >
      <div
        ref={tiltRef}
        className="absolute inset-0"
        style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
      >
        <div
          ref={driftRef}
          className="absolute inset-0"
          style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
        >
          {services.map((service, index) => {
            const current = index === active;

            return (
              <div
                key={service.id}
                ref={(node) => {
                  planesRef.current[index] = node;
                }}
                data-hero-plane={index}
                data-hero-active={current ? "true" : "false"}
                // Sized off the stage's height so the fan has room on either
                // side — the negative space is what makes it read as an object
                // rather than as another full-bleed image.
                className="absolute left-1/2 top-1/2 h-[80%] lg:h-[92%] aspect-[3/4] border border-border-custom bg-surface-card shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)]"
                style={
                  prefersReducedMotion
                    ? undefined
                    : { transformStyle: "preserve-3d", backfaceVisibility: "hidden" }
                }
                aria-hidden={current ? undefined : true}
              >
                <Image
                  src={service.hero.src}
                  alt={current ? service.hero.alt : ""}
                  fill
                  priority={index === 0}
                  quality={82}
                  sizes="(max-width: 767px) 60vw, (max-width: 1024px) 40vw, 26vw"
                  className="object-cover"
                />

                {/* The number, on every plane. It is what makes the stack
                    legible as four services rather than four pictures, and it
                    is the same device the rest of the site indexes with. */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 bottom-0 px-3 py-2 font-mono text-[0.65rem] tracking-[0.18em] text-foreground"
                >
                  {service.number}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── The compact query, read without setState in an effect ──────────────── */

function subscribeCompact(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia(COMPACT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readCompact() {
  return window.matchMedia(COMPACT).matches;
}

/** The server cannot know; the wide layout is the one worth rendering first. */
function readCompactServer() {
  return false;
}
