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
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase text-foreground leading-[0.92]">
          Clients
        </h1>
      </header>

      <PinnedProjects />
      <Footer />
    </main>
  );
}
