"use client";

import React from "react";
import Image from "next/image";
import type { TeamMember } from "@/lib/content-types";
import { LoomieLogoMark } from "./LoomieLogoMark";

/**
 * Every member, laid out and readable.
 *
 * Not a fallback in the apologetic sense — this is where the team's
 * information lives, and the ring on wide screens is a way of looking at the
 * same thing. It is what gets served, what a crawler indexes, what somebody
 * who asked for reduced motion keeps, what a machine without WebGL keeps, and
 * what a phone shows, because a curved ring of portraits is the wrong shape
 * for a narrow screen.
 */

function Portrait({ member }: { member: TeamMember }) {
  if (member.photo) {
    return (
      <Image
        src={member.photo.src}
        alt={member.photo.alt}
        fill
        quality={82}
        loading="lazy"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
        className="object-cover"
      />
    );
  }

  /**
   * No photograph yet. A numbered plate, which says "this slot is empty"
   * without drawing a person who does not exist.
   */
  return (
    <div
      // Decorative. The number and the name are set below the frame, and a
      // screen reader announcing "01, 01, Mohamed Ragab" is the plate reading
      // out something the row already says.
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-surface-card"
    >
      <LoomieLogoMark className="w-14 h-7 text-foreground-secondary/45" />
      <span className="font-mono text-[0.7rem] tracking-[0.22em] text-foreground-secondary/70">
        {member.index}
      </span>
    </div>
  );
}

function Member({ member }: { member: TeamMember }) {
  const elsewhere = [
    { label: "LinkedIn", url: member.linkedinUrl },
    { label: "Instagram", url: member.instagramUrl },
    { label: "Twitter", url: member.twitterUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return (
    <li className="flex flex-col">
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-surface-card">
        <Portrait member={member} />
      </div>

      <div className="mt-5 flex items-baseline gap-4 border-t border-border-custom pt-4">
        <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary shrink-0">
          {member.index}
        </span>
        <h3 className="font-display font-normal text-2xl md:text-[1.75rem] leading-none text-foreground">
          {member.name}
        </h3>
      </div>

      <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
        {member.role}
      </p>

      {member.shortBio ? (
        <p className="mt-4 text-sm leading-snug text-foreground-secondary">
          {member.shortBio}
        </p>
      ) : null}

      {elsewhere.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {elsewhere.map((link) => (
            <li key={link.label}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-[250ms] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TeamRoster({ team }: { team: TeamMember[] }) {
  if (team.length === 0) return null;

  return (
    <ul className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14">
      {team.map((member) => (
        <Member key={member.slug} member={member} />
      ))}
    </ul>
  );
}
