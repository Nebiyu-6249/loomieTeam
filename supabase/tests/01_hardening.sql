-- ============================================================================
-- Loomie — the hardening guarantees, tested from the outside
--
-- Three claims that were previously made in comments and not checked:
--
--   the services rename preserved every UUID, so bookings still point at the
--   service they were made against;
--
--   saving a project is atomic — a failure part-way leaves the project exactly
--   as it was rather than with new prose and an old gallery;
--
--   swapping two positions and saving six settings are each one statement.
--
-- Uses the same reporting table and helpers as rls.sql so one runner prints
-- both. Run after rls.sql, which creates them.
-- ============================================================================

-- ── Fixtures ───────────────────────────────────────────────────────────────

delete from bookings where booking_code like 'HARD-%';
delete from projects where slug like 'atomic-%';
delete from media where path like 'hardening/%';
delete from services where slug like 'hardening-%';

do $$
declare
  owner_uid uuid := '11111111-1111-1111-1111-111111111111';
  service_id uuid;
  media_a uuid;
  media_b uuid;
  v_project uuid;
  before_ids uuid[];
  after_ids uuid[];
  swapped integer;
  written integer;
  first_pos integer;
  second_pos integer;
  section_count integer;
  gallery_count integer;
  saved_summary text;
begin
  -- ── The rename mechanism keeps every identity ───────────────────────────
  --
  -- Tested on its own fixture rather than on whatever the database currently
  -- holds: the assertion is about how the migration renames, not about which
  -- services happen to be seeded here. A service is created under an old slug
  -- with a booking pointing at it, the migration's own UPDATE is applied, and
  -- the id has to come out the other side unchanged.
  --
  -- Had the migration deleted and recreated instead, service_id would have
  -- gone to null under ON DELETE SET NULL and the booking would have lost what
  -- it was about — silently, because that is what SET NULL does.

  insert into services (slug, number, title, short_description, published)
  values ('hardening-old-slug', '90', 'Old Name', 'Before.', true)
  returning id into service_id;

  insert into bookings (booking_code, name, email, service_id, start_at, end_at, visitor_timezone)
  values ('HARD-0001', 'Ada', 'ada@example.com', service_id,
          '2031-01-01T09:00:00Z', '2031-01-01T09:20:00Z', 'Europe/London');

  update services set
    slug = 'hardening-new-slug',
    title = 'New Name',
    short_description = 'After.'
  where slug = 'hardening-old-slug';

  perform pg_temp.check('rename', 'the row keeps its id',
    (select id from services where slug = 'hardening-new-slug') = service_id);

  perform pg_temp.check('rename', 'the old slug is gone',
    not exists (select 1 from services where slug = 'hardening-old-slug'));

  perform pg_temp.check('rename', 'and the booking still resolves to it',
    (select s.title from bookings b join services s on s.id = b.service_id
      where b.booking_code = 'HARD-0001') = 'New Name');

  -- Running the same guarded UPDATE again matches nothing, which is what makes
  -- the migration re-runnable.
  update services set slug = 'hardening-new-slug' where slug = 'hardening-old-slug';
  get diagnostics written = row_count;
  perform pg_temp.check('rename', 'and re-running it changes nothing',
    written = 0, written::text);

  -- ── save_project is one transaction ─────────────────────────────────────

  insert into media (bucket, path, mime_type, size_bytes, alt)
    values ('site', 'hardening/a.jpg', 'image/jpeg', 1000, 'A')
    returning id into media_a;
  insert into media (bucket, path, mime_type, size_bytes, alt)
    values ('site', 'hardening/b.jpg', 'image/jpeg', 1000, 'B')
    returning id into media_b;

  -- Create, with two disciplines, three sections and two gallery entries.
  select public.save_project(
    null,
    jsonb_build_object(
      'slug', 'atomic-one', 'index', '90', 'title', 'Atomic One',
      'sector', 'Testing', 'year', '2031', 'summary', 'First save.',
      'study_type', 'concept', 'status', 'placeholder',
      'display_order', 90, 'featured', false, 'published', false
    ),
    array['Identity', 'Website'],
    jsonb_build_array(
      jsonb_build_object('kind', 'scenario', 'body', 'The scenario.'),
      jsonb_build_object('kind', 'direction', 'body', 'The direction.'),
      jsonb_build_object('kind', 'demonstration', 'body', 'The demonstration.')
    ),
    jsonb_build_array(
      jsonb_build_object('media_id', media_a, 'alt', 'First'),
      jsonb_build_object('media_id', media_b, 'alt', 'Second')
    )
  ) into v_project;

  perform pg_temp.check('save_project', 'creates the project',
    v_project is not null);

  perform pg_temp.check('save_project', 'with its disciplines',
    (select count(*) from project_disciplines where project_id = v_project) = 2);

  perform pg_temp.check('save_project', 'its three sections',
    (select count(*) from project_sections where project_id = v_project) = 3);

  perform pg_temp.check('save_project', 'and its gallery in order',
    (select string_agg(alt, ',' order by display_order)
       from project_media where project_id = v_project) = 'First,Second');

  -- Now a save that must fail: a gallery entry pointing at a media row that
  -- does not exist violates the foreign key. Everything in the same call has
  -- to roll back with it.
  select array_agg(id order by id) into before_ids
    from project_media where project_id = v_project;

  begin
    perform public.save_project(
      v_project,
      jsonb_build_object(
        'slug', 'atomic-one', 'index', '90', 'title', 'Atomic One',
        'sector', 'Testing', 'year', '2031', 'summary', 'SHOULD NOT PERSIST.',
        'study_type', 'concept', 'status', 'placeholder',
        'display_order', 90, 'featured', false, 'published', false
      ),
      array['Changed'],
      jsonb_build_array(
        jsonb_build_object('kind', 'scenario', 'body', 'SHOULD NOT PERSIST.')
      ),
      jsonb_build_array(
        jsonb_build_object('media_id', '00000000-0000-0000-0000-000000000999', 'alt', 'Missing')
      )
    );
    perform pg_temp.check('save_project', 'a bad gallery reference is refused', false,
      'the call succeeded when it should have failed');
  exception when others then
    perform pg_temp.check('save_project', 'a bad gallery reference is refused', true);
  end;

  select summary into saved_summary from projects where id = v_project;
  select count(*) into section_count from project_sections where project_id = v_project;
  select count(*) into gallery_count from project_media where project_id = v_project;
  select array_agg(id order by id) into after_ids
    from project_media where project_id = v_project;

  -- This is the whole point. The previous implementation would have written
  -- the summary, deleted the sections, replaced them with one, and only then
  -- hit the bad gallery row — leaving the project in a state nobody asked for.
  perform pg_temp.check('save_project', 'the failed save left the summary alone',
    saved_summary = 'First save.', coalesce(saved_summary, '<null>'));

  perform pg_temp.check('save_project', 'left all three sections',
    section_count = 3, section_count::text);

  perform pg_temp.check('save_project', 'and left the gallery untouched',
    gallery_count = 2 and before_ids = after_ids, gallery_count::text);

  -- ── swap_display_order ──────────────────────────────────────────────────

  insert into services (slug, number, title, display_order, published)
  values ('hardening-a', '91', 'Hardening A', 910, true),
         ('hardening-b', '92', 'Hardening B', 920, true);

  select display_order into first_pos from services where slug = 'hardening-a';
  select display_order into second_pos from services where slug = 'hardening-b';

  select public.swap_display_order(
    'services',
    (select id from services where slug = 'hardening-a'),
    (select id from services where slug = 'hardening-b')
  ) into swapped;

  perform pg_temp.check('swap_display_order', 'moves both rows in one statement',
    swapped = 2, swapped::text);

  perform pg_temp.check('swap_display_order', 'and they really traded places',
    (select display_order from services where slug = 'hardening-a') = second_pos
    and (select display_order from services where slug = 'hardening-b') = first_pos);

  begin
    perform public.swap_display_order('pg_authid', gen_random_uuid(), gen_random_uuid());
    perform pg_temp.check('swap_display_order', 'refuses a table not on the list', false,
      'an arbitrary table name was accepted');
  exception when others then
    perform pg_temp.check('swap_display_order', 'refuses a table not on the list', true);
  end;

  -- ── save_settings ───────────────────────────────────────────────────────

  select public.save_settings(
    jsonb_build_object(
      'contact_email', 'hardening@example.com',
      'footer_statement', 'Hardening test'
    ),
    null
  ) into written;

  perform pg_temp.check('save_settings', 'writes every key in one statement',
    written = 2, written::text);

  perform pg_temp.check('save_settings', 'and the values landed',
    (select value from site_settings where key = 'contact_email') = 'hardening@example.com'
    and (select value from site_settings where key = 'footer_statement') = 'Hardening test');

  -- A key the table's CHECK constraint does not allow must take the whole
  -- batch with it rather than leaving half the settings changed.
  begin
    perform public.save_settings(
      jsonb_build_object(
        'contact_email', 'should-not-persist@example.com',
        'favourite_colour', 'blue'
      ),
      null
    );
    perform pg_temp.check('save_settings', 'an unknown key fails the batch', false,
      'the call succeeded when it should have failed');
  exception when others then
    perform pg_temp.check('save_settings', 'an unknown key fails the batch', true);
  end;

  perform pg_temp.check('save_settings', 'and the good key in that batch did not persist',
    (select value from site_settings where key = 'contact_email') = 'hardening@example.com',
    coalesce((select value from site_settings where key = 'contact_email'), '<null>'));
end $$;

-- ── Editors cannot call what they cannot do ────────────────────────────────
--
-- save_project runs SECURITY INVOKER, so an editor calling it is still subject
-- to the project policies — which permit them. The interesting case is the one
-- the RPC must not become: a way around a policy. save_settings is granted to
-- authenticated, so an editor can call it; the site_settings policy is what
-- refuses the write, and the function raises rather than reporting success.

do $$
declare
  editor_uid uuid := '22222222-2222-2222-2222-222222222222';
begin
  perform pg_temp.check('rpc', 'an editor calling save_settings is refused',
    pg_temp.denied('authenticated', editor_uid,
      'select public.save_settings(''{"footer_statement":"editor was here"}''::jsonb, null)'));

  perform pg_temp.check('rpc', 'and the setting is unchanged',
    (select value from site_settings where key = 'footer_statement') = 'Hardening test',
    coalesce((select value from site_settings where key = 'footer_statement'), '<null>'));
end $$;

-- ── Tidy up ────────────────────────────────────────────────────────────────

delete from bookings where booking_code like 'HARD-%';
delete from project_media where project_id in (select id from projects where slug like 'atomic-%');
delete from projects where slug like 'atomic-%';
delete from media where path like 'hardening/%';
delete from services where slug like 'hardening-%';
