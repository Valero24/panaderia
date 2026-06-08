import type { Metadata } from "next";

import type { Language } from "@/i18n";
import {
  getDynamicText,
  getDynamicValue,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import {
  localizedRoutePath,
  publicLocales,
  type PublicRouteKind,
} from "@/lib/i18n-routes";
import {
  absoluteTitle,
  canonicalUrl,
  metaDescription,
  pageTitle,
  socialMetadata,
} from "@/lib/seo";

type EntitySeoOptions = {
  kind: PublicRouteKind;
  entity: TranslatableEntity & {
    id?: string | number | null;
    slug?: string | null;
    title?: string | null;
    name?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    shortDescription?: string | null;
    excerpt?: string | null;
    description?: string | null;
    content?: string | null;
    coverImage?: string | null;
    heroImage?: string | null;
    mainImage?: string | null;
    images?: { url?: string | null; isPrimary?: boolean | null }[] | null;
  };
  locale: Language;
  fallbackTitle: string;
  fallbackDescription: string;
  image?: string | null;
  type?: "article" | "website";
};

function translatedIdentifier(
  entity: TranslatableEntity & { id?: string | number | null; slug?: string | null },
  _locale: Language
) {
  // Use the base slug until the backend can resolve translated slugs reliably.
  // This avoids emitting hreflang URLs that may not exist.
  return entity.slug || entity.id || "";
}

export function localizedAlternates(
  kind: PublicRouteKind,
  entity?: (TranslatableEntity & { id?: string | number | null; slug?: string | null }) | null
) {
  const languages = Object.fromEntries(
    publicLocales.map((locale) => [
      locale,
      canonicalUrl(
        localizedRoutePath(
          kind,
          locale,
          entity ? translatedIdentifier(entity, locale) : undefined
        )
      ),
    ])
  );

  return {
    canonicalFor(locale: Language) {
      return languages[locale];
    },
    languages: {
      ...languages,
      "x-default": languages.en || languages.es,
    },
  };
}

export function localizedEntityText(
  entity: TranslatableEntity,
  field: string,
  locale: Language,
  fallback?: unknown
) {
  return getDynamicText(entity, field, locale, fallback);
}

export function localizedEntityValue(
  entity: TranslatableEntity,
  field: string,
  locale: Language,
  fallback?: unknown
) {
  return getDynamicValue(entity, field, locale, fallback);
}

export function localizedEntityForSeo<T extends TranslatableEntity>(
  entity: T,
  locale: Language,
  kind?: PublicRouteKind
): T & { url?: string } {
  const localized = { ...entity } as T & { url?: string };
  const textFields = [
    "title",
    "name",
    "seoTitle",
    "seoDescription",
    "shortDescription",
    "excerpt",
    "description",
    "content",
    "seoContent",
    "location",
    "city",
    "area",
    "itinerary",
    "includes",
    "notIncludes",
    "included",
    "notIncluded",
    "meetingPoint",
    "duration",
    "durationDescription",
    "schedule",
    "policies",
    "recommendations",
    "conditions",
    "category",
    "experienceCategory",
  ];

  textFields.forEach((field) => {
    const translated = localizedEntityText(entity, field, locale);
    if (translated) {
      (localized as Record<string, unknown>)[field] = translated;
    }
  });

  if (kind) {
    const identifier = translatedIdentifier(entity, locale);
    localized.url = localizedRoutePath(kind, locale, identifier);
  }

  return localized;
}

export function localizedEntityMetadata({
  kind,
  entity,
  locale,
  fallbackTitle,
  fallbackDescription,
  image,
  type = "website",
}: EntitySeoOptions): Metadata {
  const localized = localizedEntityForSeo(entity, locale, kind);
  const titleSource =
    localized.seoTitle || localized.title || localized.name || fallbackTitle;
  const descriptionSource =
    localized.seoDescription ||
    localized.shortDescription ||
    localized.excerpt ||
    localized.description ||
    localized.content ||
    "";
  const title = pageTitle(titleSource);
  const description = metaDescription(descriptionSource, fallbackDescription);
  const alternates = localizedAlternates(kind, entity);
  const url = alternates.canonicalFor(locale);
  const imageUrl =
    image ||
    localized.coverImage ||
    localized.heroImage ||
    localized.mainImage ||
    localized.images?.find((item) => item?.isPrimary)?.url ||
    localized.images?.[0]?.url;
  const social = socialMetadata({
    title: absoluteTitle(title),
    description,
    url,
    image: imageUrl || undefined,
    type,
  });

  return {
    title: { absolute: absoluteTitle(title) },
    description,
    alternates: {
      canonical: url,
      languages: alternates.languages,
    },
    openGraph: social.openGraph,
    twitter: social.twitter,
  };
}
