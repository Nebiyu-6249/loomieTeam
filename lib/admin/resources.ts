import { z } from "zod";

/**
 * What the admin can edit, described once.
 *
 * Eleven content types with the same needs — list, create, edit, reorder,
 * publish, delete — is eleven chances to write the same screen slightly
 * differently. So each type is described here instead: its table, what its rows
 * are called, which fields it has and how each one is validated. The routes
 * under /admin/[resource] read this and build the screen.
 *
 * Two things stay out of it. Projects have nested sections, disciplines and a
 * gallery, and media is an upload rather than a form, so both have their own
 * screens. A framework that stretched to cover them would be harder to read
 * than the two files it replaced.
 *
 * Validation lives here as Zod schemas rather than as HTML attributes, because
 * `required` in a form is a hint to a browser and a schema on the server is the
 * rule. The form uses both — the attributes for the immediate feedback, the
 * schema for whether anything is written.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "slug"
  | "number"
  | "boolean"
  | "select"
  | "media"
  | "url"
  | "email";

export interface Field {
  name: string;
  label: string;
  kind: FieldKind;
  /** One line under the input. Say what it is for, not what it is. */
  help?: string;
  required?: boolean;
  /** For select. */
  options?: { value: string; label: string }[];
  /** For textarea. */
  rows?: number;
  max?: number;
  /** Shown in the list view as a column. */
  column?: boolean;
}

export interface Resource {
  /** URL segment, and the key everything else looks up by. */
  key: string;
  table: string;
  /** "Service" / "Services", for headings and buttons. */
  one: string;
  many: string;
  description: string;
  fields: Field[];
  /** Owners and admins only. */
  restricted?: boolean;
  /** False for tables whose rows are created by visitors, not by staff. */
  creatable?: boolean;
  deletable?: boolean;
  /** Has a display_order column that drag-free up/down buttons move. */
  orderable?: boolean;
  /** Has a published flag. */
  publishable?: boolean;
  /** Public paths to revalidate after a write. */
  revalidates: string[];
  /**
   * True when this resource appears on every page rather than on the pages it
   * names. Social links are in the footer, and the footer is everywhere.
   */
  siteWide?: boolean;
  /** Built from `fields`; see `schemaFor`. */
  schema: z.ZodTypeAny;
}

/* ── Field builders ──────────────────────────────────────────────────────── */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugField = (help: string): Field => ({
  name: "slug",
  label: "Slug",
  kind: "slug",
  help,
  required: true,
  max: 80,
});

const orderField: Field = {
  name: "display_order",
  label: "Order",
  kind: "number",
  help: "Lower numbers come first. Use the arrows in the list instead of editing this by hand.",
};

const publishedField: Field = {
  name: "published",
  label: "Published",
  kind: "boolean",
  help: "Unpublished rows stay here and disappear from the site.",
  column: true,
};

/** A Zod shape from the field list, so the two cannot drift. */
export function schemaFor(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    switch (field.kind) {
      case "boolean":
        // A checkbox sends "on" or nothing at all.
        shape[field.name] = z
          .union([z.literal("on"), z.literal("true"), z.literal("")])
          .optional()
          .transform((value) => value === "on" || value === "true");
        break;

      case "number":
        shape[field.name] = z
          .string()
          .optional()
          .transform((value) => (value === undefined || value === "" ? 0 : Number(value)))
          .pipe(z.number().int().min(-9999).max(9999));
        break;

      case "slug":
        shape[field.name] = z
          .string()
          .trim()
          .min(1, "A slug is required.")
          .max(field.max ?? 80)
          .regex(SLUG, "Lower case letters, numbers and single hyphens only.");
        break;

      case "media":
        // An empty select means "none", which is a null column rather than "".
        shape[field.name] = z
          .string()
          .optional()
          .transform((value) => (value ? value : null))
          .pipe(z.string().uuid().nullable());
        break;

      case "url":
        shape[field.name] = z
          .string()
          .trim()
          .optional()
          .transform((value) => (value ? value : null))
          .pipe(z.string().url("Enter a full address, including https://").nullable());
        break;

      case "email":
        shape[field.name] = z
          .string()
          .trim()
          .optional()
          .transform((value) => (value ? value : null))
          .pipe(z.string().email("Enter a valid email address.").nullable());
        break;

      default: {
        let base = z.string().trim().max(field.max ?? 4000);
        if (field.required) base = base.min(1, `${field.label} is required.`);
        shape[field.name] = base;
      }
    }
  }

  return z.object(shape);
}

function resource(
  definition: Omit<Resource, "schema"> & { schema?: z.ZodTypeAny }
): Resource {
  return { schema: schemaFor(definition.fields), ...definition } as Resource;
}

/* ── The resources ───────────────────────────────────────────────────────── */

export const RESOURCES: Resource[] = [
  resource({
    key: "services",
    table: "services",
    one: "Service",
    many: "Services",
    description:
      "The four things the studio sells. These drive the hero's index, the services chapter and the options in both contact forms.",
    creatable: true,
    deletable: true,
    orderable: true,
    publishable: true,
    revalidates: ["/", "/services", "/contact"],
    fields: [
      { name: "number", label: "Number", kind: "text", max: 4, required: true, column: true, help: "Two digits, as it appears beside the title." },
      { name: "title", label: "Title", kind: "text", max: 80, required: true, column: true },
      slugField("Used by the booking and enquiry forms. Changing it does not break anything, but old form submissions in flight will be refused."),
      { name: "short_description", label: "Summary", kind: "textarea", rows: 2, max: 300, help: "One sentence. If it needs two, the visual is not doing enough." },
      { name: "visual_media_id", label: "Section image", kind: "media", help: "Shown in the services chapter while this service is the current one." },
      { name: "hero_media_id", label: "Hero image", kind: "media", help: "Shown beside the homepage headline while this service is pointed at." },
      { name: "hero_label", label: "Hero label", kind: "text", max: 80, help: "Three terms above the hero image, widest first." },
      { name: "hero_description", label: "Hero note", kind: "text", max: 160, help: "One short line, shown only while this service is active." },
      orderField,
      publishedField,
    ],
  }),

  resource({
    key: "sectors",
    table: "sectors",
    one: "Sector",
    many: "Sectors",
    description: "Who the studio is set up for, on the Who we work with page.",
    creatable: true,
    deletable: true,
    orderable: true,
    publishable: true,
    revalidates: ["/clients"],
    fields: [
      { name: "number", label: "Number", kind: "text", max: 4, required: true, column: true },
      { name: "name", label: "Name", kind: "text", max: 80, required: true, column: true },
      slugField("Not shown anywhere; it identifies the row."),
      { name: "summary", label: "Summary", kind: "textarea", rows: 2, max: 300, help: "What this sector usually arrives with." },
      { name: "problem", label: "The problem", kind: "textarea", rows: 2, max: 300, help: "The one set apart on the page. Say the difficulty, not the solution." },
      { name: "visual_media_id", label: "Image", kind: "media" },
      orderField,
      publishedField,
    ],
  }),

  resource({
    key: "engagements",
    table: "engagements",
    one: "Engagement",
    many: "Engagements",
    description: "The shapes a project takes, set as a comparison band.",
    creatable: true,
    deletable: true,
    orderable: true,
    publishable: true,
    revalidates: ["/clients"],
    fields: [
      { name: "number", label: "Number", kind: "text", max: 4, required: true, column: true },
      { name: "title", label: "Title", kind: "text", max: 80, required: true, column: true },
      { name: "duration", label: "Duration", kind: "text", max: 40, column: true, help: "As it should read: “4–6 weeks”, “Monthly”." },
      { name: "description", label: "Description", kind: "textarea", rows: 3, max: 400 },
      orderField,
      publishedField,
    ],
  }),

  resource({
    key: "team",
    table: "team_members",
    one: "Team member",
    many: "Team",
    description:
      "The people on the About page. Bios and photographs are optional and empty by default — the layout is built to be right without them.",
    creatable: true,
    deletable: true,
    orderable: true,
    publishable: true,
    revalidates: ["/about"],
    fields: [
      { name: "name", label: "Name", kind: "text", max: 80, required: true, column: true },
      { name: "role", label: "Role", kind: "text", max: 120, column: true },
      slugField("Not shown anywhere; it identifies the row."),
      { name: "photo_media_id", label: "Photograph", kind: "media", help: "Optional. Leave empty rather than using a stand-in — the layout expects it." },
      { name: "short_bio", label: "Short bio", kind: "textarea", rows: 3, max: 400, help: "One or two sentences, shown under the role. Write your own; nobody should write it for you." },
      { name: "long_bio", label: "Long bio", kind: "textarea", rows: 6, max: 2000, help: "Not shown anywhere yet. Kept for when there is a page for it." },
      { name: "linkedin_url", label: "LinkedIn", kind: "url" },
      { name: "instagram_url", label: "Instagram", kind: "url" },
      { name: "twitter_url", label: "Twitter", kind: "url" },
      { name: "email", label: "Email", kind: "email", help: "Not published. For the studio's own records." },
      orderField,
      publishedField,
    ],
  }),

  resource({
    key: "partners",
    table: "partners",
    one: "Partner",
    many: "Partners",
    description:
      "The belt at the foot of the homepage. A partner with no logo gets a drawn mark rather than nothing.",
    creatable: true,
    deletable: true,
    orderable: true,
    publishable: true,
    revalidates: ["/", "/clients"],
    fields: [
      { name: "name", label: "Name", kind: "text", max: 80, required: true, column: true },
      { name: "logo_media_id", label: "Logo", kind: "media", help: "Upload only a logo you have permission to use." },
      { name: "url", label: "Website", kind: "url" },
      {
        name: "placeholder",
        label: "Placeholder",
        kind: "boolean",
        column: true,
        help: "Tick while this name is standing in for a real partner. Untick when it is one.",
      },
      orderField,
      publishedField,
    ],
  }),

  resource({
    key: "social",
    table: "social_links",
    one: "Social link",
    many: "Social links",
    description:
      "Where else the studio is. A link cannot be switched on without an address — the database refuses it — so nothing on the site ever points at a sign-in wall.",
    restricted: true,
    creatable: false,
    deletable: false,
    orderable: true,
    // The footer is on every page, so listing three of them was a bug that
    // looked like a choice: /work and /services kept the old links.
    revalidates: [],
    siteWide: true,
    fields: [
      { name: "label", label: "Label", kind: "text", max: 60, required: true, column: true, help: "What the link says. “LinkedIn”, or the handle." },
      { name: "url", label: "Address", kind: "url", help: "The full profile address. Required before the link can be enabled." },
      {
        name: "enabled",
        label: "Enabled",
        kind: "boolean",
        column: true,
        help: "Shows the link on the site. Cannot be ticked without an address.",
      },
      orderField,
    ],
  }),
];

export const RESOURCE_BY_KEY = new Map(RESOURCES.map((r) => [r.key, r]));

export function findResource(key: string) {
  return RESOURCE_BY_KEY.get(key);
}

/** The columns a list view shows, always with the row's first identifying field. */
export function listFields(resource: Resource) {
  return resource.fields.filter((field) => field.column);
}
