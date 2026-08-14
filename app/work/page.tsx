import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ProjectArchive } from "@/components/ProjectArchive";
import { Footer } from "@/components/Footer";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work — Loomie",
  description:
    "The Loomie work index. Identity, websites and marketing design.",
};

/**
 * What the archive currently holds, counted rather than typed.
 *
 * A hardcoded "Five concept studies" becomes a lie twice over: once when a
 * project is added, and again the first time one of them is a real commission.
 * Built as a string rather than in JSX because JSX inserts a space at every
 * line break, which put one in front of the comma and another in front of the
 * full stop.
 */
function archiveLine(concepts: number, client: number) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const opening = "Identity, websites, and the material that comes after";

  if (concepts === 0 && client === 0) return `${opening}.`;
  if (concepts === 0) return `${opening} — ${plural(client, "project", "projects")}.`;

  const counted =
    client > 0
      ? `${plural(concepts, "concept study", "concept studies")} and ${plural(
          client,
          "client project",
          "client projects"
        )}`
      : plural(concepts, "concept study", "concept studies");

  return `${opening} — ${counted}, replaced by client work as it is cleared to publish.`;
}

export default async function WorkPage() {
  const projects = await getProjects();
  const concepts = projects.filter((p) => p.studyType === "concept").length;
  const client = projects.length - concepts;

  return (
    <main id="main" className="relative min-h-screen text-foreground overflow-x-clip">
      <Navbar />

      <header className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <h1 className="font-display font-normal text-[15vw] sm:text-8xl lg:text-9xl tracking-[-0.03em] text-foreground leading-[0.86]">
          Work
        </h1>
        <p className="mt-6 max-w-lg text-base md:text-lg leading-snug text-foreground-secondary">
          {archiveLine(concepts, client)}
        </p>
      </header>

      <ProjectArchive projects={projects} />
      <Footer />
    </main>
  );
}
