import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { StorySection } from "@/components/StorySection";
import { ValuesSection } from "@/components/ValuesSection";
import { ThreeMeanings } from "@/components/ThreeMeanings";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Studio — Loomie",
  description:
    "How Loomie works, what the studio holds to, and how the mark is built.",
};

export default function StudioPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-6xl sm:text-8xl md:text-9xl tracking-[-0.025em] text-foreground leading-[0.88]">
          Studio
        </h1>
      </header>

      <StorySection />
      <ValuesSection />
      <ThreeMeanings />
      <Footer />
    </main>
  );
}
