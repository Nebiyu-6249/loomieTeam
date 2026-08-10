import { PROJECTS_DATA } from "./work/[slug]/page";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { Marquee } from "@/components/Marquee";
import { ExplodedView } from "@/components/ExplodedView";
import { ServicesSection } from "@/components/ServicesSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { TickerSentence } from "@/components/TickerSentence";
import { JourneyLine } from "@/components/JourneyLine";
import { FeaturedWork } from "@/components/FeaturedWork";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-x-clip">
      <Navbar />
      <HeroSection />
      <JourneyLine>
        <ExplodedView />
        <Marquee />
        <ServicesSection />
        <FeaturedWork projects={PROJECTS_DATA} />
        <PartnersMarquee />
        <PortfolioGrid />
      </JourneyLine>
      <TickerSentence />
      <Footer />
    </main>
  );
}
