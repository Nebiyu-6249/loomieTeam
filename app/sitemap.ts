import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/content";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Public routes only.
 *
 * /admin is deliberately absent, and robots.ts disallows it: an admin sign-in
 * page listed in a sitemap is an invitation to try it.
 */
const ROUTES = ["/", "/work", "/services", "/about", "/clients", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const projects = await getProjects();

  return [
    ...ROUTES.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified,
    })),
    ...projects.map((project) => ({
      url: `${baseUrl}/work/${project.slug}`,
      lastModified,
    })),
  ];
}
