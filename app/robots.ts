import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * The admin is disallowed here and absent from the sitemap.
 *
 * Neither is a security control — a crawler that ignores this file reaches the
 * same URL, and the pages themselves refuse without a session. What it does is
 * keep a studio sign-in form out of search results, where its only function
 * would be to advertise itself to people looking for one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
