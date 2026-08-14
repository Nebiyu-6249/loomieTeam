import React from "react";

/**
 * What /admin says before there is a database.
 *
 * Not an error page. Nothing has gone wrong — the application simply has not
 * been connected to a Supabase project yet, and the useful thing to show
 * somebody who has just cloned this is the list of what to do, in order.
 *
 * The public site is separately honest about the same state: in development it
 * renders the seeded content with a warning in the console, and in production
 * it refuses rather than serving copy nothing can edit.
 */

const STEPS = [
  {
    title: "Create a Supabase project",
    body: "Any region. Note the project URL and both API keys from Project Settings → API.",
  },
  {
    title: "Put the keys in .env.local",
    body: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY. The secret key is server-only and must never be prefixed NEXT_PUBLIC_.",
  },
  {
    title: "Apply the schema",
    body: "SUPABASE_DB_URL=… npm run db:migrate — creates the tables, the policies and the constraints.",
  },
  {
    title: "Seed the content",
    body: "SUPABASE_DB_URL=… npm run db:seed — writes the launch content. Safe to run twice; it never duplicates.",
  },
  {
    title: "Turn off public sign-up",
    body: "Authentication → Providers → Email, disable sign-ups. Administrators are invited from inside the admin, and this is the one part of that rule the code cannot enforce for you.",
  },
  {
    title: "Create the first administrator",
    body: "Authentication → Users → Add user, then insert a matching row in admin_profiles with role 'owner'. Everybody after that can be invited from here.",
  },
];

export function SetupNotice() {
  return (
    <main className="min-h-screen px-6 md:px-12 py-20 md:py-28">
      <div className="max-w-2xl mx-auto">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground-secondary">
          Loomie admin
        </p>
        <h1 className="mt-4 font-display font-normal text-4xl md:text-5xl leading-[0.95] text-foreground">
          Not connected yet
        </h1>
        <p className="mt-6 text-base md:text-lg leading-snug text-foreground-secondary">
          The admin needs a Supabase project. Until there is one, the public
          site renders the seeded content in development and refuses to serve
          content pages in production, and nothing written here would persist.
        </p>

        <ol className="mt-12 border-t border-border-custom">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-b border-border-custom py-6">
              <div className="flex gap-5">
                <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary pt-1 shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-lg text-foreground">{step.title}</h2>
                  <p className="mt-2 text-sm leading-snug text-foreground-secondary">
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm leading-snug text-foreground-secondary">
          The full version of this, with the environment variables listed, is in
          README.md.
        </p>
      </div>
    </main>
  );
}
