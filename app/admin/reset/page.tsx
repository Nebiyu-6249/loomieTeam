import React from "react";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { changePassword } from "@/app/admin/account/actions";

/**
 * Where a reset link lands.
 *
 * Supabase turns the recovery token in the URL fragment into a session before
 * this renders, so by the time somebody sets a password they are signed in as
 * themselves and the ordinary change action does the work. That is why there
 * is no token handling here — a page that parsed the fragment itself would be
 * reimplementing the part most likely to be got wrong.
 *
 * Not indexed: the admin layout's metadata covers everything under /admin.
 */
export const dynamic = "force-dynamic";

export default async function ResetPassword() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground-secondary">
          Loomie
        </p>
        <h1 className="mt-4 font-display font-normal text-4xl leading-none text-foreground">
          Set a new password
        </h1>
        <p className="mt-4 text-sm leading-snug text-foreground-secondary">
          Opened from the link we emailed you. If this page says your session
          has expired, ask for a new link — they do not last long, on purpose.
        </p>

        <div className="mt-10">
          <PasswordForm action={changePassword} submitLabel="Set password" />
        </div>
      </div>
    </main>
  );
}
