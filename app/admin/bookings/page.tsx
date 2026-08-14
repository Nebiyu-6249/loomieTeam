import React from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { StatusPicker } from "@/components/admin/StatusPicker";
import { requireAdministrator } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { STUDIO_TIMEZONE } from "@/lib/availability";
import { setBookingStatus } from "./actions";
import type { BookingStatus } from "@/lib/supabase/types";

/**
 * The diary.
 *
 * Read-only except for the status, because a booking is a record of something
 * a visitor did and editing their name is rewriting it. Cancelling frees the
 * slot — the partial unique index only counts live bookings — so cancelling
 * here really does put the time back on the site.
 *
 * Two times per row. The studio's, because that is when somebody has to be at
 * a desk, and the visitor's, because that is what they will say on the call.
 */

export const dynamic = "force-dynamic";

const STATUSES: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
  { value: "cancelled", label: "Cancelled" },
];

/** Only a status this table actually has is worth filtering by. */
const isStatus = (value: string | undefined): value is BookingStatus =>
  STATUSES.some((option) => option.value === value);

interface Row {
  id: string;
  booking_code: string;
  name: string;
  email: string;
  start_at: string;
  visitor_timezone: string;
  note: string | null;
  status: string;
  visitor_confirmed: boolean;
  studio_notified: boolean;
  services: { title: string } | null;
}

const when = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(new Date(iso));

export default async function Bookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdministrator();
  const supabase = await serverClient();
  const { status } = await searchParams;

  const base = supabase
    .from("bookings")
    .select(
      `id, booking_code, name, email, start_at, visitor_timezone, note, status,
       visitor_confirmed, studio_notified, services:service_id ( title )`
    )
    .order("start_at", { ascending: false });

  const { data } = isStatus(status) ? await base.eq("status", status) : await base;
  const bookings = (data ?? []) as unknown as Row[];

  return (
    <AdminShell
      admin={admin}
      title="Bookings"
      description={`Intro calls, shown in the studio's time (${STUDIO_TIMEZONE}) and in the visitor's. Cancelling a booking puts its slot back on the site.`}
      actions={
        status ? (
          <Link
            href="/admin/bookings"
            className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Show all
          </Link>
        ) : null
      }
    >
      {bookings.length === 0 ? (
        <p className="text-sm text-foreground-secondary">
          {status ? `No ${status} bookings.` : "Nobody has booked a call yet."}
        </p>
      ) : (
        <ul className="border-t border-border-custom">
          {bookings.map((booking) => (
            <li key={booking.id} className="border-b border-border-custom py-6">
              <div className="grid grid-cols-12 gap-x-8 gap-y-4">
                <div className="col-span-12 md:col-span-4">
                  <p className="text-base text-foreground">
                    {when(booking.start_at, STUDIO_TIMEZONE)}
                  </p>
                  <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground-secondary">
                    Studio time
                  </p>
                  <p className="mt-3 text-sm text-foreground-secondary">
                    {when(booking.start_at, booking.visitor_timezone)}
                    <span className="block font-mono text-[0.65rem] uppercase tracking-[0.14em]">
                      Their time · {booking.visitor_timezone}
                    </span>
                  </p>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <p className="text-base text-foreground">{booking.name}</p>
                  <a
                    href={`mailto:${booking.email}`}
                    className="mt-1 block text-sm text-foreground-secondary break-all hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {booking.email}
                  </a>
                  <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground-secondary">
                    {booking.services?.title ?? "No service chosen"} · {booking.booking_code}
                  </p>

                  {booking.note ? (
                    <p className="mt-3 text-sm leading-snug text-foreground-secondary">
                      {booking.note}
                    </p>
                  ) : null}
                </div>

                <div className="col-span-12 md:col-span-3 md:col-start-10">
                  <StatusPicker
                    id={booking.id}
                    current={booking.status}
                    options={STATUSES}
                    action={setBookingStatus}
                    label={`Status for ${booking.name}`}
                  />

                  {/* Said plainly, because it changes what the studio should
                      do next: an unconfirmed visitor has not been told this is
                      happening. */}
                  {!booking.visitor_confirmed ? (
                    <p className="mt-4 text-sm leading-snug text-foreground">
                      No confirmation reached {booking.name.split(" ")[0]}. Worth
                      an email before the call.
                    </p>
                  ) : null}

                  {!booking.studio_notified ? (
                    <p className="mt-3 text-sm leading-snug text-foreground">
                      The studio was never notified by email — this row is the
                      only record.
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
