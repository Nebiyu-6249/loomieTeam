import React from "react";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { ROLE_LABEL, canAdminister, type Admin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

/**
 * The frame every admin page sits in.
 *
 * A sidebar of sections, a header saying who is signed in, and the page. No
 * animation, no reveal, no scroll hijacking — the site's motion system is for
 * a page being looked at, and this one is being worked in.
 *
 * The section list is filtered by role here *and* every page re-checks for
 * itself, because hiding a link is a courtesy and not a control: a link an
 * editor cannot see is still a URL an editor can type.
 */

export interface Section {
  href: string;
  label: string;
  /** Owners and admins only. */
  restricted?: boolean;
}

export const SECTIONS: Section[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/projects", label: "Work" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/sectors", label: "Sectors" },
  { href: "/admin/engagements", label: "Engagements" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/bookings", label: "Bookings", restricted: true },
  { href: "/admin/enquiries", label: "Enquiries", restricted: true },
  { href: "/admin/social", label: "Social links", restricted: true },
  { href: "/admin/settings", label: "Settings", restricted: true },
  { href: "/admin/people", label: "Administrators", restricted: true },
];

export function AdminShell({
  admin,
  title,
  description,
  actions,
  children,
}: {
  admin: Admin;
  title: string;
  description?: string;
  /** Buttons or links belonging to this page, set beside its heading. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sections = SECTIONS.filter(
    (section) => !section.restricted || canAdminister(admin.role)
  );

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] min-h-screen">
      <aside className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-border-custom px-6 py-6 lg:py-8">
        <Link
          href="/admin"
          className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          Loomie admin
        </Link>

        <AdminNav sections={sections} />

        <div className="mt-10 pt-6 border-t border-border-custom">
          <p className="text-sm text-foreground">{admin.name}</p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary">
            {ROLE_LABEL[admin.role]}
          </p>

          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Sign out
            </button>
          </form>

          <Link
            href="/"
            className="mt-4 inline-block font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            View the site
          </Link>
        </div>
      </aside>

      <main id="main" className="px-6 md:px-10 py-8 md:py-12 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-border-custom">
          <div>
            <h1 className="font-display font-normal text-3xl md:text-4xl leading-none text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-xl text-sm leading-snug text-foreground-secondary">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-5">{actions}</div> : null}
        </header>

        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
