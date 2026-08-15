"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import type { TeamMember } from "@/lib/content-types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { TeamRoster } from "./TeamRoster";

/**
 * The team, as a ring you can push around — with the information in the DOM.
 *
 * The division of labour is the whole design. The ring draws portraits and
 * reports which one is in front; everything a person actually needs — the
 * name, the role, the bio, the links — is ordinary HTML underneath it. Text
 * drawn into a WebGL texture is invisible to a screen reader, to find-in-page,
 * to a search engine and to anybody who copies it, so nothing important is
 * ever put there.
 *
 * That also makes the fallbacks honest rather than apologetic. Somebody on a
 * machine without WebGL, somebody who asked for reduced motion, and somebody
 * on a phone all get the roster — which was never a lesser version, because it
 * is where the content lived the whole time.
 *
 * ── Loading ──────────────────────────────────────────────────────────────
 * The WebGL layer is imported dynamically with `ssr: false`, so `ogl` is in a
 * chunk that only /about ever asks for. The homepage does not pay for it, and
 * neither does a visitor who gets the roster.
 */

/** Below this the ring is not the right shape and the roster is better. */
const WIDE = "(min-width: 1024px)";

const TeamRing = dynamic(() => import("./team/TeamRing").then((m) => m.TeamRing), {
  ssr: false,
  loading: () => null,
});

/**
 * Whether this browser can actually give us a context.
 *
 * Asked once and cached: creating a context to find out is not free, and the
 * answer cannot change while the page is open.
 */
let webglAnswer: boolean | null = null;
function hasWebGL() {
  if (webglAnswer !== null) return webglAnswer;
  try {
    const canvas = document.createElement("canvas");
    webglAnswer = Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    webglAnswer = false;
  }
  return webglAnswer;
}

/**
 * Is this a screen the ring suits, on a machine that can draw it?
 *
 * Read through useSyncExternalStore rather than measured into state from an
 * effect. Setting state in an effect is a render, a paint, and then a second
 * render — so the roster would appear and be replaced by the ring a frame
 * later, which is a visible flash on every load. It is also what
 * react-hooks/set-state-in-effect exists to stop.
 *
 * The server snapshot is false, so the roster is what gets sent — which is
 * what a crawler reads and what survives a failed hydration.
 */
const subscribeWide = (notify: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const readWide = () => window.matchMedia(WIDE).matches && hasWebGL();
const readWideServer = () => false;

export function TeamGallery({ team }: { team: TeamMember[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const suitable = useSyncExternalStore(subscribeWide, readWide, readWideServer);

  /** The ring is the enhancement; the roster is the page. */
  const enhanced = suitable && !prefersReducedMotion;

  const move = useCallback(
    (delta: number) =>
      setActive((current) => Math.max(0, Math.min(team.length - 1, current + delta))),
    [team.length]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(team.length - 1);
    }
  };

  const current = team[active];
  const elsewhere = useMemo(
    () =>
      current
        ? [
            { label: "LinkedIn", url: current.linkedinUrl },
            { label: "Instagram", url: current.instagramUrl },
            { label: "X / Twitter", url: current.twitterUrl },
          ].filter((link): link is { label: string; url: string } => Boolean(link.url))
        : [],
    [current]
  );

  if (team.length === 0) return null;
  if (!enhanced) return <TeamRoster team={team} />;

  return (
    <div className="mt-4">
      {/*
        The ring itself. Focusable and keyboard-driven, labelled as a group
        rather than left as a decorative canvas somebody can tab into and find
        nothing to do with.
      */}
      <div
        ref={listRef}
        role="group"
        aria-label="Team portraits"
        aria-describedby="team-gallery-help"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative h-[min(56vh,480px)] w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <TeamRing members={team} active={active} onActiveChange={setActive} />
      </div>

      <p id="team-gallery-help" className="sr-only">
        Use the left and right arrow keys, or the previous and next buttons, to
        move through the team. Each person&rsquo;s details are shown below the
        portraits.
      </p>

      {/*
        ── The part that matters ──────────────────────────────────────────
        Live region, so moving the ring announces who is now in front instead
        of changing a picture silently.
      */}
      <div className="mt-10 grid grid-cols-12 gap-x-8 gap-y-6 items-start">
        <div className="col-span-12 md:col-span-7" aria-live="polite" aria-atomic="true">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
              {current.index}
            </span>
            <h3 className="font-display font-normal text-3xl md:text-4xl leading-none text-foreground">
              {current.name}
            </h3>
          </div>

          <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
            {current.role}
          </p>

          {current.shortBio ? (
            <p className="mt-4 max-w-md text-sm md:text-base leading-snug text-foreground-secondary">
              {current.shortBio}
            </p>
          ) : null}

          {elsewhere.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {elsewhere.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-4 md:col-start-9 flex items-center justify-between gap-6 border-t border-border-custom pt-4">
          <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
            {current.index} / {String(team.length).padStart(2, "0")}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={active === 0}
              className="px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground disabled:opacity-30 disabled:hover:text-foreground-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">Previous team member</span>
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={active === team.length - 1}
              className="px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground disabled:opacity-30 disabled:hover:text-foreground-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span aria-hidden="true">→</span>
              <span className="sr-only">Next team member</span>
            </button>
          </div>
        </div>
      </div>

      {/*
        Every member, always in the document. The ring shows one at a time and
        this is what a screen reader, a crawler and find-in-page read — so
        somebody looking for a colleague by name finds them whether or not the
        picture of them happens to be in front.
      */}
      <ul className="sr-only">
        {team.map((member) => (
          <li key={member.slug}>
            {member.index}. {member.name}, {member.role}.
            {member.shortBio ? ` ${member.shortBio}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
