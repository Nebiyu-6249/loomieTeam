import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ProjectArchive } from "@/components/ProjectArchive";
import { Footer } from "@/components/Footer";
import { PROJECTS } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Work — Loomie",
  description:
    "The Loomie work index. Identity, websites and marketing design.",
};

export default function WorkPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[15vw] sm:text-8xl lg:text-9xl tracking-[-0.03em] text-foreground leading-[0.86]">
          Work
        </h1>
        {/* Counted, not typed. A hardcoded "Five projects" is a sentence that
            silently becomes a lie the first time PROJECTS gains an entry, and
            the number is kept out of the sentence's first position so it can
            be a numeral without reading like one. */}
        <p className="mt-6 max-w-lg text-base md:text-lg leading-snug text-foreground-secondary">
          Identity, websites, and the material that comes after — {PROJECTS.length}{" "}
          concept studies, replaced by client work as it is cleared to publish.
        </p>
      </header>

      <ProjectArchive />
      <Footer />
    </main>
  );
}
