import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { getServices, getSettings, getSocialLinks } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact — Loomie",
  description:
    "Start a project with Loomie. Tell us what you are building and what is in the way.",
};

export default async function ContactPage() {
  const [services, settings, socials] = await Promise.all([
    getServices(),
    getSettings(),
    getSocialLinks(),
  ]);

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <ContactSection services={services} settings={settings} socials={socials} />
      <Footer />
    </main>
  );
}
