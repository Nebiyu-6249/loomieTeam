import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { StorySection } from "@/components/StorySection";
import { TeamSection } from "@/components/TeamSection";
import { ValuesSection } from "@/components/ValuesSection";
import { ThreeMeanings } from "@/components/ThreeMeanings";
import { SocialLinks } from "@/components/SocialLinks";
import { Footer } from "@/components/Footer";
import { getSettings, getSocialLinks, getTeam } from "@/lib/content";

/**
 * About: the studio, the people, and what the mark is made of.
 *
 * This was /studio, and it had everything except the studio. It described how
 * the work runs and what the name means, and never said who does any of it —
 * which for a seven-person team is the omission a visitor notices first. The
 * team now sits directly under the opening, before the values, because who is
 * doing the work is a more useful fact than what they believe about it.
 *
 * /studio still resolves; next.config redirects it here, along with the older
 * /story, /values and /identity anchors that pointed at it.
 */
export const metadata: Metadata = {
  title: "About — Loomie",
  description:
    "The people behind Loomie, how the studio works, and how the mark is built.",
};

export default async function AboutPage() {
  const [team, socials, settings] = await Promise.all([
    getTeam(),
    getSocialLinks(),
    getSettings(),
  ]);

  /**
   * Structured data, and only what is true.
   *
   * No founding date, no address, no employee count beyond the people actually
   * listed, no logo claim — every one of those is a field search engines will
   * happily surface as fact, and none of them were supplied. sameAs carries
   * only accounts somebody has enabled with a real URL, so it is absent rather
   * than empty until then.
   */
  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Loomie",
    description: settings.site_description,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    email: settings.contact_email,
    ...(socials.length > 0 ? { sameAs: socials.map((link) => link.url) } : {}),
    member: team.map((person) => ({
      "@type": "Person",
      name: person.name,
      jobTitle: person.role,
    })),
  };

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <script
        type="application/ld+json"
        // The payload is built above from database rows, not from anything a
        // visitor can influence, and JSON.stringify escapes the string values.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }}
      />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-6xl sm:text-8xl md:text-9xl tracking-[-0.025em] text-foreground leading-[0.88]">
          About
        </h1>
        <p className="mt-8 max-w-xl text-lg md:text-2xl leading-snug text-foreground">
          A small studio that makes identities and the digital systems that
          carry them.
        </p>
      </header>

      <StorySection />
      <TeamSection team={team} />
      <ValuesSection />
      <ThreeMeanings />

      {/* ── Elsewhere ──────────────────────────────────────────────────────
          Renders nothing until an account has been enabled with a real URL,
          which is the state the site ships in. */}
      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-20 md:pb-24">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10">
          <div className="col-span-12 md:col-span-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
              Get in touch
            </h2>
            <a
              href={`mailto:${settings.contact_email}`}
              className="mt-6 inline-block text-lg md:text-2xl text-foreground border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              {settings.contact_email}
            </a>
          </div>

          <SocialLinks links={socials} className="col-span-12 md:col-span-5 md:col-start-8" />
        </div>
      </section>

      <Footer />
    </main>
  );
}
