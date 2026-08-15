import { revalidatePath } from "next/cache";

/**
 * Which public paths a change actually reaches.
 *
 * Most content lives on one or two pages and revalidating those is right —
 * throwing away the whole cache because one sector changed is waste. But three
 * things appear on *every* page, and listing three of their seven routes is a
 * bug that looks like a config choice:
 *
 *   the navigation, which carries the contact address;
 *   the footer, which carries the address, the footer line and the social links;
 *   the metadata, which carries the site title and description.
 *
 * So a social link changing has to refresh /work and /services too, or the
 * footer on those pages keeps pointing at the old account until something else
 * happens to invalidate them.
 *
 * `/work/[slug]` is written as its route pattern with type "page", which
 * revalidates every case study at once. Enumerating the published slugs would
 * mean reading them here and would still miss one the moment a project is
 * added.
 */

/** Fixed public routes. */
export const PUBLIC_PATHS = [
  "/",
  "/work",
  "/services",
  "/about",
  "/clients",
  "/contact",
] as const;

/** Everything with a footer on it, which is everything. */
export function revalidateEveryPublicPath() {
  for (const path of PUBLIC_PATHS) revalidatePath(path);
  revalidatePath("/work/[slug]", "page");
}
