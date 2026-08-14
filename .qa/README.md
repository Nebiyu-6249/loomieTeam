# QA harness

Suites that run the built application against real infrastructure rather than
mocks of it. Each needs `SUPABASE_DB_URL` pointing at a Postgres carrying the
schema from `supabase/migrations`, and a production build (`npm run build`).

    npm run build
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/booking.mjs
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/booking-happy.mjs
    SUPABASE_DB_URL="postgres://…/loomie" node .qa/enquiry.mjs

## postgrestStub.mjs

Supabase's REST API is PostgREST. This is a PostgREST-shaped front door onto a
plain Postgres, so the booking and enquiry paths can be exercised without a
Supabase project: the route handlers, `lib/bookingStore`, `lib/enquiries` and
`supabase-js` all run unmodified, and the guarantee that matters — that two
people cannot claim one slot — is enforced by the real partial unique index.

It is **not** PostgREST. It implements the query shapes this codebase issues and
nothing else: a handful of filter operators, one level of embedding, `order`,
and single-row `Accept` negotiation. Foreign keys are read from the catalogue
rather than hand-listed, because hand-listing them is how it was wrong first
time. A query the application does not make is a query this will get wrong.

Row level security is not simulated. The booking and enquiry paths use the
service role, which bypasses RLS in production too; the policies themselves are
tested directly against Postgres by `supabase/tests/rls.sql` (`npm run db:test`).

## Notes

Each block runs its own server on its own port, in its own process group, so
one signal takes down the whole tree. Killing the `npx` wrapper alone leaves
`next-server` holding the port, and the next block then talks to the previous
block's process with the previous block's environment.

Callers are given distinct forwarded addresses. The rate limiter is five per
ten minutes per address and it runs before validation, so a suite sharing one
address stops testing validation after the fifth case.
