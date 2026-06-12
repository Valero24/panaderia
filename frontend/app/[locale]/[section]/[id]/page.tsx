import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogPostPage from "@/app/blog/[slug]/page";
import PropertyDetailPage from "@/app/alojamientos/[id]/page";
import DestinationDetailPage from "@/app/destinos/[slug]/page";
import ExperienceDetailPage from "@/app/experiencias/[id]/page";
import PackageDetailPage from "@/app/paquetes/[id]/page";
import type { Language } from "@/i18n";
import { apiUrl } from "@/lib/api";
import {
  getLocalizedSlug,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import { localizedEntityMetadata } from "@/lib/i18n-seo";
import {
  isPublicLocale,
  localizedSectionKind,
  type PublicRouteKind,
} from "@/lib/i18n-routes";

export const revalidate = 600;

type PageProps = {
  params: Promise<{ locale: string; section: string; id: string }>;
};

type DetailKind = "property" | "experience" | "package" | "destination" | "blog";

async function resolveRoute(params: PageProps["params"]) {
  const { locale, section, id } = await params;

  if (!isPublicLocale(locale)) return null;

  const kind = localizedSectionKind(locale, section);

  if (
    !kind ||
    !id ||
    kind === "about" ||
    kind === "contact"
  ) {
    return null;
  }

  return { locale, kind, id };
}

const detailEndpoint: Record<DetailKind, string> = {
  property: "properties",
  experience: "experiences",
  package: "packages",
  destination: "destinations",
  blog: "blog",
};

const detailFallbacks: Record<
  DetailKind,
  { title: string; description: string; type?: "article" | "website" }
> = {
  property: {
    title: "Alojamiento premium",
    description:
      "Luxury accommodation in Cartagena with personalized assistance.",
  },
  experience: {
    title: "Experiencia premium",
    description:
      "Private experience in Cartagena with personalized service and premium assistance.",
  },
  package: {
    title: "Paquete premium",
    description:
      "Luxury travel package in Cartagena with accommodation, tours and premium experiences.",
  },
  destination: {
    title: "Destino turistico en Cartagena",
    description:
      "Curated tourist destination in Cartagena with luxury travel assistance.",
  },
  blog: {
    title: "Blog Cartagena Tailored Travel",
    description:
      "Travel guide and luxury tourism recommendations for Cartagena, Colombia.",
    type: "article",
  },
};

type DetailEntity = TranslatableEntity & {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
};

function asDetailList(data: unknown): DetailEntity[] {
  if (Array.isArray(data)) return data as DetailEntity[];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const candidates = [record.data, record.items, record.results];
    const list = candidates.find(Array.isArray);
    if (Array.isArray(list)) return list as DetailEntity[];
  }

  return [];
}

function identifierMatches(
  entity: DetailEntity,
  id: string,
  locale: Language
) {
  const cleanId = id.trim();
  const localizedSlug = getLocalizedSlug(entity, locale, entity.slug);
  const candidates = [entity.slug, localizedSlug, entity.id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return candidates.some((candidate) => candidate === cleanId);
}

async function fetchDetailCollection(kind: DetailKind) {
  try {
    const response = await fetch(apiUrl(`/${detailEndpoint[kind]}`), {
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    return asDetailList(await response.json());
  } catch {
    return [];
  }
}

async function fetchDetail(kind: DetailKind, id: string, locale: Language) {
  try {
    const response = await fetch(apiUrl(`/${detailEndpoint[kind]}/${id}`), {
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      return (await response.json()) as DetailEntity;
    }
  } catch {
    // Fallback below keeps translated slugs resolvable without backend
    // language-specific routes.
  }

  const collection = await fetchDetailCollection(kind);
  return collection.find((entity) => identifierMatches(entity, id, locale)) || null;
}

function baseIdentifier(entity: DetailEntity | null, fallback: string) {
  return String(entity?.slug || fallback).trim() || fallback;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolved = await resolveRoute(params);

  if (!resolved) {
    return { robots: { index: false, follow: false } };
  }

  const { locale, kind, id } = resolved;
  const entity = await fetchDetail(kind, id, locale);

  if (!entity) {
    return {
      title: detailFallbacks[kind].title,
      robots: { index: false, follow: false },
    };
  }

  return localizedEntityMetadata({
    kind,
    entity,
    locale,
    fallbackTitle: detailFallbacks[kind].title,
    fallbackDescription: detailFallbacks[kind].description,
    type: detailFallbacks[kind].type || "website",
  });
}

export default async function LocalizedDetailPage({ params }: PageProps) {
  const resolved = await resolveRoute(params);

  if (!resolved) {
    notFound();
  }

  const { locale, kind, id } = resolved;
  const entity = await fetchDetail(kind, id, locale);
  const resolvedId = baseIdentifier(entity, id);

  if (!entity) {
    notFound();
  }

  if (kind === "property") {
    return (
      <PropertyDetailPage
        params={Promise.resolve({ id: resolvedId })}
        locale={locale}
      />
    );
  }

  if (kind === "experience") {
    return (
      <ExperienceDetailPage
        params={Promise.resolve({ id: resolvedId })}
        locale={locale}
      />
    );
  }

  if (kind === "package") {
    return (
      <PackageDetailPage
        params={Promise.resolve({ id: resolvedId })}
        locale={locale}
      />
    );
  }

  if (kind === "blog") {
    return (
      <BlogPostPage
        params={Promise.resolve({ slug: resolvedId })}
        locale={locale}
      />
    );
  }

  return (
    <DestinationDetailPage
      params={Promise.resolve({ slug: resolvedId })}
      locale={locale}
    />
  );
}
