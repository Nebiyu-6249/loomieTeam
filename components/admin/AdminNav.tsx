"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Section } from "./AdminShell";

/**
 * The section list, with the current one marked.
 *
 * A Client Component only because it needs the pathname. `aria-current` does
 * the work for anybody not looking at the colour, which is the half of "you are
 * here" that a highlight alone leaves out.
 */
export function AdminNav({ sections }: { sections: Section[] }) {
  const pathname = usePathname();

  return (
    <nav className="mt-8" aria-label="Admin sections">
      <ul className="space-y-1">
        {sections.map((section) => {
          // Overview is the root, so it would prefix-match everything.
          const active =
            section.href === "/admin"
              ? pathname === "/admin"
              : pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`block py-1.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  active
                    ? "text-foreground"
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
