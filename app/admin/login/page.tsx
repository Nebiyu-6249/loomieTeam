import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { currentAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The way in, and the only page under /admin that does not require a session.
 *
 * There is no "create an account" link, because there is no route that creates
 * one. Administrators are invited from inside the admin by somebody who is
 * already in it, which writes the auth user and the profile together. A person
 * who signs in without a profile row is authenticated and still sees nothing.
 */
/**
 * Never prerendered.
 *
 * Whether Supabase is configured is a fact about the running deployment, and
 * this page branches on it. Built statically it would freeze whichever answer
 * was true at build time — which for a CI build with no credentials means
 * shipping the setup notice as the permanent sign-in page.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // Already signed in: the form would only be a second way to arrive at the
  // page they are trying to reach.
  if (await currentAdmin()) redirect("/admin");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground-secondary">
          Loomie
        </p>
        <h1 className="mt-4 font-display font-normal text-4xl leading-none text-foreground">
          Sign in
        </h1>
        <p className="mt-4 text-sm leading-snug text-foreground-secondary">
          For the studio team. If you need access, ask somebody who already has
          it to add you.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
