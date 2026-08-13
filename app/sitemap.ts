import type { MetadataRoute } from "next";
import { PROJECTS } from "@/lib/projects";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const ROUTES = ["/", "/work", "/services", "/studio", "/clients", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    ...ROUTES.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified,
    })),
    ...PROJECTS.map((project) => ({
      url: `${baseUrl}/work/${project.slug}`,
      lastModified,
    })),
  ];
}
