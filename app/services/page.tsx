import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ServicesSection } from "@/components/ServicesSection";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Services — LOOMIE",
  description:
    "Logo design, web brand identity, marketing design and website design from LOOMIE.",
};

export default function ServicesPage() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-6xl sm:text-8xl md:text-9xl tracking-[-0.025em] text-foreground leading-[0.88]">
          Services
        </h1>
      </header>

      <ServicesSection />
      <Footer />
    </main>
  );
}
