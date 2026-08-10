import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { StorySection } from "@/components/StorySection";
import { ValuesSection } from "@/components/ValuesSection";
import { IdentitySection } from "@/components/IdentitySection";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Studio — LOOMIE",
  description:
    "How LOOMIE works, what the studio holds to, and how the mark is built.",
};

export default function StudioPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />

      <header className="pt-36 md:pt-44 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase text-foreground leading-[0.92]">
          Studio
        </h1>
      </header>

      <StorySection />
      <ValuesSection />
      <IdentitySection />
      <Footer />
    </main>
  );
}
