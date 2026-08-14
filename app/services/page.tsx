import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ServicesSection } from "@/components/ServicesSection";
import { ProcessSection } from "@/components/ProcessSection";
import { Footer } from "@/components/Footer";
import { getServices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services — Loomie",
  description:
    "Identity, web identity, marketing design and websites from Loomie.",
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[15vw] sm:text-8xl lg:text-9xl tracking-[-0.03em] text-foreground leading-[0.86]">
          Services
        </h1>
      </header>

      <ServicesSection services={services} />
      <ProcessSection />
      <Footer />
    </main>
  );
}
