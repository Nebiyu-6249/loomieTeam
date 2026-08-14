# Loomie

The studio's website and the admin the studio runs it from.

Next.js 16 (App Router, Turbopack), Supabase for the database, authentication
and file storage, Resend for email, GSAP and three.js for the parts of the
homepage that move.

---

## Running it

```bash
npm install
npm run dev
```

That works with no configuration at all: the site renders the seeded content
from `lib/seed-content.ts`, warns once in the console that it is doing so, and
`/admin` shows a setup screen. Nothing written anywhere persists.

Production is stricter. With no database configured, content pages refuse to
render rather than quietly serving copy nobody can edit — a live site showing
one set of content while an admin writes to another is worse than a site that
says it is not finished being set up.

---

## Setting up Supabase

Six steps, in this order. The setup screen at `/admin` lists the same ones.

**1. Create a project.** Any region. Note the project URL and both API keys
from Project Settings → API.

**2. Fill in `.env.local`.** Copy `.env.example` and set at least
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY`.

> The secret key bypasses row level security. It must never be prefixed
> `NEXT_PUBLIC_` — that prefix compiles a value into the browser bundle.

**3. Apply the schema.**

```bash
SUPABASE_DB_URL="postgres://…" npm run db:migrate
```

Creates sixteen tables, thirty-one policies and the constraints the application
relies on. Safe to run twice.

**4. Seed the content.**

```bash
SUPABASE_DB_URL="postgres://…" npm run db:seed
```

Writes the launch content — the concept studies, the four services, the seven
team members, the sectors, the partners and the settings. Idempotent: it
creates rows that do not exist and leaves everything else alone, so re-seeding
never overwrites work done in the admin.

**5. Turn off public sign-up.** Authentication → Providers → Email, disable
sign-ups. There is no route in this application that creates an account, but
Supabase's own endpoint is open by default and this is the one part of that
rule the code cannot enforce for you.

**6. Create the first administrator.** Authentication → Users → Add user, then
insert a matching row:

```sql
insert into admin_profiles (auth_user_id, name, email, role)
values ('<the auth user id>', 'Your Name', 'you@example.com', 'owner');
```

Everybody after that is added from inside the admin.

**Storage.** The media library uploads to a bucket named `site`. Create it in
Storage and make it public, or uploads fail with a message saying so.

---

## The admin

`/admin`. Three roles:

| Role | Can |
| --- | --- |
| Owner | Everything, including adding and removing administrators. |
| Administrator | Everything except removing the owner. |
| Editor | Content only — work, services, sectors, engagements, team, partners and media. |

Access is enforced in three places, deliberately. Every page calls
`requireAdmin()`; every write re-checks; and the database has its own policies,
so an editor posting to a restricted table gets zero rows changed because
Postgres says so, not because the interface remembered to hide a link.

Admin writes go through the signed-in person's session, not the service key.
That is the harder choice and the point of it — the service key would make
everything work without a single policy, and the first mistake would then be a
hole rather than a refusal.

`/admin` is disallowed in `robots.txt`, carries `noindex`, is absent from the
sitemap and has no OpenGraph card, so a link pasted into a chat is a bare URL
rather than an advertisement for itself.

---

## Where content comes from

One decision, made in `lib/supabase/config.ts`, that everything else reads:

| | Public pages | Admin |
| --- | --- | --- |
| Configured | Supabase | Supabase |
| Not configured, development | Seeded content, with a warning | Setup screen |
| Not configured, production | Refuses | Setup screen |

There is no fourth state. Every page reads `lib/content.ts`, so the site cannot
end up with the admin writing to a database while the pages render constants.

A production **build** with no credentials is allowed to finish — otherwise
every CI pipeline would need production secrets. It marks content routes
dynamic instead, so the seed is never frozen into a built page and the refusal
happens against a real request.

---

## Scripts

| | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply `supabase/migrations`, in order |
| `npm run db:seed` | Write the launch content, idempotently |
| `npm run db:test` | Run the row level security suite |
| `npm run make-artefacts` | Regenerate the drawn plates in `public/images/work` |
| `npm run optimise-images` | Re-encode photography |

The `db:*` scripts need `SUPABASE_DB_URL`. It is a setup-time credential:
nothing at runtime uses it, and it does not belong in the deployed environment.

---

## Tests

**Row level security** — 45 checks, run against real Postgres:

```bash
SUPABASE_DB_URL="postgres://…" npm run db:test
```

Public read and write, signed-in non-administrators, editors, owners,
deactivated accounts, and the constraints — including that two people cannot
book the same slot and that cancelling frees it.

**The application** — see `.qa/README.md`. Three suites drive a production
build against a PostgREST-shaped stub over a real Postgres, so the route
handlers, the stores, `supabase-js` and the real policies all run unmodified:

```bash
npm run build
SUPABASE_DB_URL="postgres://…" node .qa/booking.mjs        # 33 checks
SUPABASE_DB_URL="postgres://…" node .qa/booking-happy.mjs  # 38 checks
SUPABASE_DB_URL="postgres://…" node .qa/enquiry.mjs        # 32 checks
SUPABASE_DB_URL="postgres://…" node .qa/admin.mjs          # 50 checks, needs playwright
```

---

## Content notes

The concept studies, the partner names and the sector panels are placeholder
content, and the site says so wherever they appear: every study carries a
"Concept study" label on its card, in the archive and at the top of the study
itself. No client is named, no result is claimed, and no third party's
trademark appears anywhere.

Team members are the seven people supplied, with their roles. The bios and
photographs are empty because none were supplied, and the layout is built to be
right that way — a member without a photograph gets a numbered plate rather
than a stock portrait of somebody who does not work here.

Social links render nothing until an account is enabled with a real address.
The database enforces the same pair, so there is no arrangement of settings
that produces a link to nowhere.

---

## Imagery

Most of the imagery is drawn rather than photographed, by
`npm run make-artefacts`: a brand manual sheet, a type specimen, a grid
diagram, a tonal ramp, a page structure, a campaign in three formats, a built
page, and four sector plates. They use the site's own typefaces, its own logo
geometry and its own palette.

That started as a constraint — the placeholder photography carried other
companies' trademarks and had to go, and new photography cannot be fetched
under this environment's network policy — and turned out to be the better
answer for a design studio's website than more stock photography would have
been.
