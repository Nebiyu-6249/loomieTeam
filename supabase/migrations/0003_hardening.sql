-- ============================================================================
-- Loomie — live hardening
--
-- Four things, all of which are corrections to something already deployed
-- rather than new capability.
--
--   1. The services are renamed. The database is already seeded, so this
--      updates existing rows in place by their old slug: the UUIDs survive and
--      so does every booking, enquiry and media reference that points at them.
--
--   2. Editors could read and update bookings and enquiries. The policies used
--      is_admin(), which is true for any active administrator including an
--      editor. They now use can_administer(), which is owners and admins only.
--
--   3. Compound writes become genuinely atomic. Saving a project was a row
--      update plus six child statements over separate REST calls; a failure
--      halfway left a project with new prose and an old gallery. Reordering was
--      two updates that could leave two rows holding the same position. Saving
--      settings was six upserts that could half-apply. All three are now single
--      database calls, which is the only thing that actually makes them atomic.
--
--   4. Booking notifications can be addressed from the database rather than
--      only from the environment.
--
-- Re-runnable, like the migrations before it.
-- ============================================================================

-- ── 1. The services ────────────────────────────────────────────────────────
--
-- Matched on the old slug, which is the only stable identifier that survived
-- from the seed. Nothing is deleted and nothing is recreated: services are
-- referenced by bookings.service_id and enquiries.service_id with ON DELETE SET
-- NULL, so a delete-and-recreate would silently detach every appointment
-- somebody has already made.
--
-- Guarded on the old slug still being present, so running this twice is a
-- no-op rather than an error, and so it cannot overwrite a service the studio
-- has since renamed themselves.

do $$
begin
  -- 01 Identity → Logo Design
  update services set
    slug = 'logo-design',
    title = 'Logo Design',
    short_description = 'Marks drawn from their own geometry, built to survive every size.',
    hero_label = 'Logo / Mark / Construction',
    hero_description = 'Drawn from its own geometry.'
  where slug = 'identity';

  -- 02 Web identity → Brand Identity
  update services set
    slug = 'brand-identity',
    title = 'Brand Identity',
    short_description = 'Type, colour and the rules that keep a brand recognisable.',
    hero_label = 'Identity / Type / Colour',
    hero_description = 'One system, every surface.'
  where slug = 'web-identity';

  -- 03 Marketing design → Marketing Design (slug unchanged)
  update services set
    title = 'Marketing Design',
    short_description = 'Campaign work built from the brand, not beside it.',
    hero_label = 'Marketing / Campaign / Formats',
    hero_description = 'One line, every format.'
  where slug = 'marketing-design' and title <> 'Marketing Design';

  -- 04 Websites → Website Design
  update services set
    slug = 'website-design',
    title = 'Website Design',
    short_description = 'Fast, legible sites designed to keep growing.',
    hero_label = 'Website / Layout / Interface',
    hero_description = 'The system, actually built.'
  where slug = 'websites';
end $$;

-- Brand Identity leads with the type specimen in the hero, so the four reel
-- states are four visibly different artefacts: a mark, a specimen, a campaign
-- and a built page. Only set when the row still points at what the seed gave
-- it, so a deliberate choice in the admin is never overwritten.
do $$
declare
  specimen uuid;
  tone uuid;
begin
  select id into specimen from media where path = 'work/sheet-type.jpg';
  select id into tone from media where path = 'work/sheet-tone.jpg';

  if specimen is not null then
    update services
       set hero_media_id = specimen
     where slug = 'brand-identity' and hero_media_id = tone;
  end if;

  if tone is not null then
    update services
       set visual_media_id = tone
     where slug = 'brand-identity' and visual_media_id = tone;
  end if;
end $$;

-- ── 2. Editors are not operations staff ────────────────────────────────────
--
-- is_admin() is "has an active administrator profile", which an editor does.
-- Bookings and enquiries carry visitors' names, addresses and messages, and
-- the intended split has always been that editors change content and owners
-- and admins handle the people who got in touch. The interface already hid
-- these; the database now refuses them.

drop policy if exists bookings_admin_read on bookings;
create policy bookings_admin_read on bookings
  for select using (public.can_administer());

drop policy if exists bookings_admin_write on bookings;
create policy bookings_admin_write on bookings
  for update using (public.can_administer()) with check (public.can_administer());

drop policy if exists enquiries_admin_read on enquiries;
create policy enquiries_admin_read on enquiries
  for select using (public.can_administer());

drop policy if exists enquiries_admin_write on enquiries;
create policy enquiries_admin_write on enquiries
  for update using (public.can_administer()) with check (public.can_administer());

-- ── 3a. Saving a project, atomically ───────────────────────────────────────
--
-- SECURITY INVOKER, deliberately. The function runs as the administrator who
-- called it, so every statement inside is still filtered by the same policies
-- that governed the six REST calls it replaces. Making this SECURITY DEFINER
-- would have made it work for everybody, which is the opposite of the point.
--
-- A function body is one transaction. That sentence is the whole reason this
-- exists: the previous implementation checked each REST call's error and
-- called that atomic, and it was not — a project could end up with the new
-- prose and the old gallery, and no way to tell from the outside.

create or replace function public.save_project(
  p_id uuid,
  p_project jsonb,
  p_disciplines text[],
  p_sections jsonb,
  p_gallery jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_touched integer;
  v_item jsonb;
  v_index integer;
begin
  if v_id is null then
    insert into projects (
      slug, index, title, sector, year, summary, study_type, status,
      cover_image_id, hero_image_id, display_order, featured, published
    )
    values (
      p_project->>'slug',
      p_project->>'index',
      p_project->>'title',
      coalesce(p_project->>'sector', ''),
      coalesce(p_project->>'year', ''),
      coalesce(p_project->>'summary', ''),
      coalesce((p_project->>'study_type')::project_study_type, 'concept'),
      coalesce((p_project->>'status')::project_status, 'placeholder'),
      nullif(p_project->>'cover_image_id', '')::uuid,
      nullif(p_project->>'hero_image_id', '')::uuid,
      coalesce((p_project->>'display_order')::integer, 0),
      coalesce((p_project->>'featured')::boolean, false),
      coalesce((p_project->>'published')::boolean, false)
    )
    returning id into v_id;
  else
    update projects set
      slug = p_project->>'slug',
      index = p_project->>'index',
      title = p_project->>'title',
      sector = coalesce(p_project->>'sector', ''),
      year = coalesce(p_project->>'year', ''),
      summary = coalesce(p_project->>'summary', ''),
      study_type = coalesce((p_project->>'study_type')::project_study_type, 'concept'),
      status = coalesce((p_project->>'status')::project_status, 'placeholder'),
      cover_image_id = nullif(p_project->>'cover_image_id', '')::uuid,
      hero_image_id = nullif(p_project->>'hero_image_id', '')::uuid,
      display_order = coalesce((p_project->>'display_order')::integer, 0),
      featured = coalesce((p_project->>'featured')::boolean, false),
      published = coalesce((p_project->>'published')::boolean, false)
    where id = v_id;

    get diagnostics v_touched = row_count;

    -- Zero rows means row level security filtered the update away rather than
    -- the statement failing. Raised as an error so the caller cannot report a
    -- save that did not happen.
    if v_touched = 0 then
      raise exception 'project not updated'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Disciplines and sections are wholly derived from the form and have no
  -- identity worth preserving, so they are replaced.
  delete from project_disciplines where project_id = v_id;

  if p_disciplines is not null then
    insert into project_disciplines (project_id, discipline, display_order)
    select v_id, discipline, ordinality - 1
      from unnest(p_disciplines) with ordinality as t(discipline, ordinality);
  end if;

  delete from project_sections where project_id = v_id;

  v_index := 0;
  for v_item in select * from jsonb_array_elements(p_sections)
  loop
    insert into project_sections (project_id, kind, body, display_order)
    values (
      v_id,
      (v_item->>'kind')::project_section_kind,
      coalesce(v_item->>'body', ''),
      v_index
    );
    v_index := v_index + 1;
  end loop;

  -- The gallery is matched rather than replaced: its rows reference media
  -- under ON DELETE RESTRICT, so churning them every save is foreign key
  -- traffic for nothing.
  delete from project_media
   where project_id = v_id
     and media_id not in (
       select (value->>'media_id')::uuid from jsonb_array_elements(p_gallery)
     );

  v_index := 0;
  for v_item in select * from jsonb_array_elements(p_gallery)
  loop
    insert into project_media (project_id, media_id, role, alt, display_order)
    values (
      v_id,
      (v_item->>'media_id')::uuid,
      'gallery',
      coalesce(v_item->>'alt', ''),
      v_index
    )
    on conflict (project_id, media_id, role)
      do update set alt = excluded.alt, display_order = excluded.display_order;
    v_index := v_index + 1;
  end loop;

  return v_id;
end $$;

-- project_media needs a key for the upsert above to conflict against. A
-- project showing the same image twice in one gallery was never intended.
create unique index if not exists project_media_unique_per_role
  on project_media (project_id, media_id, role);

grant execute on function
  public.save_project(uuid, jsonb, text[], jsonb, jsonb) to authenticated;

-- ── 3b. Swapping two rows' positions, atomically ───────────────────────────
--
-- Two updates over REST could leave both rows holding the same position if the
-- second failed. One statement cannot.
--
-- The table name is checked against a fixed list rather than interpolated
-- blindly: this is dynamic SQL, and dynamic SQL taking a caller-supplied
-- identifier is how an RPC becomes an injection point.

create or replace function public.swap_display_order(
  p_table text,
  p_a uuid,
  p_b uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_changed integer;
begin
  if p_table not in (
    'services', 'sectors', 'engagements', 'team_members',
    'partners', 'social_links', 'projects'
  ) then
    raise exception 'not an orderable table: %', p_table
      using errcode = 'invalid_parameter_value';
  end if;

  execute format(
    'update %I as t set display_order = other.display_order
       from %I as other
      where (t.id = $1 and other.id = $2)
         or (t.id = $2 and other.id = $1)',
    p_table, p_table
  ) using p_a, p_b;

  get diagnostics v_changed = row_count;
  return v_changed;
end $$;

grant execute on function public.swap_display_order(text, uuid, uuid) to authenticated;

-- ── 3c. Saving every setting, or none ──────────────────────────────────────

create or replace function public.save_settings(p_settings jsonb, p_actor uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_written integer;
begin
  insert into site_settings (key, value, updated_by, updated_at)
  select key, value #>> '{}', p_actor, now()
    from jsonb_each(p_settings)
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  get diagnostics v_written = row_count;

  if v_written = 0 then
    raise exception 'no settings written'
      using errcode = 'insufficient_privilege';
  end if;

  return v_written;
end $$;

grant execute on function public.save_settings(jsonb, uuid) to authenticated;

-- ── 4. Where booking notifications are addressed ───────────────────────────
--
-- `booking_email` has been an admin field that nothing read: delivery used the
-- BOOKING_TO_EMAIL environment variable and ignored the setting entirely. The
-- application now prefers the setting and falls back to the variable, so the
-- field means what it says. Seeded here for installs that predate it.

insert into site_settings (key, value)
values ('booking_email', null)
on conflict (key) do nothing;
