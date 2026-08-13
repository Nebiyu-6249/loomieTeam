"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SERVICE_OPTIONS } from "@/lib/services";

/**
 * A twenty-minute intro call, booked in the visitor's own time.
 *
 * What this replaces: a live clock showing the time in Dubai. Handsome, and
 * it asked the visitor to do the arithmetic themselves.
 *
 * Every time on screen is formatted in the visitor's detected zone, with the
 * studio's own time shown beside it so nobody has to guess what they are
 * agreeing to. The zone can be changed by hand for anyone booking on behalf
 * of someone else, or travelling.
 *
 * The component holds no opinion about which slots exist. It asks the server,
 * shows what comes back, and sends an instant back for the server to check
 * again.
 */

interface Slot {
  start: string;
  studioTime: string;
}

interface Availability {
  studioTimezone: string;
  durationMinutes: number;
  slots: Slot[];
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "booked"; start: string }
  | { kind: "error"; message: string; field?: string };

/** A small, sane set plus whatever the visitor's browser reports. */
const COMMON_ZONES = [
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

/**
 * The visitor's zone is external state, not something to set from an effect:
 * the server does not have it, and reading it during render would hydrate
 * with whatever zone the server happens to be in. useSyncExternalStore is the
 * supported way to read a value the server cannot know.
 */
const subscribeZone = () => () => {};
const detectZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const serverZone = () => "UTC";

const dayKey = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const dayLabel = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));

const timeLabel = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

export function BookingPanel() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState(false);
  const detected = useSyncExternalStore(subscribeZone, detectZone, serverZone);
  /** Set only when the visitor picks a different one by hand. */
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const zone = chosenZone ?? detected;
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  /**
   * When the form appeared, for the server's minimum-fill check. Stamped from
   * the effect rather than the render: Date.now() during render is impure,
   * and the server's clock is not the one that matters here anyway.
   */
  const openedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    openedAt.current = Date.now();

    fetch("/api/availability")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Availability) => {
        if (cancelled) return;
        setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const slots = availability?.slots ?? [];

  // Group by the visitor's calendar day, not the studio's: a 10:00 Dubai slot
  // is the previous evening in Los Angeles, and putting it under the wrong
  // date is exactly the confusion this panel exists to remove.
  const days: { key: string; label: string; slots: Slot[] }[] = [];
  for (const entry of slots) {
    const key = dayKey(entry.start, zone);
    let group = days.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, label: dayLabel(entry.start, zone), slots: [] };
      days.push(group);
    }
    group.slots.push(entry);
  }

  const activeDay = days.find((candidate) => candidate.key === day) ?? days[0];
  const chosen = slots.find((entry) => entry.start === slot);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) return;

    const form = new FormData(event.currentTarget);
    setStatus({ kind: "sending" });

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: slot,
          name: form.get("name"),
          email: form.get("email"),
          service: form.get("service") || undefined,
          note: form.get("note") || undefined,
          company: form.get("company"),
          timezone: zone,
          openedAt: openedAt.current,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data?.error ?? "Something went wrong. Please email us instead.",
          field: data?.field,
        });
        return;
      }

      setStatus({ kind: "booked", start: data.start });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not reach the studio. Please email us instead.",
      });
    }
  }

  if (status.kind === "booked") {
    return (
      <div className="border border-border-custom p-8 md:p-10" role="status">
        <h3 className="font-display font-normal text-3xl text-foreground">
          Booked.
        </h3>
        <p className="mt-4 text-sm text-foreground-secondary">
          {dayLabel(status.start, zone)} at {timeLabel(status.start, zone)} — your
          time ({zone.replace("_", " ")}).
        </p>
        <p className="mt-2 text-sm text-foreground-secondary">
          A confirmation is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-custom min-w-0">
      <div className="flex items-baseline justify-between gap-4 border-b border-border-custom px-6 md:px-8 py-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
          Book a 20-minute intro
        </h3>
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-foreground-secondary">
          No charge
        </span>
      </div>

      <div className="px-6 md:px-8 py-7 min-w-0">
        {loadError && (
          <p className="text-sm text-foreground-secondary">
            The diary is not loading. Email{" "}
            <a
              href="mailto:hello@loomiestudio.com"
              className="text-foreground border-b border-foreground/40 hover:border-foreground"
            >
              hello@loomiestudio.com
            </a>{" "}
            and we will find a time.
          </p>
        )}

        {!loadError && !availability && (
          <p className="text-sm text-foreground-secondary">Loading times…</p>
        )}

        {!loadError && availability && days.length === 0 && (
          <p className="text-sm text-foreground-secondary">
            Nothing free in the next three weeks. Email{" "}
            <a
              href="mailto:hello@loomiestudio.com"
              className="text-foreground border-b border-foreground/40 hover:border-foreground"
            >
              hello@loomiestudio.com
            </a>
            .
          </p>
        )}

        {!loadError && availability && days.length > 0 && (
          <form onSubmit={submit} noValidate>
            {/* ── Day ─────────────────────────────────────────────── */}
            <fieldset className="min-w-0">
              <legend className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary mb-3">
                Day
              </legend>
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {days.slice(0, 10).map((entry) => {
                  const isActive = entry.key === activeDay?.key;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setDay(entry.key);
                        setSlot(null);
                      }}
                      className={`shrink-0 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.12em] border transition-colors duration-[250ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                        isActive
                          ? "border-foreground bg-foreground text-background"
                          : "border-border-custom text-foreground-secondary hover:text-foreground hover:border-foreground"
                      }`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Time ────────────────────────────────────────────── */}
            <fieldset className="mt-7">
              <legend className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary mb-3">
                Time
              </legend>
              <div className="flex flex-wrap gap-2">
                {activeDay?.slots.map((entry) => {
                  const isActive = entry.start === slot;
                  return (
                    <button
                      key={entry.start}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSlot(entry.start)}
                      className={`px-4 py-2.5 font-mono text-xs tracking-[0.12em] border transition-colors duration-[250ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                        isActive
                          ? "border-foreground bg-foreground text-background"
                          : "border-border-custom text-foreground-secondary hover:text-foreground hover:border-foreground"
                      }`}
                    >
                      {timeLabel(entry.start, zone)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Which zone these are in ─────────────────────────── */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground-secondary">
              <span>Times shown in</span>
              <label className="sr-only" htmlFor="booking-zone">
                Your timezone
              </label>
              <select
                id="booking-zone"
                value={zone}
                onChange={(event) => {
                  setChosenZone(event.target.value);
                  setDay(null);
                  setSlot(null);
                }}
                className="bg-transparent border-b border-border-custom py-1 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                {[...new Set([zone, ...COMMON_ZONES])].map((option) => (
                  <option key={option} value={option} className="bg-surface text-foreground">
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
              {chosen && (
                <span>
                  · {chosen.studioTime} in{" "}
                  {availability.studioTimezone.split("/")[1]?.replace("_", " ")}
                </span>
              )}
            </div>

            {/* ── Details ─────────────────────────────────────────── */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                  Name
                </span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  aria-invalid={status.kind === "error" && status.field === "name"}
                  className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-none"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={status.kind === "error" && status.field === "email"}
                  className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-none"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                  Service <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <select
                  name="service"
                  defaultValue=""
                  className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-none"
                >
                  <option value="" className="bg-surface text-foreground">
                    Not sure yet
                  </option>
                  {SERVICE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-surface text-foreground">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                  Note <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <input
                  name="note"
                  maxLength={1200}
                  className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-none"
                />
              </label>
            </div>

            {/* Honeypot. Hidden from people, irresistible to scripts. */}
            <div aria-hidden="true" className="absolute w-px h-px -m-px overflow-hidden opacity-0">
              <label htmlFor="booking-company">Company</label>
              <input id="booking-company" name="company" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button
                type="submit"
                disabled={!slot || status.kind === "sending"}
                className="px-7 py-3 bg-foreground text-background font-mono text-xs uppercase tracking-[0.16em] border border-foreground transition-colors duration-[250ms] hover:bg-transparent hover:text-foreground disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                {status.kind === "sending" ? "Sending…" : "Confirm"}
              </button>

              {!slot && (
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-foreground-secondary">
                  Pick a time first
                </span>
              )}
            </div>

            {status.kind === "error" && (
              <p role="alert" className="mt-5 text-sm text-foreground">
                {status.message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
