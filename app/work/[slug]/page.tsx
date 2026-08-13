import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CaseStudyClient } from "@/components/CaseStudyClient";
import { PROJECTS, getProject, nextProject } from "@/lib/projects";

/**
 * The case study route reads lib/projects.ts and owns no data of its own.
 * It used to export the array that the homepage imported back, which is why
 * the whole case-study module ended up in the client bundle.
 */

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) return { title: "Not found — Loomie" };

  return {
    title: `${project.title} — Loomie`,
    description: project.summary,
    openGraph: {
      title: `${project.title} — Loomie`,
      description: project.summary,
      images: [{ url: project.hero.src }],
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) notFound();

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />
      <CaseStudyClient project={project} next={nextProject(slug)} />
      <Footer />
    </main>
  );
}
