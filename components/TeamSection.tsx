import React from "react";
import Image from "next/image";
import type { TeamMember } from "@/lib/content-types";
import { LoomieLogoMark } from "./LoomieLogoMark";

/**
 * The people, as they actually are on the day this ships.
 *
 * Seven names and seven roles were supplied. No bios, no photographs, no
 * employment history — so there are none here. That is a deliberate constraint
 * rather than an unfinished one: a studio page that invents a paragraph about
 * somebody's career, or fills the portrait slot with a stock photograph of a
 * person who does not work here, has told its first lie about the one subject
 * where lying is least forgivable.
 *
 * So the layout has to be good with the fields empty and better with them
 * filled, which is a useful thing to design for anyway. A member with no photo
 * gets a numbered plate — the studio's own mark on its own ground, which is
 * what the rest of the site's imagery is made of — rather than a grey avatar or
 * a circle of initials pretending to be a face. When somebody uploads a real
 * photograph and writes a real sentence, both simply appear.
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

export function TeamSection({ team }: { team: TeamMember[] }) {
  if (team.length === 0) return null;

  const withoutBios = team.every((member) => !member.shortBio);

  return (
    <section id="team" className="px-6 md:px-12 max-w-[1700px] mx-auto py-16 md:py-20">
      <div className="flex flex-wrap items-baseline justify-between gap-6 mb-10 md:mb-14">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          The team
        </h2>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground-secondary">
          {team.length} {team.length === 1 ? "person" : "people"}
        </span>
      </div>

      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14">
        {team.map((member) => (
          <Member key={member.slug} member={member} />
        ))}
      </ul>

      {/* Said out loud rather than left as an absence somebody has to notice.
          It disappears the moment anybody writes a line about themselves. */}
      {withoutBios ? (
        <p className="mt-14 max-w-md text-sm leading-snug text-foreground-secondary border-t border-border-custom pt-6">
          Names and roles only, for now. Nobody has written their own
          introduction yet, and we would rather leave the space than fill it
          with something they did not say.
        </p>
      ) : null}
    </section>
  );
}
