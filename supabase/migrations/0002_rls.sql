-- ============================================================================
-- Loomie — row level security
--
-- The shape of it: the public may read published content and nothing else.
-- Administrators read and write through their own session, so the rules below
-- are what actually stands between a visitor and the studio's data — not a
-- check in a route handler that a different route might forget.
--
-- What the public cannot do, stated once because it is the point: write to any
-- content table, read a booking, read an enquiry, read the administrator list,
-- or read the audit log. Those are denied by having no policy that permits
-- them, which is how RLS denies — there is no rule to get wrong.
--
-- Bookings and enquiries are written by the server with the service key, from
-- one route each, after validation. That is a narrow, deliberate exception: the
-- alternative is an anon INSERT policy on a table the public must never read,
-- and a policy that permits writing without reading is easy to write and hard
-- to keep correct.
-- ============================================================================

-- ── Who is asking ──────────────────────────────────────────────────────────
--
-- SECURITY DEFINER, because a policy on admin_profiles that queries
-- admin_profiles recurses forever. These run as the owner, read one row, and
-- are the only thing the policies below need to know.

create or replace function public.current_admin_role()
returns admin_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from admin_profiles p
  where p.auth_user_id = auth.uid()
    and p.is_active
  limit 1
$$;

/** Any active administrator, whatever their role. Editors included. */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_role() is not null
$$;

/** Owners and admins. Editors change content, not who may change content. */
create or replace function public.can_administer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_role() in ('owner', 'admin')
$$;

revoke execute on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.can_administer() to anon, authenticated, service_role;

-- ── Enable everywhere ──────────────────────────────────────────────────────

alter table media enable row level security;
alter table admin_profiles enable row level security;
alter table projects enable row level security;
alter table project_disciplines enable row level security;
alter table project_sections enable row level security;
alter table project_media enable row level security;
alter table services enable row level security;
alter table team_members enable row level security;
alter table sectors enable row level security;
alter table engagements enable row level security;
alter table partners enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;
alter table bookings enable row level security;
alter table enquiries enable row level security;
alter table audit_log enable row level security;

-- ── Published content: readable by anyone ──────────────────────────────────

create policy projects_public_read on projects
  for select using (published);

create policy services_public_read on services
  for select using (published);

create policy team_public_read on team_members
  for select using (published);

create policy sectors_public_read on sectors
  for select using (published);

create policy engagements_public_read on engagements
  for select using (published);

create policy partners_public_read on partners
  for select using (published);

/** A link is public only when it is switched on and has somewhere to go. */
create policy social_public_read on social_links
  for select using (enabled and url is not null);

create policy settings_public_read on site_settings
  for select using (true);

-- Children follow their parent: visible exactly when the project is.

create policy project_disciplines_public_read on project_disciplines
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.published)
  );

create policy project_sections_public_read on project_sections
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.published)
  );

create policy project_media_public_read on project_media
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.published)
  );

/**
 * Media is readable when something published points at it.
 *
 * Not "all media is public": an image uploaded but not yet placed, or attached
 * only to a draft, stays unreadable until the thing that uses it is live.
 */
create policy media_public_read on media
  for select using (
    exists (
      select 1 from projects p
      where p.published and (p.cover_image_id = media.id or p.hero_image_id = media.id)
    )
    or exists (
      select 1 from project_media pm join projects p on p.id = pm.project_id
      where pm.media_id = media.id and p.published
    )
    or exists (
      select 1 from services s
      where s.published and (s.visual_media_id = media.id or s.hero_media_id = media.id)
    )
    or exists (select 1 from team_members t where t.published and t.photo_media_id = media.id)
    or exists (select 1 from sectors sc where sc.published and sc.visual_media_id = media.id)
    or exists (select 1 from partners pa where pa.published and pa.logo_media_id = media.id)
  );

-- ── Administrators: content ────────────────────────────────────────────────
--
-- One policy per table for all commands. Editors and admins both edit content;
-- the distinction between them is settings and administrators, below.

create policy projects_admin_all on projects
  for all using (public.is_admin()) with check (public.is_admin());

create policy project_disciplines_admin_all on project_disciplines
  for all using (public.is_admin()) with check (public.is_admin());

create policy project_sections_admin_all on project_sections
  for all using (public.is_admin()) with check (public.is_admin());

create policy project_media_admin_all on project_media
  for all using (public.is_admin()) with check (public.is_admin());

create policy services_admin_all on services
  for all using (public.is_admin()) with check (public.is_admin());

create policy team_admin_all on team_members
  for all using (public.is_admin()) with check (public.is_admin());

create policy sectors_admin_all on sectors
  for all using (public.is_admin()) with check (public.is_admin());

create policy engagements_admin_all on engagements
  for all using (public.is_admin()) with check (public.is_admin());

create policy partners_admin_all on partners
  for all using (public.is_admin()) with check (public.is_admin());

create policy media_admin_all on media
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Administrators: operations ─────────────────────────────────────────────

create policy bookings_admin_read on bookings
  for select using (public.is_admin());

create policy bookings_admin_write on bookings
  for update using (public.is_admin()) with check (public.is_admin());

create policy enquiries_admin_read on enquiries
  for select using (public.is_admin());

create policy enquiries_admin_write on enquiries
  for update using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_read on audit_log
  for select using (public.is_admin());

-- ── Owners and admins only ─────────────────────────────────────────────────

create policy social_admin_all on social_links
  for all using (public.can_administer()) with check (public.can_administer());

create policy settings_admin_write on site_settings
  for all using (public.can_administer()) with check (public.can_administer());

/**
 * An administrator may always read their own row — the app needs it on every
 * request to know who is signed in — and owners and admins manage the list.
 */
create policy admin_profiles_self_read on admin_profiles
  for select using (auth_user_id = auth.uid() or public.can_administer());

create policy admin_profiles_manage on admin_profiles
  for all using (public.can_administer()) with check (public.can_administer());

-- ── Grants ─────────────────────────────────────────────────────────────────
--
-- RLS filters rows; grants decide whether the command is available at all.
-- The public role gets SELECT and nothing else, so a missing policy can never
-- become a write.

grant usage on schema public to anon, authenticated;

grant select on
  projects, project_disciplines, project_sections, project_media,
  services, team_members, sectors, engagements, partners,
  social_links, site_settings, media
to anon, authenticated;

grant select, insert, update, delete on
  projects, project_disciplines, project_sections, project_media,
  services, team_members, sectors, engagements, partners,
  social_links, site_settings, media, admin_profiles
to authenticated;

grant select, update on bookings, enquiries to authenticated;
grant select, insert on audit_log to authenticated;

/**
 * The server's own role, which bypasses RLS.
 *
 * Supabase grants this already; restating it means the local shim behaves the
 * same way, so a constraint test cannot pass because a grant was missing
 * rather than because the constraint held.
 */
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
