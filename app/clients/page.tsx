import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ClientsSection } from "@/components/ClientsSection";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { Footer } from "@/components/Footer";

/**
 * The page is not called "Clients" any more.
 *
 * It never listed any: it describes the sectors the studio is set up for and
 * the three shapes an engagement takes, because inventing client names was
 * the first thing this rebuild removed. A heading that promises a client list
 * above a page that has none is the mismatch, and the honest title is the one
 * the page already used for its own first section.
 */
export const metadata: Metadata = {
  title: "Who we work with — Loomie",
  description:
    "The sectors Loomie is set up for, and the three shapes an engagement takes.",
};

export default function ClientsPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[13vw] sm:text-7xl lg:text-8xl tracking-[-0.03em] text-foreground leading-[0.88] max-w-[16ch]">
          Who we work with
        </h1>
      </header>

      <ClientsSection />
      <PartnersMarquee />
      <Footer />
    </main>
  );
}
