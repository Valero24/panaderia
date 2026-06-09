import type { MetadataRoute } from "next";

import { apiUrl } from "@/lib/api";
import type { DynamicTranslations } from "@/lib/dynamic-translations";
import { baseSlugForLocale } from "@/lib/i18n-seo";
import {
  localizedRoutePath,
  publicLocales,
  type PublicRouteKind,
} from "@/lib/i18n-routes";
import { canonicalUrl } from "@/lib/seo";

export const revalidate = 3600;

type PublicProduct = {
  id?: number | string | null;
  slug?: string | null;
  translatedSlugs?: Record<string, string | null> | null;
  translations?: DynamicTranslations | null;
  active?: boolean | null;
  isActive?: boolean | null;
  isPublished?: boolean | null;
  status?: string | null;
  deletedAt?: string | null;
  archivedAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type DynamicRouteConfig = {
  endpoint: string;
  kind: Exclude<PublicRouteKind, "home"> | "blog";
  canonicalSegment: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

type SitemapEntry = MetadataRoute.Sitemap[number];
const localizedSitemapEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_SITEMAP !== "false";

const staticRoutes = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/alojamientos", changeFrequency: "daily", priority: 0.9 },
  { path: "/experiencias", changeFrequency: "daily", priority: 0.9 },
  { path: "/paquetes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/destinos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog", changeFrequency: "monthly", priority: 0.7 },
  { path: "/nosotros", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.6 },
] satisfies {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[];

const dynamicRoutes: DynamicRouteConfig[] = [
  {
    endpoint: "/properties",
    kind: "property",
    canonicalSegment: "alojamientos",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    endpoint: "/experiences",
    kind: "experience",
    canonicalSegment: "experiencias",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    endpoint: "/packages",
    kind: "package",
    canonicalSegment: "paquetes",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    endpoint: "/destinations",
    kind: "destination",
    canonicalSegment: "destinos",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    endpoint: "/blog",
    kind: "blog",
    canonicalSegment: "blog",
    changeFrequency: "monthly",
    priority: 0.7,
  },
];

function publicUrl(path: string) {
  return canonicalUrl(path || "/");
}

function productPath(route: DynamicRouteConfig, item: PublicProduct) {
  const identifier = item.slug?.trim();

  if (!identifier) return null;

  const canonicalPath = `/${route.canonicalSegment}/${identifier}`;
  if (!localizedSitemapEnabled) return [canonicalPath];

  const localizedPaths =
    route.kind === "blog"
      ? publicLocales.map((locale) =>
          localizedRoutePath("blog", locale, baseSlugForLocale(item, locale))
        )
      : publicLocales.map((locale) =>
          localizedRoutePath(
            route.kind,
            locale,
            baseSlugForLocale(item, locale)
          )
        );

  return localizedPaths;
}

function isPublicProduct(item: PublicProduct, kind: DynamicRouteConfig["kind"]) {
  if (!item?.slug?.trim()) return false;
  if (item.deletedAt || item.archivedAt) return false;

  if (kind === "property") {
    return (
      item.active !== false &&
      item.isActive !== false &&
      (!item.status || item.status === "ACTIVE" || item.status === "FEATURED")
    );
  }

  if (kind === "experience" || kind === "package") {
    return item.active !== false;
  }

  if (kind === "destination") {
    return item.isActive !== false;
  }

  if (kind === "blog") {
    return item.isPublished === true || Boolean(item.publishedAt);
  }

  return false;
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

  const staticEntries = localizedSitemapEnabled
    ? []
    : staticRoutes.map((route) => ({
        url: publicUrl(route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      }));
  const localizedStaticEntries = localizedSitemapEnabled
    ? publicLocales.flatMap((locale) => [
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
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
        {
          url: publicUrl(localizedRoutePath("destination", locale)),
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.8,
        },
        {
          url: publicUrl(localizedRoutePath("blog", locale)),
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.7,
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
      ])
    : [];

  const productGroups = await Promise.all(
    dynamicRoutes.map(async (route) => {
      const products = await fetchPublicProducts(route.endpoint);

      const entries: SitemapEntry[] = [];

      products
        .filter((item) => isPublicProduct(item, route.kind))
        .forEach((item) => {
          const paths = productPath(route, item);

          if (!paths) return;

          paths.forEach((path) => {
            entries.push({
              url: publicUrl(path),
              lastModified: routeDate(item, now),
              changeFrequency: route.changeFrequency,
              priority: route.priority,
            });
          });
        });

      return entries;
    })
  );

  const entries = [...staticEntries, ...localizedStaticEntries, ...productGroups.flat()];
  const seen = new Set<string>();

  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;

    seen.add(entry.url);
    return true;
  });
}
