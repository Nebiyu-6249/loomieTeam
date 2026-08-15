# QA harness

Suites that run the built application against real infrastructure rather than
mocks of it. Each needs `SUPABASE_DB_URL` pointing at a Postgres carrying the
schema from `supabase/migrations`, and a production build (`npm run build`).

These start their own server on their own port:

    npm run build
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/booking.mjs        # 33
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/booking-happy.mjs  # 38
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/enquiry.mjs        # 40
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/admin.mjs          # 57
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/media-upload.mjs   # 47

The rest need one already running. `stub-and-serve.mjs` runs the PostgREST stub
and a production server together in the foreground — foreground on purpose,
because a detached child that outlives its wrapper is how a run ends up
measuring a build from twenty minutes ago:

    SUPABASE_DB_URL="postgres://…/loomie" PORT=3231 STUB_PORT=3395 \
      node .qa/stub-and-serve.mjs

    BASE=http://localhost:3231 node .qa/a11y.mjs          # 65 — landmarks, headings, focus, labels
    PORT=3231 node .qa/responsive.mjs                     # overflow at 8 widths across 7 routes
    BASE=… node .qa/hero-reel.mjs                         # 38 — the hero's spatial stack
    BASE=… node .qa/team-gallery.mjs                      # 29 — the ring, and the DOM behind it
    BASE=… node .qa/socials.mjs                           # 16 — real links only, and revalidation
    BASE=… node .qa/bundle.mjs                            # which libraries reach which route
    node .qa/weight2.mjs                                  # initial JS, and what three.js adds
    SUPABASE_DB_URL="…" node .qa/hero-from-db.mjs         # 5 — the hero is not a constant

Set `QA_ADMIN_EMAIL` on `stub-and-serve.mjs` to get an owner account you can
sign in as, for looking at `/admin` by hand.

`restore-seed.mjs` puts the fixture database back to the seeded text after a
run that edited content.

The policies and the hardening functions are tested against Postgres directly,
not through a browser:

    SUPABASE_DB_URL="postgres://…/loomie_test" npm run db:test   # 71

Anything needing a browser also needs `playwright` resolvable from the repo.

## storageStub.mjs

Supabase Storage is a different service from PostgREST, and the media uploader
now talks to it directly from the browser. This is a Storage-shaped front door
with the objects held in memory: signed upload tickets, the PUT that spends one,
`info`, `remove`, and the public URL.

Its `faults` object is the reason it exists. A missing bucket, a refused upload
and a failed read-back are the cases that decide whether a half-finished upload
leaves an orphan behind, and none of them can be caused on demand against a real
project. `.qa/media-upload.mjs` switches each one on in turn.

## postgrestStub.mjs

Supabase's REST API is PostgREST. This is a PostgREST-shaped front door onto a
plain Postgres, so the booking and enquiry paths can be exercised without a
Supabase project: the route handlers, `lib/bookingStore`, `lib/enquiries` and
`supabase-js` all run unmodified, and the guarantee that matters — that two
people cannot claim one slot — is enforced by the real partial unique index.

It is **not** PostgREST. It implements the query shapes this codebase issues and
nothing else: a handful of filter operators, one level of embedding, `order`,
single-row `Accept` negotiation, and `POST /rest/v1/rpc/<function>`. Foreign
keys and function signatures are both read from the catalogue rather than
hand-listed, because hand-listing them is how it was wrong first time. A query
the application does not make is a query this will get wrong.

Row level security is **not** bypassed. Every request opens a transaction and
does `set local role`, so the service key gets `service_role` and a signed-in
administrator gets `authenticated` carrying their own `auth.uid()`. That is what
makes the editor check in `admin.mjs` worth anything: it reads the editor's real
access token out of the session cookie and calls the REST API with it, and the
database is what refuses. The policies are additionally tested directly against
Postgres by `supabase/tests/` (`npm run db:test`).

## Notes

Each block runs its own server on its own port, in its own process group, so
one signal takes down the whole tree. Killing the `npx` wrapper alone leaves
`next-server` holding the port, and the next block then talks to the previous
block's process with the previous block's environment.

Callers are given distinct forwarded addresses. The rate limiter is five per
ten minutes per address and it runs before validation, so a suite sharing one
address stops testing validation after the fifth case.
