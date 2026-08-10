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
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-6xl sm:text-8xl md:text-9xl tracking-[-0.025em] text-foreground leading-[0.88]">
          Work
        </h1>
      </header>

      <PortfolioGrid />
      <Footer />
    </main>
  );
}
