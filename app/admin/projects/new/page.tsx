import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mediaOptions } from "@/lib/admin/rows";
import { saveProject } from "@/app/admin/projects/actions";
import type { FormState } from "@/app/admin/crud";

export const dynamic = "force-dynamic";

export default async function NewProject() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdmin();
  const media = await mediaOptions();

  const action = async (state: FormState, form: FormData) => {
    "use server";
    return saveProject(null, state, form);
  };

  return (
    <AdminShell
      admin={admin}
      title="New project"
      description="Nothing is published until you tick Published, so a half-written study is never one save away from being live."
    >
      <ProjectForm
        row={{}}
        sections={{ scenario: "", direction: "", demonstration: "" }}
        disciplines={[]}
        gallery={[]}
        media={media}
        action={action}
      />
    </AdminShell>
  );
}
