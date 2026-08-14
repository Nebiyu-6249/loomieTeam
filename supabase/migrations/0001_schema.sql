-- ============================================================================
-- Loomie — structure
--
-- Everything the studio can edit, plus the two things visitors write to
-- (bookings and enquiries) and the record of who changed what.
--
-- Written to run on Supabase, which is Postgres with an `auth` schema and the
-- roles `anon`, `authenticated` and `service_role` already present. The same
-- files run against a plain Postgres for testing via supabase/local-shim.sql,
-- which creates those roles and a stand-in for auth.uid() and nothing else —
-- so the policies being tested are the policies that ship.
--
-- Two rules held throughout.
--
-- Media is referenced with ON DELETE RESTRICT everywhere. A picture that is
-- still on a project page cannot be deleted out from under it; the admin has
-- to detach it first, and the database says so rather than leaving a hole.
--
-- Nothing is published by default. `published` is false on every content table
-- until somebody sets it, so a half-written project is never one deploy away
-- from being live.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Enumerations ───────────────────────────────────────────────────────────
--
-- Wrapped so the file can be applied twice. Postgres has no
-- `create type if not exists`, and a migration that fails on its second run is
-- a migration somebody will abandon halfway through and be stuck with.

do $$
begin
  create type admin_role as enum ('owner', 'admin', 'editor');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type project_status as enum ('placeholder', 'real', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type project_study_type as enum ('concept', 'client');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type project_section_kind as enum ('scenario', 'direction', 'demonstration');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type project_media_role as enum ('cover', 'hero', 'gallery', 'detail');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type booking_status as enum (
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type enquiry_status as enum (
    'new', 'in_progress', 'replied', 'closed', 'spam'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type social_platform as enum ('linkedin', 'instagram', 'twitter');
exception when duplicate_object then null;
end $$;

-- ── Shared triggers ────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/** Lower-case, hyphenated, no leading or trailing hyphen. */
create or replace function public.is_slug(value text)
returns boolean
language sql
immutable
as $$
  select value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
$$;

-- ── Media ──────────────────────────────────────────────────────────────────
--
-- One row per uploaded file. `path` is the object path inside `bucket`, and
-- the pair is unique so the same object cannot be registered twice.

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text,
  alt text not null default '',
  width integer,
  height integer,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  uploaded_by uuid,
  constraint media_bucket_path_unique unique (bucket, path),
  constraint media_size_positive check (size_bytes > 0),
  constraint media_mime_supported check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml')
  )
);

-- ── Administrators ─────────────────────────────────────────────────────────
--
-- One row per person who may sign in. There is no public sign-up: a row here
-- is what turns a Supabase auth user into somebody the admin will admit, and
-- `is_active` revokes access without deleting the history of what they did.

create table if not exists admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  name text not null,
  email text not null,
  role admin_role not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_name_present check (length(btrim(name)) > 0)
);

create unique index if not exists admin_profiles_email_unique on admin_profiles (lower(email));

drop trigger if exists admin_profiles_touch on admin_profiles;
create trigger admin_profiles_touch
  before update on admin_profiles
  for each row execute function public.touch_updated_at();

-- Added after admin_profiles exists, because media is created first and the
-- two reference each other. Guarded so the file can be applied twice.
do $$
begin
  alter table media
    add constraint media_uploaded_by_fk
    foreign key (uploaded_by) references admin_profiles (id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ── Projects ───────────────────────────────────────────────────────────────

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  index text not null,
  title text not null,
  status project_status not null default 'placeholder',
  study_type project_study_type not null default 'concept',
  sector text not null default '',
  year text not null default '',
  summary text not null default '',
  hero_image_id uuid references media (id) on delete restrict,
  cover_image_id uuid references media (id) on delete restrict,
  display_order integer not null default 0,
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_slug_shape check (public.is_slug(slug)),
  constraint projects_title_present check (length(btrim(title)) > 0)
);

create index if not exists projects_public_order on projects (display_order) where published;

drop trigger if exists projects_touch on projects;
create trigger projects_touch
  before update on projects
  for each row execute function public.touch_updated_at();

/** Normalised rather than an array, so a discipline can be queried and counted. */
create table if not exists project_disciplines (
  project_id uuid not null references projects (id) on delete cascade,
  discipline text not null,
  display_order integer not null default 0,
  primary key (project_id, discipline)
);

/**
 * Case-study prose, one row per part.
 *
 * Three named parts rather than a JSON blob: the admin edits three fields, the
 * page renders three fields, and adding a fourth is a migration rather than a
 * silent change in the shape of a column nothing validates.
 */
create table if not exists project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind project_section_kind not null,
  heading text,
  body text not null default '',
  display_order integer not null default 0,
  unique (project_id, kind)
);

create table if not exists project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  media_id uuid not null references media (id) on delete restrict,
  role project_media_role not null default 'gallery',
  alt text not null default '',
  caption text,
  display_order integer not null default 0
);

create index if not exists project_media_project on project_media (project_id, display_order);

-- ── Services ───────────────────────────────────────────────────────────────
--
-- The homepage hero reads hero_label, hero_description and hero_media from
-- here, which is what takes the hero's image mapping out of the component.

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  number text not null,
  title text not null,
  short_description text not null default '',
  hero_label text not null default '',
  hero_description text not null default '',
  visual_media_id uuid references media (id) on delete restrict,
  hero_media_id uuid references media (id) on delete restrict,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_slug_shape check (public.is_slug(slug)),
  constraint services_title_present check (length(btrim(title)) > 0)
);

drop trigger if exists services_touch on services;
create trigger services_touch
  before update on services
  for each row execute function public.touch_updated_at();

-- ── Team ───────────────────────────────────────────────────────────────────

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null default '',
  short_bio text not null default '',
  long_bio text not null default '',
  photo_media_id uuid references media (id) on delete restrict,
  linkedin_url text,
  instagram_url text,
  twitter_url text,
  email text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_slug_shape check (public.is_slug(slug)),
  constraint team_name_present check (length(btrim(name)) > 0),
  constraint team_linkedin_url check (linkedin_url is null or linkedin_url ~ '^https://'),
  constraint team_instagram_url check (instagram_url is null or instagram_url ~ '^https://'),
  constraint team_twitter_url check (twitter_url is null or twitter_url ~ '^https://')
);

drop trigger if exists team_touch on team_members;
create trigger team_touch
  before update on team_members
  for each row execute function public.touch_updated_at();

-- ── Who we work with ───────────────────────────────────────────────────────

create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  number text not null,
  name text not null,
  summary text not null default '',
  problem text not null default '',
  visual_media_id uuid references media (id) on delete restrict,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sectors_slug_shape check (public.is_slug(slug)),
  constraint sectors_name_present check (length(btrim(name)) > 0)
);

drop trigger if exists sectors_touch on sectors;
create trigger sectors_touch
  before update on sectors
  for each row execute function public.touch_updated_at();

create table if not exists engagements (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  title text not null,
  duration text not null default '',
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagements_title_present check (length(btrim(title)) > 0)
);

drop trigger if exists engagements_touch on engagements;
create trigger engagements_touch
  before update on engagements
  for each row execute function public.touch_updated_at();

-- ── Partners ───────────────────────────────────────────────────────────────
--
-- `placeholder` is the flag that keeps the marquee honest: a row marked true
-- is a name the studio invented to fill a row, and the site says so.

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_media_id uuid references media (id) on delete restrict,
  url text,
  display_order integer not null default 0,
  placeholder boolean not null default true,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_name_present check (length(btrim(name)) > 0),
  constraint partners_url_shape check (url is null or url ~ '^https://')
);

drop trigger if exists partners_touch on partners;
create trigger partners_touch
  before update on partners
  for each row execute function public.touch_updated_at();

-- ── Social links ───────────────────────────────────────────────────────────
--
-- One row per platform, and `enabled` is separate from `url` on purpose: an
-- account can exist and still be held back, and a row with no URL can never be
-- enabled, so the site cannot link somewhere that was never supplied.

create table if not exists social_links (
  id uuid primary key default gen_random_uuid(),
  platform social_platform not null unique,
  label text not null,
  url text,
  display_order integer not null default 0,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_url_shape check (url is null or url ~ '^https://'),
  constraint social_enabled_needs_url check (not enabled or url is not null)
);

drop trigger if exists social_touch on social_links;
create trigger social_touch
  before update on social_links
  for each row execute function public.touch_updated_at();

-- ── Site settings ──────────────────────────────────────────────────────────
--
-- Key/value, but the keys are constrained, so a typo cannot quietly create a
-- setting nothing reads. lib/settings.ts mirrors this list.

create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_profiles (id) on delete set null,
  constraint site_settings_known_key check (
    key in (
      'contact_email',
      'booking_email',
      'site_title',
      'site_description',
      'availability_text',
      'footer_statement'
    )
  )
);

drop trigger if exists site_settings_touch on site_settings;
create trigger site_settings_touch
  before update on site_settings
  for each row execute function public.touch_updated_at();

-- ── Bookings ───────────────────────────────────────────────────────────────

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  name text not null,
  email text not null,
  service_id uuid references services (id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  visitor_timezone text not null,
  note text,
  status booking_status not null default 'pending',
  studio_notified boolean not null default false,
  visitor_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_ends_after_start check (end_at > start_at),
  constraint bookings_name_present check (length(btrim(name)) > 0),
  constraint bookings_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$')
);

/**
 * One live booking per slot, enforced by the database.
 *
 * Partial, so a cancelled booking releases its time rather than blocking it
 * forever. This is the constraint the application used to approximate with a
 * SET NX in Redis and, before that, with a Map in one process: two requests
 * arriving in the same millisecond now cannot both win, because the second
 * insert fails.
 */
create unique index if not exists bookings_one_live_per_slot
  on bookings (start_at)
  where status <> 'cancelled';

create index if not exists bookings_upcoming on bookings (start_at desc);

drop trigger if exists bookings_touch on bookings;
create trigger bookings_touch
  before update on bookings
  for each row execute function public.touch_updated_at();

-- ── Enquiries ──────────────────────────────────────────────────────────────

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  service_id uuid references services (id) on delete set null,
  message text not null,
  status enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_name_present check (length(btrim(name)) > 0),
  constraint enquiries_message_present check (length(btrim(message)) > 0),
  constraint enquiries_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$')
);

create index if not exists enquiries_recent on enquiries (created_at desc);

drop trigger if exists enquiries_touch on enquiries;
create trigger enquiries_touch
  before update on enquiries
  for each row execute function public.touch_updated_at();

-- ── Audit ──────────────────────────────────────────────────────────────────

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references admin_profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_recent on audit_log (created_at desc);
