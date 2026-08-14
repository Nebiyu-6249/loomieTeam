import React from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { requireAdmin, canAdminister } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOverview, type Pair } from "@/lib/admin/counts";

/**
 * The overview: what is on the site, and what is waiting for somebody.
 *
 * Every number is counted in the database rather than typed here, and every one
 * of them is a link to the screen where it can be changed — a dashboard figure
 * that cannot be acted on is decoration.
 *
 * The two figures that matter most are at the top, because they are the only
 * ones with a person waiting at the other end: appointments nobody has
 * confirmed, and messages nobody has answered.
 */

export const dynamic = "force-dynamic";

function Count({
  href,
  label,
  value,
  note,
  urgent = false,
}: {
  href: string;
  label: string;
  value: number;
  note?: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block border-t border-border-custom pt-5 pb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground-secondary">
        {label}
      </span>
      {/* Zero is the good answer for the urgent figures, so it recedes rather
          than sitting at the same weight as a number somebody has to act on. */}
      <span
        className={`mt-3 block font-display font-normal text-5xl leading-none ${
          urgent && value === 0 ? "text-foreground-secondary" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {note ? (
        <span className="mt-2 block text-sm leading-snug text-foreground-secondary">
          {note}
        </span>
      ) : null}
    </Link>
  );
}

const published = (pair: Pair) =>
  pair.total === pair.published
    ? `All ${pair.total === 1 ? "one" : pair.total} published`
    : `${pair.published} of ${pair.total} published`;

export default async function AdminOverview() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdmin();
  const overview = await getOverview(canAdminister(admin.role));

  return (
    <AdminShell
      admin={admin}
      title={`Good to see you, ${admin.name.split(" ")[0]}`}
      description="Everything on the site is here. Changes go live as soon as they are saved."
    >
      {overview.bookings && overview.enquiries ? (
        <section className="mb-14">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-6">
            Waiting for somebody
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8">
            <Count
              href="/admin/bookings"
              label="Upcoming calls"
              value={overview.bookings.upcoming}
              note="Booked and still to happen"
            />
            <Count
              href="/admin/bookings?status=pending"
              label="Unconfirmed"
              value={overview.bookings.pending}
              note="The studio was not reached"
              urgent
            />
            <Count
              href="/admin/enquiries"
              label="Open enquiries"
              value={overview.enquiries.unanswered}
              note="New or being handled"
              urgent
            />
            <Count
              href="/admin/enquiries"
              label="All enquiries"
              value={overview.enquiries.total}
            />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-6">
          On the site
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8">
          <Count
            href="/admin/projects"
            label="Work"
            value={overview.projects.total}
            note={published(overview.projects)}
          />
          <Count
            href="/admin/services"
            label="Services"
            value={overview.services.total}
            note={published(overview.services)}
          />
          <Count
            href="/admin/team"
            label="Team"
            value={overview.team.total}
            note={published(overview.team)}
          />
          <Count
            href="/admin/sectors"
            label="Sectors"
            value={overview.sectors.total}
            note={published(overview.sectors)}
          />
          <Count
            href="/admin/partners"
            label="Partners"
            value={overview.partners.total}
            note={published(overview.partners)}
          />
          <Count
            href="/admin/media"
            label="Media"
            value={overview.media}
            note="Images available to every section"
          />
        </div>
      </section>
    </AdminShell>
  );
}
