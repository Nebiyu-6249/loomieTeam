import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { SocialLink } from "@/lib/content-types";

/**
 * Where else the studio is, when it is anywhere else.
 *
 * Renders nothing at all when no account has been enabled, which is the state
 * the site ships in: no handles were supplied, so there is no LinkedIn icon
 * linking to a search page and no Instagram icon linking to the sign-in wall.
 * A dead social row is worse than no social row — it says the studio has an
 * account and cannot be bothered to point at it.
 *
 * The database enforces the same rule from the other end: a link cannot be
 * switched on without a URL, so there is no arrangement of settings that
 * produces a link to nowhere. Adding one is a two-field edit in the admin.
 */
export function SocialLinks({
  links,
  heading = "Elsewhere",
  className = "",
}: {
  links: SocialLink[];
  heading?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        {heading}
      </h2>

      <ul className="mt-6 border-t border-border-custom">
        {links.map((link) => (
          <li key={link.platform}>
            <a
              href={link.url}
              target="_blank"
              rel="me noopener noreferrer"
              className="group flex items-center justify-between gap-6 border-b border-border-custom py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span className="text-base md:text-lg text-foreground">{link.label}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="w-4 h-4 shrink-0 text-foreground-secondary transition-transform duration-[250ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
