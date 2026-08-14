import React from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { DeleteProject } from "@/components/admin/DeleteProject";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { mediaOptions } from "@/lib/admin/rows";
import { saveProject } from "@/app/admin/projects/actions";
import type { FormState } from "@/app/admin/crud";

export const dynamic = "force-dynamic";

interface Loaded {
  id: string;
  slug: string;
  title: string;
  project_disciplines: { discipline: string; display_order: number }[];
  project_sections: { kind: string; body: string }[];
  project_media: { media_id: string; alt: string; display_order: number; role: string }[];
}

export default async function EditProject({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await serverClient();

  const [{ data }, media, { saved }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `*, project_disciplines ( discipline, display_order ),
            project_sections ( kind, body ),
            project_media ( media_id, alt, display_order, role )`
      )
      .eq("id", id)
      .maybeSingle(),
    mediaOptions(),
    searchParams,
  ]);

  if (!data) notFound();
  const project = data as unknown as Loaded & Record<string, unknown>;

  const section = (kind: string) =>
    project.project_sections.find((s) => s.kind === kind)?.body ?? "";

  const action = async (state: FormState, form: FormData) => {
    "use server";
    return saveProject(id, state, form);
  };

  return (
    <AdminShell admin={admin} title={project.title} description="Everything this case study is made of.">
      <ProjectForm
        row={project}
        sections={{
          scenario: section("scenario"),
          direction: section("direction"),
          demonstration: section("demonstration"),
        }}
        disciplines={[...project.project_disciplines]
          .sort((a, b) => a.display_order - b.display_order)
          .map((d) => d.discipline)}
        gallery={[...project.project_media]
          .filter((m) => m.role === "gallery" || m.role === "detail")
          .sort((a, b) => a.display_order - b.display_order)
          .map((m) => ({ mediaId: m.media_id, alt: m.alt }))}
        media={media}
        action={action}
        saved={saved === "1"}
      />

      <DeleteProject id={id} slug={project.slug} title={project.title} />
    </AdminShell>
  );
}
