import { PROJECTS_DATA } from "./work/[slug]/page";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ExplodedView } from "@/components/ExplodedView";
import { ServicesSection } from "@/components/ServicesSection";
import { Marquee } from "@/components/Marquee";
import { FeaturedWork } from "@/components/FeaturedWork";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { JourneyLine } from "@/components/JourneyLine";
import { TickerSentence } from "@/components/TickerSentence";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-x-clip">
      <Navbar />

      <HeroSection />

      {/*
        The journey line runs from the exploded view to the portfolio grid.

        The two pinned sections on this page are the exploded view and the
        ticker; everything between them is unpinned, so no two pinned sections
        are ever adjacent.

        Marquee is not in the specified order but the brief says to keep it,
        so it sits here, where it separates Services from the featured work
        and keeps the three horizontally moving sections from bunching.
      */}
      <JourneyLine>
        <ExplodedView />
        <ServicesSection />
        <Marquee />
        <FeaturedWork projects={PROJECTS_DATA} />
        <PortfolioGrid />
      </JourneyLine>

      <TickerSentence />

      <PartnersMarquee />

      <Footer />
    </main>
  );
}
