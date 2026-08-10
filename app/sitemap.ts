import type { MetadataRoute } from "next";
import { PROJECTS_DATA } from "./work/[slug]/page";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const ROUTES = ["/", "/work", "/services", "/studio", "/clients", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    ...ROUTES.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified,
    })),
    ...PROJECTS_DATA.map((project) => ({
      url: `${baseUrl}/work/${project.slug}`,
      lastModified,
    })),
  ];
}
