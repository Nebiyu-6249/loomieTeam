"use client";

import React, { useSyncExternalStore } from "react";
import { Mail, ArrowUpRight } from "lucide-react";
import { useMagnetic } from "./useMagnetic";

/**
 * Dubai does not observe daylight saving, so GST is UTC+4 all year.
 *
 * This reads through useSyncExternalStore rather than useState + useEffect
 * because seeding state synchronously inside an effect trips
 * react-hooks/set-state-in-effect, and waiting a full second for the first
 * tick would leave the placeholder on screen after mount.
 */
const subscribeToClock = (onStoreChange: () => void) => {
  const interval = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(interval);
};

const getDubaiTime = () => {
  const now = new Date();

  const dubaiTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return dubaiTime;
};

const getClockPlaceholder = () => "--:--";

function DubaiClock() {
  const time = useSyncExternalStore(
    subscribeToClock,
    getDubaiTime,
    getClockPlaceholder
  );

  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-5xl md:text-6xl font-bold text-foreground tabular-nums tracking-tight">
        {time}
      </span>
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground-secondary">
        GST (UTC+4)
      </span>
    </div>
  );
}

/**
 * PLACEHOLDER COPY — the FAQ answers below are written to be structural
 * rather than specific. No prices, turnaround times or client claims are
 * stated, because none have been supplied.
 */
const FAQS = [
  {
    question: "What does a project cost?",
    answer:
      "It depends on how much there is to make. A single logo and a full brand system with a website are very different jobs. Tell us what you need and you get a fixed price before any work starts, not an hourly rate that moves.",
  },
  {
    question: "How long does it take?",
    answer:
      "Also depends on scope, and on how quickly you can give feedback. You get a schedule with the quote, and it lists what we owe you and what you owe us on each date.",
  },
  {
    question: "Do you work with clients outside Dubai?",
    answer:
      "Yes. The studio runs on email and scheduled calls, so the time zone matters less than the overlap. The clock above tells you where we are right now.",
  },
  {
    question: "What do you need from me to start?",
    answer:
      "A description of what you sell and who buys it, anything you already have that we should keep, and one person who can approve work. The last one saves the most time.",
  },
];

export function ContactSection() {
  const emailRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section className="pt-36 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 max-w-[1700px] mx-auto">
      {/* Heading and intro */}
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
        01 / Contact
      </span>

      <h1 className="font-display font-normal text-5xl sm:text-7xl md:text-8xl tracking-[-0.025em] text-foreground leading-[0.9] max-w-4xl">
        Start a project
      </h1>

      <p className="mt-8 text-base sm:text-lg text-foreground-secondary max-w-2xl leading-relaxed">
        Tell us what you are building and what is in the way. One email is
        enough to start. You will get a reply from a person, not a form
        autoresponder.
      </p>

      {/* Email CTA and clock */}
      <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7">
          <a
            ref={emailRef}
            href="mailto:hello@loomiestudio.com"
            className="group h-full inline-flex w-full items-center gap-4 px-8 py-8 md:py-10 rounded-none bg-foreground text-background font-bold text-lg md:text-2xl border border-foreground transition-all duration-300 hover:bg-surface-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <Mail className="w-6 h-6 shrink-0" />
            <span className="break-all">hello@loomiestudio.com</span>
            <ArrowUpRight className="w-6 h-6 shrink-0 ml-auto transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>
        </div>

        <div className="lg:col-span-5 p-8 md:p-10 rounded-none bg-surface-card border border-border-custom flex flex-col justify-between gap-6">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary">
            Studio Time / Dubai
          </span>

          <DubaiClock />

          <p className="text-sm text-foreground-secondary leading-relaxed">
            Replies land during Dubai working hours. Anything sent overnight is
            answered the next morning.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-24 md:mt-32">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
          02 / Questions
        </span>

        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-foreground mb-12">
          Before you write
        </h2>

        <div className="border-t border-border-custom">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-border-custom"
            >
              <summary className="flex items-center justify-between gap-6 py-7 md:py-8 cursor-pointer list-none text-lg md:text-2xl font-bold text-foreground transition-colors duration-300 hover:text-foreground-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                <span>{faq.question}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 w-9 h-9 rounded-none bg-background border border-border-custom flex items-center justify-center font-mono text-xl leading-none text-foreground transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>

              <p className="pb-8 pr-16 text-base text-foreground-secondary leading-relaxed max-w-3xl">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
