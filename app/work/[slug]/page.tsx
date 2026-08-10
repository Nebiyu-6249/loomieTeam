import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CaseStudyClient } from "@/components/CaseStudyClient";

export interface ProjectDetail {
  slug: string;
  title: string;
  subtitle: string;
  client: string;
  year: string;
  services: string[];
  heroImage: string;
  challenge: string;
  solution: string;
  impact: string;
  gallery: { src: string; caption: string }[];
  nextSlug: string;
  nextTitle: string;
}

/**
 * PLACEHOLDER DATA — awaiting real case study content from the founder.
 * Project names reuse the existing placeholder overlay names already in
 * PortfolioGrid. Client credits are deliberately marked TBC rather than
 * invented, and the body copy is written to read as placeholder.
 */
export const PROJECTS_DATA: ProjectDetail[] = [
  {
    slug: "vortex-titanium-module",
    title: "VORTEX Matte Titanium Module",
    subtitle: "Spatial hardware and industrial design",
    client: "[ CLIENT TBC ]",
    year: "2026",
    services: ["Industrial Design", "Brand Identity", "Art Direction"],
    heroImage: "/images/project-minimal.jpg",
    challenge:
      "Placeholder brief. The real challenge statement for this project has not been written yet. This paragraph exists so the layout can be reviewed at full length, and so the type scale can be judged against a realistic amount of copy rather than a single line. Replace it before launch.",
    solution:
      "Placeholder response. The real description of what was designed and built goes here. It should be long enough to sit comfortably in this column without leaving the surrounding whitespace looking accidental, which is why this text runs on for a few sentences rather than stopping early.",
    impact:
      "Placeholder outcome. Real numbers, dates or results belong here once the founder supplies them. Nothing in this paragraph should be treated as a claim about actual work.",
    gallery: [
      { src: "/images/project-minimal.jpg", caption: "Placeholder image 01" },
      { src: "/images/project-packaging.jpg", caption: "Placeholder image 02" },
      { src: "/images/project-digital.jpg", caption: "Placeholder image 03" },
      { src: "/images/hero-3d-fluid.jpg", caption: "Placeholder image 04" },
    ],
    nextSlug: "outfindr-mountain-dynamics",
    nextTitle: "OUTFINDR Mountain Dynamics",
  },
  {
    slug: "outfindr-mountain-dynamics",
    title: "OUTFINDR Mountain Dynamics",
    subtitle: "Outdoor and spatial exploration",
    client: "[ CLIENT TBC ]",
    year: "2025",
    services: ["Web Brand Identity", "Website Design", "Marketing Design"],
    heroImage: "/images/project-spatial.jpg",
    challenge:
      "Placeholder brief. The real challenge statement for this project has not been written yet. This paragraph exists so the layout can be reviewed at full length, and so the type scale can be judged against a realistic amount of copy rather than a single line. Replace it before launch.",
    solution:
      "Placeholder response. The real description of what was designed and built goes here. It should be long enough to sit comfortably in this column without leaving the surrounding whitespace looking accidental, which is why this text runs on for a few sentences rather than stopping early.",
    impact:
      "Placeholder outcome. Real numbers, dates or results belong here once the founder supplies them. Nothing in this paragraph should be treated as a claim about actual work.",
    gallery: [
      { src: "/images/project-spatial.jpg", caption: "Placeholder image 01" },
      { src: "/images/project-editorial.jpg", caption: "Placeholder image 02" },
      { src: "/images/hero-3d-fluid.jpg", caption: "Placeholder image 03" },
      { src: "/images/project-minimal.jpg", caption: "Placeholder image 04" },
    ],
    nextSlug: "sat-cybernetic-hud",
    nextTitle: "SAT Cybernetic System HUD",
  },
  {
    slug: "sat-cybernetic-hud",
    title: "SAT Cybernetic System HUD",
    subtitle: "Autonomous interface and design system",
    client: "[ CLIENT TBC ]",
    year: "2026",
    services: ["Website Design", "Design System", "Marketing Design"],
    heroImage: "/images/project-digital.jpg",
    challenge:
      "Placeholder brief. The real challenge statement for this project has not been written yet. This paragraph exists so the layout can be reviewed at full length, and so the type scale can be judged against a realistic amount of copy rather than a single line. Replace it before launch.",
    solution:
      "Placeholder response. The real description of what was designed and built goes here. It should be long enough to sit comfortably in this column without leaving the surrounding whitespace looking accidental, which is why this text runs on for a few sentences rather than stopping early.",
    impact:
      "Placeholder outcome. Real numbers, dates or results belong here once the founder supplies them. Nothing in this paragraph should be treated as a claim about actual work.",
    gallery: [
      { src: "/images/project-digital.jpg", caption: "Placeholder image 01" },
      { src: "/images/hero-3d-fluid.jpg", caption: "Placeholder image 02" },
      { src: "/images/project-packaging.jpg", caption: "Placeholder image 03" },
      { src: "/images/project-spatial.jpg", caption: "Placeholder image 04" },
    ],
    nextSlug: "vortex-titanium-module",
    nextTitle: "VORTEX Matte Titanium Module",
  },
];

export function generateStaticParams() {
  return PROJECTS_DATA.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS_DATA.find((item) => item.slug === slug);

  if (!project) {
    return { title: "Case Study Not Found — LOOMIE" };
  }

  return {
    title: `${project.title} — LOOMIE`,
    description: project.subtitle,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS_DATA.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <CaseStudyClient project={project} />
      <Footer />
    </main>
  );
}
