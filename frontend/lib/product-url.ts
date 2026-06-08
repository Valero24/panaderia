import type { Language } from "@/i18n";
import { localizedRoutePath } from "@/lib/i18n-routes";

type ProductLike = {
  id: number | string;
  slug?: string | null;
};

type ProductKind = "property" | "experience" | "package";

function productIdentifier(item: ProductLike) {
  return item.slug?.trim() || String(item.id);
}

export function localizedProductPath(
  kind: ProductKind,
  item: ProductLike,
  locale: Language = "es"
) {
  return localizedRoutePath(kind, locale, productIdentifier(item));
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
