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

export interface MediaRow {
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

export interface AdminProfileRow {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
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

export interface ProjectDisciplineRow {
  project_id: string;
  discipline: string;
  display_order: number;
}

export interface ProjectSectionRow {
  id: string;
  project_id: string;
  kind: ProjectSectionKind;
  heading: string | null;
  body: string;
  display_order: number;
}

export interface ProjectMediaRow {
  id: string;
  project_id: string;
  media_id: string;
  role: ProjectMediaRole;
  alt: string;
  caption: string | null;
  display_order: number;
}

export interface ServiceRow {
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

export interface TeamMemberRow {
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

export interface SectorRow {
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

export interface EngagementRow {
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

export interface PartnerRow {
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

export interface SocialLinkRow {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string | null;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingRow {
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface BookingRow {
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

export interface EnquiryRow {
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

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Insert and update shapes: the row minus what the database fills in. */
type Generated = "id" | "created_at" | "updated_at";
type Insert<T, K extends keyof T = never> = Omit<T, Extract<keyof T, Generated> | K> &
  Partial<Pick<T, Extract<keyof T, Generated>>>;

interface Table<Row, Ins = Insert<Row>> {
  Row: Row;
  Insert: Ins;
  Update: Partial<Ins>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      media: Table<MediaRow>;
      admin_profiles: Table<AdminProfileRow>;
      projects: Table<ProjectRow>;
      project_disciplines: Table<ProjectDisciplineRow, ProjectDisciplineRow>;
      project_sections: Table<ProjectSectionRow>;
      project_media: Table<ProjectMediaRow>;
      services: Table<ServiceRow>;
      team_members: Table<TeamMemberRow>;
      sectors: Table<SectorRow>;
      engagements: Table<EngagementRow>;
      partners: Table<PartnerRow>;
      social_links: Table<SocialLinkRow>;
      site_settings: Table<SiteSettingRow, SiteSettingRow>;
      bookings: Table<BookingRow>;
      enquiries: Table<EnquiryRow>;
      audit_log: Table<AuditLogRow>;
    };
    Views: Record<string, never>;
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
    CompositeTypes: Record<string, never>;
  };
}
