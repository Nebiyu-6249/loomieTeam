/**
 * The upload rules, in one place because three parties have to agree on them.
 *
 * The browser checks them so an impossible upload never starts, the Server
 * Action checks them again because a check that only runs in the browser is a
 * courtesy rather than a rule, and the `media` table's own CHECK constraint is
 * the one that actually holds. Keeping the list here means the three cannot
 * drift apart quietly.
 *
 * Deliberately not in the `"use server"` file: that module may only export
 * async functions, and the browser needs these values before it calls anything.
 */

export const BUCKET = "site";

/** Exactly what the media table's CHECK constraint allows. */
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export type AllowedType = (typeof ALLOWED_TYPES)[number];

/**
 * Eight megabytes, and this number is now honest.
 *
 * It used to be a claim the architecture could not keep: the file went through
 * a Server Action, so it met Next's 1MB body limit and Vercel's ~4.5MB function
 * limit long before it reached 8MB. The bytes now go browser → Storage
 * directly, where the only ceiling is the bucket's own file size limit — so the
 * number here is a studio decision about sensible originals rather than a
 * platform constraint dressed up as one.
 */
export const MAX_BYTES = 8 * 1024 * 1024;

/** Everything the uploader writes lives under this prefix. */
export const UPLOAD_PREFIX = "uploads/";

export const isAllowedType = (type: string): type is AllowedType =>
  (ALLOWED_TYPES as readonly string[]).includes(type);

export const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

/** The extensions, for the `accept` attribute and for error messages. */
export const typeNames = () => ALLOWED_TYPES.map((type) => type.replace("image/", "")).join(", ");
