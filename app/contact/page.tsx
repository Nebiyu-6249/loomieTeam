import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact — LOOMIE",
  description:
    "Start a project with LOOMIE. Tell us what you are building and what is in the way.",
};

export default function ContactPage() {
  return (
    <main id="main" className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <ContactSection />
      <Footer />
    </main>
  );
}
