import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CaseStudyClient } from "@/components/CaseStudyClient";
import { getNextProject, getProject, getProjects } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The case study route reads lib/content and owns no data of its own. It used
 * to export the array that the homepage imported back, which is why the whole
 * case-study module ended up in the client bundle.
 */

export async function generateStaticParams() {
  // No database, nothing to prerender. `generateStaticParams` runs without a
  // request, so it is the one place that cannot defer the decision to render
  // time — it has to answer here, and the honest answer with no content source
  // is an empty list. `dynamicParams` stays on, so every slug is still served;
  // it is resolved on demand, and an unconfigured production refuses there
  // rather than shipping a page built from the seed.
  if (!isSupabaseConfigured()) return [];

  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) return { title: "Not found — Loomie" };

  return {
    title: `${project.title} — Loomie`,
    description: project.summary,
    openGraph: {
      title: `${project.title} — Loomie`,
      description: project.summary,
      images: project.hero.src ? [{ url: project.hero.src }] : undefined,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const next = await getNextProject(slug);

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <CaseStudyClient project={project} next={next} />
      <Footer />
    </main>
  );
}
