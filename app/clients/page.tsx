import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ClientsSection } from "@/components/ClientsSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Clients — LOOMIE",
  description: "The sectors LOOMIE works in, and how an engagement runs.",
};

export default function ClientsPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[15vw] sm:text-8xl lg:text-9xl tracking-[-0.03em] text-foreground leading-[0.86]">
          Clients
        </h1>
      </header>

      <ClientsSection />
      <PartnersMarquee />
      <Footer />
    </main>
  );
}
