import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ProjectArchive } from "@/components/ProjectArchive";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Work — LOOMIE",
  description:
    "The LOOMIE work index. Identity, websites and marketing design.",
};

export default function WorkPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[15vw] sm:text-8xl lg:text-9xl tracking-[-0.03em] text-foreground leading-[0.86]">
          Work
        </h1>
        <p className="mt-6 max-w-md text-base md:text-lg leading-snug text-foreground-secondary">
          Five projects. Identity, websites, and the material that comes after.
        </p>
      </header>

      <ProjectArchive />
      <Footer />
    </main>
  );
}
