import React from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { canAdminister, requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { findResource } from "@/lib/admin/resources";
import { mediaOptions } from "@/lib/admin/rows";
import { createRow, type FormState } from "@/app/admin/crud";

export const dynamic = "force-dynamic";

export default async function NewRow({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { resource: key } = await params;
  const resource = findResource(key);
  if (!resource || !resource.creatable) notFound();

  const admin = await requireAdmin();
  if (resource.restricted && !canAdminister(admin.role)) notFound();

  const media = await mediaOptions();

  // Bound here rather than in the client component: the action has to be a
  // server reference, and the resource key is not something the browser should
  // be able to change on its way to the server.
  const action = async (state: FormState, form: FormData) => {
    "use server";
    return createRow(key, state, form);
  };

  return (
    <AdminShell
      admin={admin}
      title={`New ${resource.one.toLowerCase()}`}
      description={resource.description}
    >
      <ResourceForm
        resourceKey={resource.key}
        fields={resource.fields}
        row={{}}
        media={media}
        action={action}
      />
    </AdminShell>
  );
}
