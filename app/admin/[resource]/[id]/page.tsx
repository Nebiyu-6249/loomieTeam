import React from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { DeleteRow } from "@/components/admin/DeleteRow";
import { canAdminister, requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { findResource } from "@/lib/admin/resources";
import { getRow, mediaOptions } from "@/lib/admin/rows";
import { updateRow, type FormState } from "@/app/admin/crud";

export const dynamic = "force-dynamic";

export default async function EditRow({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { resource: key, id } = await params;
  const resource = findResource(key);
  if (!resource) notFound();

  const admin = await requireAdmin();
  if (resource.restricted && !canAdminister(admin.role)) notFound();

  const [row, media, { saved }] = await Promise.all([
    getRow(resource, id),
    mediaOptions(),
    searchParams,
  ]);

  // Null covers both "no such row" and "row level security says no". The two
  // deserve the same answer here: telling somebody a row exists but is not
  // theirs is more information than they asked for.
  if (!row) notFound();

  const action = async (state: FormState, form: FormData) => {
    "use server";
    return updateRow(key, id, state, form);
  };

  const name = String(row.title ?? row.name ?? row.label ?? resource.one);

  return (
    <AdminShell admin={admin} title={name} description={resource.description}>
      <ResourceForm
        resourceKey={resource.key}
        fields={resource.fields}
        row={row}
        media={media}
        action={action}
        saved={saved === "1"}
      />

      {resource.deletable ? (
        <DeleteRow resourceKey={resource.key} id={id} name={name} noun={resource.one} />
      ) : null}
    </AdminShell>
  );
}
