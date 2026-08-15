import React from "react";
import type { TeamMember } from "@/lib/content-types";
import { TeamGallery } from "./TeamGallery";

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
 * gets a drawn plate carrying their number and the studio's own mark rather
 * than a grey avatar or a circle of initials pretending to be a face. When
 * somebody uploads a real photograph and writes a real sentence, both simply
 * appear — in the ring and in the roster, from the same rows.
 *
 * This file owns the framing; TeamGallery decides whether a visitor gets the
 * ring or the roster, and TeamRoster is the roster either way.
 */
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

      <TeamGallery team={team} />

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
