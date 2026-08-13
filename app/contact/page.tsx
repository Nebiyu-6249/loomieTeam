import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact — Loomie",
  description:
    "Start a project with Loomie. Tell us what you are building and what is in the way.",
};

export default function ContactPage() {
  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <ContactSection />
      <Footer />
    </main>
  );
}
