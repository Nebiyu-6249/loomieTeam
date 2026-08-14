import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { RowActions } from "@/components/admin/RowActions";
import { canAdminister, requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { findResource, listFields } from "@/lib/admin/resources";
import { listRows } from "@/lib/admin/rows";

/**
 * The list view, for every resource described in lib/admin/resources.
 *
 * A table, the columns that resource marked as columns, and the two things
 * somebody does most: reorder and open. No bulk selection, no filters, no
 * pagination — these lists are four to a dozen rows, and a control bar taller
 * than its own content is the thing this admin is trying not to be.
 */

export const dynamic = "force-dynamic";

export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { resource: key } = await params;
  const resource = findResource(key);
  if (!resource) notFound();

  const admin = await requireAdmin();
  if (resource.restricted && !canAdminister(admin.role)) notFound();

  const [rows, { error }] = await Promise.all([listRows(resource), searchParams]);
  const columns = listFields(resource);

  return (
    <AdminShell
      admin={admin}
      title={resource.many}
      description={resource.description}
      actions={
        resource.creatable ? (
          <Link
            href={`/admin/${resource.key}/new`}
            className="text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
              New {resource.one.toLowerCase()}
            </span>
          </Link>
        ) : null
      }
    >
      {error ? (
        <p role="alert" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-foreground-secondary">
          Nothing here yet.
          {resource.creatable ? ` Add the first ${resource.one.toLowerCase()}.` : ""}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-border-custom">
                {columns.map((column) => (
                  <th
                    key={column.name}
                    scope="col"
                    className="pb-3 pr-6 font-mono text-[0.65rem] uppercase tracking-[0.18em] font-normal text-foreground-secondary"
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="pb-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id)} className="border-b border-border-custom">
                  {columns.map((column, columnIndex) => {
                    const value = row[column.name];
                    const content =
                      column.kind === "boolean" ? (
                        <span className={value ? "text-foreground" : "text-foreground-secondary"}>
                          {value ? "Yes" : "No"}
                        </span>
                      ) : (
                        String(value ?? "—")
                      );

                    // The first column is the row's name, so it is the link.
                    return (
                      <td key={column.name} className="py-4 pr-6 align-top text-sm">
                        {columnIndex === 0 ? (
                          <Link
                            href={`/admin/${resource.key}/${row.id}`}
                            className="text-foreground border-b border-transparent transition-colors duration-200 hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                          >
                            {content}
                          </Link>
                        ) : (
                          <span className="text-foreground-secondary">{content}</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-4 align-top text-right">
                    <RowActions
                      resourceKey={resource.key}
                      id={String(row.id)}
                      orderable={Boolean(resource.orderable)}
                      first={index === 0}
                      last={index === rows.length - 1}
                    />
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
