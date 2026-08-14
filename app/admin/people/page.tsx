import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { InviteForm } from "@/components/admin/InviteForm";
import { PersonRow } from "@/components/admin/PersonRow";
import { ROLE_DESCRIPTION, ROLE_LABEL, requireAdministrator } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

/** Who may sign in, and what each of them may do. */

export const dynamic = "force-dynamic";

export default async function People({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdministrator();
  const supabase = await serverClient();

  const [{ data }, query] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("id, name, email, role, is_active, created_at")
      .order("created_at", { ascending: true }),
    searchParams,
  ]);

  const people = (data ?? []) as {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    is_active: boolean;
  }[];

  return (
    <AdminShell
      admin={admin}
      title="Administrators"
      description="There is no public sign-up. Somebody already here adds an account, or nobody gets one."
    >
      {query.error ? (
        <p role="alert" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          {query.error}
        </p>
      ) : null}

      {query.added ? (
        <p role="status" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          Added. Tell them the password you chose and ask them to change it.
        </p>
      ) : null}

      <ul className="border-t border-border-custom">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            roleLabel={ROLE_LABEL[person.role]}
            isSelf={person.id === admin.id}
          />
        ))}
      </ul>

      <section className="mt-14 max-w-2xl">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          What the roles mean
        </h2>
        <dl className="mt-6 border-t border-border-custom">
          {(Object.keys(ROLE_LABEL) as AdminRole[]).map((role) => (
            <div key={role} className="border-b border-border-custom py-4">
              <dt className="text-sm text-foreground">{ROLE_LABEL[role]}</dt>
              <dd className="mt-1 text-sm text-foreground-secondary">
                {ROLE_DESCRIPTION[role]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <InviteForm canAddOwner={admin.role === "owner"} />
    </AdminShell>
  );
}
