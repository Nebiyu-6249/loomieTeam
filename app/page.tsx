import { PROJECTS_DATA } from "./work/[slug]/page";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ExplodedView } from "@/components/ExplodedView";
import { ServicesSection } from "@/components/ServicesSection";
import { Marquee } from "@/components/Marquee";
import { FeaturedWork } from "@/components/FeaturedWork";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { TickerSentence } from "@/components/TickerSentence";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <HeroSection />

      {/*
        The drawn journey line is gone. The particle field is the connective
        tissue now: it runs behind every section on the page, snow at the top
        and river by the lower third, which is the same job done by the thing
        the page is actually about.

        The two pinned sections on this page are the exploded view and the
        ticker; everything between them is unpinned, so no two pinned sections
        are ever adjacent.

        Marquee is not in the specified order but the brief says to keep it,
        so it sits here, where it separates Services from the featured work
        and keeps the three horizontally moving sections from bunching.
      */}
      <ExplodedView />
      <ServicesSection />
      <Marquee />
      <FeaturedWork projects={PROJECTS_DATA} />
      <PortfolioGrid />

      <TickerSentence />

      <PartnersMarquee />

      <Footer />
    </main>
  );
}
