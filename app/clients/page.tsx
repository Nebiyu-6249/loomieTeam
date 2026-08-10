import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PinnedProjects } from "@/components/PinnedProjects";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Clients — LOOMIE",
  description: "Selected case studies from the LOOMIE studio.",
};

export default function ClientsPage() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-6xl sm:text-8xl md:text-9xl tracking-[-0.025em] text-foreground leading-[0.88]">
          Clients
        </h1>
      </header>

      <PinnedProjects />
      <Footer />
    </main>
  );
}
