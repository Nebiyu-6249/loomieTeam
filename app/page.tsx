import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { Marquee } from "@/components/Marquee";
import { ExplodedView } from "@/components/ExplodedView";
import { ServicesSection } from "@/components/ServicesSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { TickerSentence } from "@/components/TickerSentence";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <HeroSection />
      <ExplodedView />
      <Marquee />
      <ServicesSection />
      <PartnersMarquee />
      <PortfolioGrid />
      <TickerSentence />
      <Footer />
    </main>
  );
}
