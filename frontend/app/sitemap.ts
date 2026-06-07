import type { MetadataRoute } from "next";

import { apiUrl } from "@/lib/api";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

type PublicProduct = {
  id?: number | string | null;
  slug?: string | null;
  active?: boolean | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type DynamicRouteConfig = {
  endpoint: string;
  segment: "alojamientos" | "experiencias" | "paquetes";
  priority: number;
};

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/alojamientos", changeFrequency: "daily", priority: 0.9 },
  { path: "/experiencias", changeFrequency: "daily", priority: 0.9 },
  { path: "/paquetes", changeFrequency: "daily", priority: 0.9 },
  { path: "/nosotros", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.6 },
] satisfies {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[];

const dynamicRoutes: DynamicRouteConfig[] = [
  { endpoint: "/properties", segment: "alojamientos", priority: 0.8 },
  { endpoint: "/experiences", segment: "experiencias", priority: 0.8 },
  { endpoint: "/packages", segment: "paquetes", priority: 0.8 },
];

function publicUrl(path: string) {
  return path ? `${siteUrl}${path}` : `${siteUrl}/`;
}

function productPath(segment: DynamicRouteConfig["segment"], item: PublicProduct) {
  const identifier = item.slug?.trim() || item.id;

  return identifier ? `/${segment}/${identifier}` : null;
}

function isPublicProduct(item: PublicProduct, segment: DynamicRouteConfig["segment"]) {
  if (!item?.id && !item?.slug) return false;

  if (segment === "alojamientos") {
    return !item.status || item.status === "ACTIVE" || item.status === "FEATURED";
  }

  return item.active !== false;
}

function routeDate(item: PublicProduct, fallback: Date) {
  const value = item.updatedAt || item.createdAt;
  const date = value ? new Date(value) : fallback;

  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function fetchPublicProducts(endpoint: string) {
  try {
    const response = await fetch(apiUrl(endpoint), {
      next: { revalidate },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return Array.isArray(data) ? (data as PublicProduct[]) : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = staticRoutes.map((route) => ({
    url: publicUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productGroups = await Promise.all(
    dynamicRoutes.map(async (route) => {
      const products = await fetchPublicProducts(route.endpoint);

      const entries: SitemapEntry[] = [];

      products
        .filter((item) => isPublicProduct(item, route.segment))
        .forEach((item) => {
          const path = productPath(route.segment, item);

          if (!path) return;

          entries.push({
            url: publicUrl(path),
            lastModified: routeDate(item, now),
            changeFrequency: "weekly" as const,
            priority: route.priority,
          });
        });

      return entries;
    })
  );

  return [...staticEntries, ...productGroups.flat()];
}
