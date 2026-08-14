import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { SelectedWork } from "@/components/SelectedWork";
import { ServicesSection } from "@/components/ServicesSection";
import { StateSection } from "@/components/StateSection";
import { ProcessSection } from "@/components/ProcessSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";

/**
 * Seven sections, each with a different job.
 *
 * It used to be eleven, four of which were different ways of showing the same
 * projects. The order is now: who we are, the work, what we sell, the one
 * idea, how it runs, who else is involved, how to reach us — and no two
 * adjacent sections share a layout.
 */
export default function Home() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <HeroSection />
      <SelectedWork />
      <ServicesSection bridgeToState />
      <StateSection />
      <ProcessSection />
      <PartnersMarquee />
      <Footer />
    </main>
  );
}
