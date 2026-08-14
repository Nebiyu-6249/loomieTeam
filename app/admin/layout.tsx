import type { Metadata } from "next";
import React from "react";

/**
 * The admin is a different application that happens to share a domain.
 *
 * No loading screen, no Lenis, no page transition, no particle field. Those
 * belong to a site that is being looked at; this one is being used, and an
 * eight-hundred-millisecond reveal between "save" and "saved" is an
 * eight-hundred-millisecond delay. The root layout still supplies the fonts,
 * the theme and the colour tokens, so the admin looks like Loomie without
 * behaving like the website.
 *
 * Nothing under /admin is indexed. robots.txt disallows it and this adds the
 * meta tag, because the two work on different crawlers and neither is a
 * security control — the pages refuse without a session regardless.
 */
export const metadata: Metadata = {
  title: "Admin — Loomie",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  // Cleared, not omitted. Metadata is inherited, so leaving these out kept the
  // root layout's card — a link to the admin pasted into Slack would have
  // unfurled as "Loomie — Brand Identity & Digital Design Studio" with the
  // site's cover image, which is exactly the advertisement this should not be.
  openGraph: null,
  twitter: null,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface text-foreground">{children}</div>;
}
