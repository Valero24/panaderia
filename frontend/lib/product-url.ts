import type { Language } from "@/i18n";
import { getLocalizedSlug, type TranslatableEntity } from "@/lib/dynamic-translations";
import { localizedRoutePath } from "@/lib/i18n-routes";

type ProductLike = {
  id: number | string;
  slug?: string | null;
  translations?: unknown;
  translatedSlugs?: Partial<Record<Language, string | null>> | null;
};

type ProductKind = "property" | "experience" | "package";

function productIdentifier(item: ProductLike, locale: Language) {
  return getLocalizedSlug(item as TranslatableEntity, locale, item.slug);
}

export function localizedProductPath(
  kind: ProductKind,
  item: ProductLike,
  locale: Language = "es"
) {
  return localizedRoutePath(kind, locale, productIdentifier(item, locale));
}

export function propertyPublicPath(item: ProductLike, locale: Language = "es") {
  return localizedProductPath("property", item, locale);
}

export function experiencePublicPath(
  item: ProductLike,
  locale: Language = "es"
) {
  return localizedProductPath("experience", item, locale);
}

export function packagePublicPath(item: ProductLike, locale: Language = "es") {
  return localizedProductPath("package", item, locale);
}
