import type { MetadataRoute } from "next";

import { apiUrl } from "@/lib/api";
import {
  localizedRoutePath,
  publicLocales,
  type PublicRouteKind,
} from "@/lib/i18n-routes";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

type PublicProduct = {
  id?: number | string | null;
  slug?: string | null;
  active?: boolean | null;
  isActive?: boolean | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type DynamicRouteConfig = {
  endpoint: string;
  kind: Exclude<PublicRouteKind, "home"> | "blog";
  priority: number;
};

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.75 },
  { path: "/nosotros", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.6 },
] satisfies {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[];

const dynamicRoutes: DynamicRouteConfig[] = [
  { endpoint: "/properties", kind: "property", priority: 0.8 },
  { endpoint: "/experiences", kind: "experience", priority: 0.8 },
  { endpoint: "/packages", kind: "package", priority: 0.8 },
  { endpoint: "/destinations", kind: "destination", priority: 0.75 },
  { endpoint: "/blog", kind: "blog", priority: 0.7 },
];

function publicUrl(path: string) {
  return path ? `${siteUrl}${path}` : `${siteUrl}/`;
}

function productPath(kind: DynamicRouteConfig["kind"], item: PublicProduct) {
  const identifier = item.slug?.trim() || item.id;

  if (!identifier) return null;

  if (kind === "blog") {
    return publicLocales.map((locale) =>
      localizedRoutePath("blog", locale, identifier)
    );
  }

  return publicLocales.map((locale) =>
    localizedRoutePath(kind, locale, identifier)
  );
}

function isPublicProduct(item: PublicProduct, kind: DynamicRouteConfig["kind"]) {
  if (!item?.id && !item?.slug) return false;

  if (kind === "property") {
    return !item.status || item.status === "ACTIVE" || item.status === "FEATURED";
  }

  if (kind === "destination") {
    return item.isActive !== false;
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
      signal: AbortSignal.timeout(8000),
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
  const localizedStaticEntries = publicLocales.flatMap((locale) => [
    {
      url: publicUrl(localizedRoutePath("home", locale)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: publicUrl(localizedRoutePath("property", locale)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: publicUrl(localizedRoutePath("experience", locale)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: publicUrl(localizedRoutePath("package", locale)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: publicUrl(localizedRoutePath("destination", locale)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
    {
      url: publicUrl(localizedRoutePath("blog", locale)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    },
    {
      url: publicUrl(localizedRoutePath("about", locale)),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: publicUrl(localizedRoutePath("contact", locale)),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ]);

  const productGroups = await Promise.all(
    dynamicRoutes.map(async (route) => {
      const products = await fetchPublicProducts(route.endpoint);

      const entries: SitemapEntry[] = [];

      products
        .filter((item) => isPublicProduct(item, route.kind))
        .forEach((item) => {
          const paths = productPath(route.kind, item);

          if (!paths) return;

          paths.forEach((path) => {
            entries.push({
              url: publicUrl(path),
              lastModified: routeDate(item, now),
              changeFrequency: "weekly" as const,
              priority: route.priority,
            });
          });
        });

      return entries;
    })
  );

  return [...staticEntries, ...localizedStaticEntries, ...productGroups.flat()];
}
