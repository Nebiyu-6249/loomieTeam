import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Work — LOOMIE",
  description:
    "The LOOMIE work index. Brand identity, websites and marketing design.",
};

export default function WorkPage() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase text-foreground leading-[0.92]">
          Work
        </h1>
      </header>

      <PortfolioGrid />
      <Footer />
    </main>
  );
}
