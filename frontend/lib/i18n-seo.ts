import type { Metadata } from "next";

import type { Language } from "@/i18n";
import {
  getLocalizedSlug,
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
  buildMetadata,
  canonicalUrl,
  metaDescription,
  pageTitle,
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
    images?: {
      url?: string | null;
      isPrimary?: boolean | null;
      active?: boolean | null;
    }[] | null;
  };
  locale: Language;
  fallbackTitle: string;
  fallbackDescription: string;
  image?: string | null;
  type?: "article" | "website";
};

type EntityWithFutureTranslatedSlugs = TranslatableEntity & {
  slug?: string | null;
  translatedSlugs?: Partial<Record<Language, string | null>> | null;
};

export function baseSlugForLocale(
  entity: EntityWithFutureTranslatedSlugs,
  locale: Language
) {
  // Only use translated product slugs when the backend explicitly provides
  // them. Otherwise the base slug is kept so hreflang points to real routes.
  return getLocalizedSlug(entity, locale, entity.slug);
}

function translatedIdentifier(
  entity: EntityWithFutureTranslatedSlugs,
  locale: Language
) {
  return baseSlugForLocale(entity, locale);
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
      "x-default": languages.es,
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
    "locationDescription",
    "nearbyAttractions",
    "guestRecommendations",
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
  const title = localized.seoTitle ? pageTitle(titleSource) : absoluteTitle(titleSource);
  const description = metaDescription(descriptionSource, fallbackDescription);
  const alternates = localizedAlternates(kind, entity);
  const url = alternates.canonicalFor(locale);
  const activeImages = (localized.images || []).filter(
    (item) => item?.active !== false && item?.url
  );
  const imageUrl =
    image ||
    localized.coverImage ||
    localized.heroImage ||
    localized.mainImage ||
    activeImages.find((item) => item?.isPrimary)?.url ||
    activeImages[0]?.url;
  return buildMetadata({
    title,
    url,
    description,
    image: imageUrl || undefined,
    locale,
    type,
    languages: alternates.languages,
  });
}
