/**
 * The database, in TypeScript.
 *
 * Written by hand against supabase/migrations rather than generated, because
 * generating requires a live project and this has to stay correct without one.
 * The RLS test suite runs the real schema, so a column that drifts from this
 * file will show up there as well as in the compiler.
 *
 * Regenerate properly once a project exists:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 */

/**
 * Row shapes are type aliases, not interfaces, and that is load-bearing.
 *
 * postgrest-js constrains every table to `Record<string, unknown>`. TypeScript
 * gives object type aliases an implicit index signature and interfaces none, so
 * an interface fails that constraint, the schema stops matching GenericSchema,
 * and every table silently resolves to `never` — which surfaces as "not
 * assignable to type never" on the first insert rather than anywhere near the
 * cause. Supabase's own generator emits aliases for the same reason.
 */

export type AdminRole = "owner" | "admin" | "editor";
export type ProjectStatus = "placeholder" | "real" | "archived";
export type ProjectStudyType = "concept" | "client";
export type ProjectSectionKind = "scenario" | "direction" | "demonstration";
export type ProjectMediaRole = "cover" | "hero" | "gallery" | "detail";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type EnquiryStatus = "new" | "in_progress" | "replied" | "closed" | "spam";
export type SocialPlatform = "linkedin" | "instagram" | "twitter";

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  public_url: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: string | null;
}

export type AdminProfileRow = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectRow = {
  id: string;
  slug: string;
  index: string;
  title: string;
  status: ProjectStatus;
  study_type: ProjectStudyType;
  sector: string;
  year: string;
  summary: string;
  hero_image_id: string | null;
  cover_image_id: string | null;
  display_order: number;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectDisciplineRow = {
  project_id: string;
  discipline: string;
  display_order: number;
}

export type ProjectSectionRow = {
  id: string;
  project_id: string;
  kind: ProjectSectionKind;
  heading: string | null;
  body: string;
  display_order: number;
}

export type ProjectMediaRow = {
  id: string;
  project_id: string;
  media_id: string;
  role: ProjectMediaRole;
  alt: string;
  caption: string | null;
  display_order: number;
}

export type ServiceRow = {
  id: string;
  slug: string;
  number: string;
  title: string;
  short_description: string;
  hero_label: string;
  hero_description: string;
  visual_media_id: string | null;
  hero_media_id: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamMemberRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  short_bio: string;
  long_bio: string;
  photo_media_id: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  email: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type SectorRow = {
  id: string;
  slug: string;
  number: string;
  name: string;
  summary: string;
  problem: string;
  visual_media_id: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type EngagementRow = {
  id: string;
  number: string;
  title: string;
  duration: string;
  description: string;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type PartnerRow = {
  id: string;
  name: string;
  logo_media_id: string | null;
  url: string | null;
  display_order: number;
  placeholder: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type SocialLinkRow = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string | null;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type SiteSettingRow = {
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type BookingRow = {
  id: string;
  booking_code: string;
  name: string;
  email: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  visitor_timezone: string;
  note: string | null;
  status: BookingStatus;
  studio_notified: boolean;
  visitor_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export type EnquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service_id: string | null;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/* ── Insert and update shapes ──────────────────────────────────────────────
 *
 * An insert is the row minus what the database supplies. Two kinds of that:
 * columns it generates (id and the timestamps) and columns it defaults. Both
 * end up optional; the distinction is only that the second list is per-table,
 * because it is a fact about the schema rather than a convention.
 *
 * Keeping these accurate is what makes `insert({...})` catch a genuinely
 * missing column instead of demanding twelve fields Postgres would have filled
 * in itself.
 */

type Generated = "id" | "created_at" | "updated_at";

type Insert<Row, Defaulted extends keyof Row = never> = Omit<
  Row,
  Extract<keyof Row, Generated> | Defaulted
> &
  Partial<Pick<Row, Extract<keyof Row, Generated> | Defaulted>>;

type Table<Row, Ins = Insert<Row>> = {
  Row: Row;
  Insert: Ins;
  Update: Partial<Ins>;
  Relationships: [];
};

/** Shorthand: a table whose insert may omit these defaulted columns. */
type WithDefaults<Row, Defaulted extends keyof Row> = Table<Row, Insert<Row, Defaulted>>;

export type Database = {
  public: {
    Tables: {
      media: WithDefaults<MediaRow, "alt" | "public_url" | "width" | "height" | "uploaded_by">;
      admin_profiles: WithDefaults<AdminProfileRow, "role" | "is_active">;
      projects: WithDefaults<
        ProjectRow,
        | "status"
        | "study_type"
        | "sector"
        | "year"
        | "summary"
        | "hero_image_id"
        | "cover_image_id"
        | "display_order"
        | "featured"
        | "published"
      >;
      project_disciplines: Table<
        ProjectDisciplineRow,
        Insert<ProjectDisciplineRow, "display_order">
      >;
      project_sections: WithDefaults<ProjectSectionRow, "heading" | "body" | "display_order">;
      project_media: WithDefaults<
        ProjectMediaRow,
        "role" | "alt" | "caption" | "display_order"
      >;
      services: WithDefaults<
        ServiceRow,
        | "short_description"
        | "hero_label"
        | "hero_description"
        | "visual_media_id"
        | "hero_media_id"
        | "display_order"
        | "published"
      >;
      team_members: WithDefaults<
        TeamMemberRow,
        | "role"
        | "short_bio"
        | "long_bio"
        | "photo_media_id"
        | "linkedin_url"
        | "instagram_url"
        | "twitter_url"
        | "email"
        | "display_order"
        | "published"
      >;
      sectors: WithDefaults<
        SectorRow,
        "summary" | "problem" | "visual_media_id" | "display_order" | "published"
      >;
      engagements: WithDefaults<
        EngagementRow,
        "duration" | "description" | "display_order" | "published"
      >;
      partners: WithDefaults<
        PartnerRow,
        "logo_media_id" | "url" | "display_order" | "placeholder" | "published"
      >;
      social_links: WithDefaults<SocialLinkRow, "label" | "url" | "display_order" | "enabled">;
      site_settings: Table<SiteSettingRow, Insert<SiteSettingRow, "value" | "updated_by">>;
      bookings: WithDefaults<
        BookingRow,
        "service_id" | "note" | "status" | "studio_notified" | "visitor_confirmed"
      >;
      enquiries: WithDefaults<EnquiryRow, "company" | "service_id" | "status">;
      audit_log: WithDefaults<AuditLogRow, "actor_id" | "entity_id" | "metadata">;
    };
    // `{ [_ in never]: never }` rather than `Record<string, never>`: the latter
    // claims every possible name exists as a view of type never, which makes
    // .from("bookings") resolve against a phantom view instead of the table and
    // types every insert as never. This is the shape Supabase's own generator
    // emits, for the same reason.
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_administer: { Args: Record<string, never>; Returns: boolean };
      current_admin_role: { Args: Record<string, never>; Returns: AdminRole | null };
    };
    Enums: {
      admin_role: AdminRole;
      project_status: ProjectStatus;
      project_study_type: ProjectStudyType;
      project_section_kind: ProjectSectionKind;
      project_media_role: ProjectMediaRole;
      booking_status: BookingStatus;
      enquiry_status: EnquiryStatus;
      social_platform: SocialPlatform;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
