-- ============================================================================
-- The smallest amount of Supabase needed to run the real migrations locally.
--
-- Not a mock of the policies — the policies under supabase/migrations are the
-- ones that ship and the ones the tests exercise. This file only supplies the
-- three things Supabase provides that plain Postgres does not: the roles the
-- grants name, an `auth` schema, and `auth.uid()`.
--
-- auth.uid() reads a session GUC instead of a JWT claim, so a test can say
-- "now I am this user" with a `set` and watch the same policy decide. Supabase
-- reads the claim; the policy expression is identical either way.
--
-- Never run against a Supabase project: it would replace auth.uid() with one
-- that ignores the JWT and trusts a setting the client could send.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;

/** The signed-in user, from a session setting rather than a verified JWT. */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
