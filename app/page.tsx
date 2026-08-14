import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { SelectedWork } from "@/components/SelectedWork";
import { ServicesSection } from "@/components/ServicesSection";
import { StateSection } from "@/components/StateSection";
import { ProcessSection } from "@/components/ProcessSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";
import { getPartners, getSelectedProjects, getServices } from "@/lib/content";

/**
 * Seven sections, each with a different job.
 *
 * It used to be eleven, four of which were different ways of showing the same
 * projects. The order is now: who we are, the work, what we sell, the one
 * idea, how it runs, who else is involved, how to reach us — and no two
 * adjacent sections share a layout.
 *
 * Every section's content is read here and handed down. The components own
 * layout and behaviour and nothing else, which is what makes the admin able to
 * change what this page says without anybody editing a component.
 */
export default async function Home() {
  const [services, projects, partners] = await Promise.all([
    getServices(),
    getSelectedProjects(),
    getPartners(),
  ]);

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <HeroSection services={services} />
      <SelectedWork projects={projects} />
      <ServicesSection services={services} bridgeToState />
      <StateSection />
      <ProcessSection />
      <PartnersMarquee partners={partners} />
      <Footer />
    </main>
  );
}
