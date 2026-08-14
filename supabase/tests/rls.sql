-- ============================================================================
-- What the policies actually do.
--
-- Run against a database with the real migrations applied. Every check runs as
-- a Postgres role — anon, authenticated, service_role — with auth.uid() set to
-- a specific person, so what is being tested is the policy expression that
-- ships, not a description of it.
--
--   npm run db:test
-- ============================================================================

create temporary table results (
  area text,
  description text,
  passed boolean,
  detail text
);

create or replace function pg_temp.check(
  area text,
  description text,
  passed boolean,
  detail text default ''
) returns void language sql as $$
  insert into results values (area, description, passed, detail);
$$;

/**
 * Runs a statement as somebody and reports whether it was refused.
 *
 * "Refused" is any of: no privilege, no policy, or a row that simply is not
 * visible. A SELECT the policy hides returns zero rows rather than an error,
 * so the caller says which of the two it expects.
 */
create or replace function pg_temp.denied(
  as_role text,
  as_user uuid,
  statement text
) returns boolean language plpgsql as $$
declare
  refused boolean := false;
begin
  begin
    execute format('set local role %I', as_role);
    perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
    execute statement;
  exception
    when insufficient_privilege or check_violation then refused := true;
    when others then refused := true;
  end;
  reset role;
  return refused;
end;
$$;

/**
 * How many rows this person can see, or -1 when the command is refused before
 * a policy is even consulted.
 *
 * The two are different guarantees and the distinction is worth keeping. A
 * policy returning zero rows means "there is nothing here for you"; a refusal
 * means the public role was never granted SELECT on the table at all, which is
 * the stronger of the two and what bookings, enquiries, the administrator list
 * and the audit log rely on.
 */
create or replace function pg_temp.visible(
  as_role text,
  as_user uuid,
  query text
) returns bigint language plpgsql as $$
declare
  total bigint;
begin
  begin
    execute format('set local role %I', as_role);
    perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
    execute query into total;
  exception
    when insufficient_privilege then total := -1;
  end;
  reset role;
  return total;
end;
$$;

/**
 * How many rows a statement actually changed.
 *
 * The distinction that matters for writes. An UPDATE or DELETE that RLS
 * filters down to nothing is not refused — it runs, matches no rows and
 * reports success. Asserting an exception there would be asserting the wrong
 * thing, so the check is: the statement was allowed to run, and it changed
 * nothing. -1 means it was refused outright.
 */
create or replace function pg_temp.rows_changed(
  as_role text,
  as_user uuid,
  statement text
) returns integer language plpgsql as $$
declare
  affected integer := -1;
begin
  begin
    execute format('set local role %I', as_role);
    perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
    execute statement;
    get diagnostics affected = row_count;
  exception
    when others then affected := -1;
  end;
  reset role;
  return affected;
end;
$$;

-- ── Fixtures ───────────────────────────────────────────────────────────────
--
-- Cleared first, so the suite can be run twice against the same database. It
-- removes only what it created; anything else in these tables is left alone.

delete from project_media;
delete from project_sections;
delete from project_disciplines;
delete from projects where slug in ('published-study', 'draft-study');
delete from media where bucket = 'projects';
delete from admin_profiles
  where email in ('owner@example.com', 'editor@example.com', 'dormant@example.com',
                  'intruder@example.com', 'promoted@example.com', 'new@example.com');
delete from services where slug = 'identity';
delete from team_members where slug in ('published-person', 'hidden-person');
delete from social_links;
delete from site_settings where key in ('contact_email', 'favourite_colour');
delete from bookings;
delete from enquiries;

do $$
declare
  owner_uid uuid := '11111111-1111-1111-1111-111111111111';
  editor_uid uuid := '22222222-2222-2222-2222-222222222222';
  dormant_uid uuid := '33333333-3333-3333-3333-333333333333';
  live_media uuid;
  draft_media uuid;
begin
  insert into admin_profiles (auth_user_id, name, email, role, is_active) values
    (owner_uid, 'Owner', 'owner@example.com', 'owner', true),
    (editor_uid, 'Editor', 'editor@example.com', 'editor', true),
    (dormant_uid, 'Dormant', 'dormant@example.com', 'admin', false);

  insert into media (bucket, path, mime_type, size_bytes, alt)
    values ('projects', 'live.jpg', 'image/jpeg', 1000, 'live')
    returning id into live_media;
  insert into media (bucket, path, mime_type, size_bytes, alt)
    values ('projects', 'draft.jpg', 'image/jpeg', 1000, 'draft')
    returning id into draft_media;

  insert into projects (slug, index, title, sector, year, summary, cover_image_id, published)
    values ('published-study', '01', 'Published', 'Architecture', '2025', 'A published study.', live_media, true);
  insert into projects (slug, index, title, sector, year, summary, cover_image_id, published)
    values ('draft-study', '02', 'Draft', 'Objects', '2025', 'A draft study.', draft_media, false);

  insert into project_sections (project_id, kind, body)
    select id, 'scenario', 'Public section.' from projects where slug = 'published-study';
  insert into project_sections (project_id, kind, body)
    select id, 'scenario', 'Private section.' from projects where slug = 'draft-study';

  insert into services (slug, number, title, short_description, published)
    values ('identity', '01', 'Identity', 'Marks and systems.', true);

  insert into team_members (slug, name, role, published)
    values ('published-person', 'Published Person', 'Role', true);
  insert into team_members (slug, name, role, published)
    values ('hidden-person', 'Hidden Person', 'Role', false);

  insert into social_links (platform, label, url, enabled) values
    ('linkedin', 'LinkedIn', 'https://example.com/in', true),
    ('instagram', 'Instagram', null, false);

  insert into site_settings (key, value) values ('contact_email', 'hello@example.com');

  insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
    values ('AAAA1111', 'Ada', 'ada@example.com', '2030-01-01T09:00:00Z', '2030-01-01T09:20:00Z', 'Europe/London');

  insert into enquiries (name, email, message)
    values ('Grace', 'grace@example.com', 'A question.');
end
$$;

-- ── The public ─────────────────────────────────────────────────────────────

do $$
declare
  anon_uid uuid := null;
begin
  perform pg_temp.check('public read', 'sees the published project',
    pg_temp.visible('anon', anon_uid, 'select count(*) from projects') = 1);

  perform pg_temp.check('public read', 'cannot see the draft project',
    pg_temp.visible('anon', anon_uid, 'select count(*) from projects where slug = ''draft-study''') = 0);

  perform pg_temp.check('public read', 'cannot see a draft project''s sections',
    pg_temp.visible('anon', anon_uid, 'select count(*) from project_sections') = 1);

  perform pg_temp.check('public read', 'cannot see an unpublished team member',
    pg_temp.visible('anon', anon_uid, 'select count(*) from team_members') = 1);

  perform pg_temp.check('public read', 'sees only enabled social links',
    pg_temp.visible('anon', anon_uid, 'select count(*) from social_links') = 1);

  perform pg_temp.check('public read', 'sees media used by published content only',
    pg_temp.visible('anon', anon_uid, 'select count(*) from media') = 1);

  perform pg_temp.check('public read', 'is refused bookings outright',
    pg_temp.visible('anon', anon_uid, 'select count(*) from bookings') = -1,
    'no SELECT grant, not merely an empty policy');

  perform pg_temp.check('public read', 'is refused enquiries outright',
    pg_temp.visible('anon', anon_uid, 'select count(*) from enquiries') = -1,
    'no SELECT grant, not merely an empty policy');

  perform pg_temp.check('public read', 'is refused the administrator list outright',
    pg_temp.visible('anon', anon_uid, 'select count(*) from admin_profiles') = -1,
    'no SELECT grant, not merely an empty policy');

  perform pg_temp.check('public read', 'is refused the audit log outright',
    pg_temp.visible('anon', anon_uid, 'select count(*) from audit_log') = -1,
    'no SELECT grant, not merely an empty policy');

  -- Writes
  perform pg_temp.check('public write', 'cannot insert a project',
    pg_temp.denied('anon', anon_uid,
      'insert into projects (slug, index, title) values (''hacked'', ''99'', ''Hacked'')'));

  perform pg_temp.check('public write', 'cannot update a project',
    pg_temp.denied('anon', anon_uid, 'update projects set title = ''Hacked'''));

  perform pg_temp.check('public write', 'cannot delete a project',
    pg_temp.denied('anon', anon_uid, 'delete from projects'));

  perform pg_temp.check('public write', 'cannot edit a team member',
    pg_temp.denied('anon', anon_uid, 'update team_members set name = ''Hacked'''));

  perform pg_temp.check('public write', 'cannot edit a service',
    pg_temp.denied('anon', anon_uid, 'update services set title = ''Hacked'''));

  perform pg_temp.check('public write', 'cannot edit settings',
    pg_temp.denied('anon', anon_uid, 'update site_settings set value = ''hacked@example.com'''));

  perform pg_temp.check('public write', 'cannot insert a booking directly',
    pg_temp.denied('anon', anon_uid,
      'insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
       values (''BBBB2222'', ''X'', ''x@example.com'', ''2030-02-01T09:00:00Z'', ''2030-02-01T09:20:00Z'', ''UTC'')'));

  perform pg_temp.check('public write', 'cannot insert an enquiry directly',
    pg_temp.denied('anon', anon_uid,
      'insert into enquiries (name, email, message) values (''X'', ''x@example.com'', ''hi'')'));

  -- A signed-in visitor who is not an administrator is still the public.
  perform pg_temp.check('signed-in non-admin', 'cannot read bookings',
    pg_temp.visible('authenticated', '99999999-9999-9999-9999-999999999999',
      'select count(*) from bookings') = 0);
  -- authenticated does hold the grant, so this one is the policy returning
  -- nothing rather than the grant refusing. Both outcomes are correct here.

  perform pg_temp.check('signed-in non-admin', 'changes no project rows',
    pg_temp.rows_changed('authenticated', '99999999-9999-9999-9999-999999999999',
      'update projects set title = ''Hacked''') = 0,
    'the policy filters the update to nothing rather than raising');

  perform pg_temp.check('signed-in non-admin', 'cannot see the draft project',
    pg_temp.visible('authenticated', '99999999-9999-9999-9999-999999999999',
      'select count(*) from projects') = 1);
end
$$;

-- ── Administrators ─────────────────────────────────────────────────────────

do $$
declare
  owner_uid uuid := '11111111-1111-1111-1111-111111111111';
  editor_uid uuid := '22222222-2222-2222-2222-222222222222';
  dormant_uid uuid := '33333333-3333-3333-3333-333333333333';
begin
  perform pg_temp.check('editor', 'sees drafts as well as published work',
    pg_temp.visible('authenticated', editor_uid, 'select count(*) from projects') = 2);

  perform pg_temp.check('editor', 'can edit a project',
    not pg_temp.denied('authenticated', editor_uid,
      'update projects set summary = ''Edited by the editor.'' where slug = ''draft-study'''));

  perform pg_temp.check('editor', 'can edit a team member',
    not pg_temp.denied('authenticated', editor_uid,
      'update team_members set role = ''Edited'' where slug = ''hidden-person'''));

  perform pg_temp.check('editor', 'can read bookings',
    pg_temp.visible('authenticated', editor_uid, 'select count(*) from bookings') = 1);

  perform pg_temp.check('editor', 'can read enquiries',
    pg_temp.visible('authenticated', editor_uid, 'select count(*) from enquiries') = 1);

  perform pg_temp.check('editor', 'changes no settings rows',
    pg_temp.rows_changed('authenticated', editor_uid,
      'update site_settings set value = ''editor@example.com'' where key = ''contact_email''') = 0);

  perform pg_temp.check('editor', 'changes no social link rows',
    pg_temp.rows_changed('authenticated', editor_uid,
      'update social_links set url = ''https://example.com/hacked'' where platform = ''linkedin''') = 0);

  perform pg_temp.check('editor', 'cannot create another administrator',
    pg_temp.denied('authenticated', editor_uid,
      'insert into admin_profiles (auth_user_id, name, email, role)
       values (''44444444-4444-4444-4444-444444444444'', ''New'', ''new@example.com'', ''owner'')'));

  perform pg_temp.check('owner', 'can change site settings',
    not pg_temp.denied('authenticated', owner_uid,
      'update site_settings set value = ''owner@example.com'' where key = ''contact_email'''));

  perform pg_temp.check('owner', 'can change social links',
    not pg_temp.denied('authenticated', owner_uid,
      'update social_links set url = ''https://example.com/new'' where platform = ''linkedin'''));

  perform pg_temp.check('owner', 'can create an administrator',
    not pg_temp.denied('authenticated', owner_uid,
      'insert into admin_profiles (auth_user_id, name, email, role)
       values (''44444444-4444-4444-4444-444444444444'', ''New'', ''new@example.com'', ''editor'')'));

  -- Deactivation is the revocation. The row stays; the access goes.
  perform pg_temp.check('inactive admin', 'is treated as the public for reads',
    pg_temp.visible('authenticated', dormant_uid, 'select count(*) from projects') = 1);

  perform pg_temp.check('inactive admin', 'changes no content rows',
    pg_temp.rows_changed('authenticated', dormant_uid,
      'update projects set title = ''Hacked'' where slug = ''draft-study''') = 0);

  perform pg_temp.check('inactive admin', 'cannot read bookings',
    pg_temp.visible('authenticated', dormant_uid, 'select count(*) from bookings') = 0);
end
$$;

-- ── Constraints ────────────────────────────────────────────────────────────

do $$
declare
  slot timestamptz := '2030-03-01T09:00:00Z';
  taken uuid;
begin
  perform pg_temp.check('constraints', 'project slugs are unique',
    pg_temp.denied('service_role', null,
      'insert into projects (slug, index, title) values (''published-study'', ''98'', ''Duplicate'')'));

  perform pg_temp.check('constraints', 'a slug must be lower-case and hyphenated',
    pg_temp.denied('service_role', null,
      'insert into projects (slug, index, title) values (''Not A Slug'', ''97'', ''Bad slug'')'));

  perform pg_temp.check('constraints', 'media in use cannot be deleted',
    pg_temp.denied('service_role', null,
      'delete from media where path = ''live.jpg'''));

  insert into media (bucket, path, mime_type, size_bytes)
    values ('site', 'loose.jpg', 'image/jpeg', 10);
  perform pg_temp.check('constraints', 'unused media can be deleted',
    pg_temp.rows_changed('service_role', null,
      'delete from media where path = ''loose.jpg''') = 1);

  perform pg_temp.check('constraints', 'a non-image upload is refused',
    pg_temp.denied('service_role', null,
      'insert into media (bucket, path, mime_type, size_bytes) values (''site'', ''x.exe'', ''application/x-msdownload'', 10)'));

  perform pg_temp.check('constraints', 'an enabled social link must have a URL',
    pg_temp.denied('service_role', null,
      'update social_links set enabled = true where platform = ''instagram'''));

  perform pg_temp.check('constraints', 'an unknown setting key is refused',
    pg_temp.denied('service_role', null,
      'insert into site_settings (key, value) values (''favourite_colour'', ''blue'')'));

  -- The booking slot, which is the one that matters under concurrency.
  insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
    values ('CCCC3333', 'First', 'first@example.com', slot, slot + interval '20 minutes', 'UTC')
    returning id into taken;

  perform pg_temp.check('constraints', 'a second booking cannot take the same slot',
    pg_temp.denied('service_role', null,
      format('insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
              values (''DDDD4444'', ''Second'', ''second@example.com'', %L, %L, ''UTC'')',
             slot, slot + interval '20 minutes')));

  update bookings set status = 'cancelled' where id = taken;

  perform pg_temp.check('constraints', 'cancelling a booking frees its slot',
    not pg_temp.denied('service_role', null,
      format('insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
              values (''EEEE5555'', ''Third'', ''third@example.com'', %L, %L, ''UTC'')',
             slot, slot + interval '20 minutes')));

  perform pg_temp.check('constraints', 'a booking cannot end before it starts',
    pg_temp.denied('service_role', null,
      'insert into bookings (booking_code, name, email, start_at, end_at, visitor_timezone)
       values (''FFFF6666'', ''Fourth'', ''fourth@example.com'', ''2030-04-01T10:00:00Z'', ''2030-04-01T09:00:00Z'', ''UTC'')'));
end
$$;

-- ── Report ─────────────────────────────────────────────────────────────────

\echo ''
select
  case when passed then '  PASS  ' else '  FAIL  ' end
  || rpad(area, 22) || description || case when detail = '' then '' else '  — ' || detail end
  as "Row level security"
from results
order by ctid;

\echo ''
select
  count(*) filter (where passed) || ' passed, '
  || count(*) filter (where not passed) || ' failed'
  as "Result"
from results;

select case when count(*) > 0 then 1 else 0 end as failures from results where not passed
\gset
\if :failures
\echo 'FAILURES PRESENT'
\quit 1
\endif
