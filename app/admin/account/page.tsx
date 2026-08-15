import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { ROLE_DESCRIPTION, ROLE_LABEL, requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { changePassword } from "./actions";

/**
 * Your own account.
 *
 * Exists because an administrator used to have no way to stop using the
 * password the person who invited them chose.
 */
export const dynamic = "force-dynamic";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdmin();
  const { changed } = await searchParams;

  return (
    <AdminShell admin={admin} title="Your account" description="Who you are here, and your password.">
      <dl className="max-w-sm border-t border-border-custom">
        <div className="flex justify-between gap-6 border-b border-border-custom py-4">
          <dt className="text-sm text-foreground-secondary">Name</dt>
          <dd className="text-sm text-foreground">{admin.name}</dd>
        </div>
        <div className="flex justify-between gap-6 border-b border-border-custom py-4">
          <dt className="text-sm text-foreground-secondary">Email</dt>
          <dd className="text-sm text-foreground break-all">{admin.email}</dd>
        </div>
        <div className="flex justify-between gap-6 border-b border-border-custom py-4">
          <dt className="text-sm text-foreground-secondary">Role</dt>
          <dd className="text-sm text-foreground text-right">
            {ROLE_LABEL[admin.role]}
            <span className="block mt-1 text-foreground-secondary">
              {ROLE_DESCRIPTION[admin.role]}
            </span>
          </dd>
        </div>
      </dl>

      <section className="mt-14">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-8">
          Change your password
        </h2>
        <PasswordForm action={changePassword} done={changed === "1"} />
      </section>
    </AdminShell>
  );
}
