import type { Metadata } from "next";
import {
  Instrument_Serif,
  Instrument_Sans,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LenisScrollProvider } from "@/components/LenisScrollProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageTransition } from "@/components/PageTransition";
import { ScrollTemperature } from "@/components/ScrollTemperature";
import { SceneRoot } from "@/components/three/SceneRoot";
import { getSiteDescription, getSiteTitle } from "@/lib/content";

/**
 * Three faces, three jobs.
 *
 * Display carries the snow-and-river warmth; body is the companion sans to
 * that serif, from the same foundry, so the two share proportions; mono is
 * for eyebrows, numbering, timestamps and coordinates.
 *
 * Instrument Sans stands in for Switzer/General Sans: Fontshare is blocked by
 * this environment's network policy, so the woff2 files cannot be fetched.
 * Swapping it for a local face later is a change to this block alone.
 */
const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display-serif",
  display: "swap",
});

const bodySans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body-sans",
  display: "swap",
});

const technicalMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-technical-mono",
  display: "swap",
});

/**
 * Title and description come from the database.
 *
 * They were admin fields that changed nothing: the metadata below was a
 * constant, so editing "Site title" in the admin updated a row and left every
 * page's <title> alone.
 *
 * `generateMetadata` rather than a dynamic read: this uses the cookie-free
 * client, so it runs at render time like any other data fetch and does not opt
 * routes out of static rendering. Saving settings revalidates the public paths,
 * which re-runs this with them.
 *
 * Never throws. If the database is unreachable the seeded values stand in —
 * a page with a slightly stale title is a much smaller problem than a page
 * that will not render at all, and unlike body content nobody edits their
 * <title> expecting it to be the source of truth for anything.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = await Promise.all([
    getSiteTitle(),
    getSiteDescription(),
  ]);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title,
    description,
    icons: {
      icon: "/icon.svg",
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "Loomie",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('loomie-theme');if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-loomie-loaded','1')}}catch(e){}})();`,
          }}
        />
      </head>
      {/* No background utility on body: the ground colour lives on html so the
          fixed WebGL layer behind the content is not painted over. */}
      <body
        className={`${displaySerif.variable} ${bodySans.variable} ${technicalMono.variable} font-sans antialiased text-foreground`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:font-mono focus:text-sm"
        >
          Skip to content
        </a>
        <ScrollTemperature />
        <SceneRoot />
        <LoadingScreen />
        <ThemeProvider>
          <LenisScrollProvider>
            <ScrollToTop />
            <PageTransition />
            {children}
          </LenisScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
