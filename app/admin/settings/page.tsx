import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdministrator } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { SETTINGS } from "@/lib/admin/settings";

export const dynamic = "force-dynamic";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdministrator();
  const supabase = await serverClient();

  const [{ data }, { saved }] = await Promise.all([
    supabase.from("site_settings").select("key, value"),
    searchParams,
  ]);

  const values: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    values[row.key] = row.value ?? "";
  }

  return (
    <AdminShell
      admin={admin}
      title="Settings"
      description="Words and addresses that appear across the whole site rather than on one page."
    >
      <SettingsForm settings={SETTINGS} values={values} saved={saved === "1"} />
    </AdminShell>
  );
}
