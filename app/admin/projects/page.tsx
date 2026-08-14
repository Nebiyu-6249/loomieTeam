import React from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";

/** The work index, as the studio sees it. */

export const dynamic = "force-dynamic";

export default async function ProjectList({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdmin();
  const supabase = await serverClient();

  const [{ data }, { error }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, index, title, sector, study_type, published, display_order")
      .order("display_order", { ascending: true }),
    searchParams,
  ]);

  const projects = (data ?? []) as {
    id: string;
    index: string;
    title: string;
    sector: string;
    study_type: string;
    published: boolean;
  }[];

  return (
    <AdminShell
      admin={admin}
      title="Work"
      description="Case studies. The homepage shows the first three published; the archive shows all of them."
      actions={
        <Link
          href="/admin/projects/new"
          className="text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
            New project
          </span>
        </Link>
      }
    >
      {error ? (
        <p role="alert" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <p className="text-sm text-foreground-secondary">Nothing here yet. Add the first project.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-border-custom">
                {["", "Title", "Sector", "Kind", "Published"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="pb-3 pr-6 font-mono text-[0.65rem] uppercase tracking-[0.18em] font-normal text-foreground-secondary"
                  >
                    {heading || <span className="sr-only">Number</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-border-custom">
                  <td className="py-4 pr-6 font-mono text-[0.7rem] text-foreground-secondary align-top">
                    {project.index}
                  </td>
                  <td className="py-4 pr-6 text-sm align-top">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="text-foreground border-b border-transparent transition-colors duration-200 hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="py-4 pr-6 text-sm text-foreground-secondary align-top">
                    {project.sector || "—"}
                  </td>
                  <td className="py-4 pr-6 text-sm text-foreground-secondary align-top">
                    {project.study_type === "client" ? "Client project" : "Concept study"}
                  </td>
                  <td className="py-4 text-sm align-top">
                    <span className={project.published ? "text-foreground" : "text-foreground-secondary"}>
                      {project.published ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
