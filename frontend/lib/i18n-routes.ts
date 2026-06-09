import type { Language } from "@/i18n";
import {
  isValidLocale,
  legacySegments,
  localeRouteMap,
  localizedSegments,
  supportedLocales,
  type PublicRouteKind,
} from "@/lib/locales";

export type { PublicRouteKind } from "@/lib/locales";

export const publicLocales = supportedLocales;

export { localizedSegments };

export type PublicRouteDescriptor = {
  locale?: Language;
  kind: PublicRouteKind;
  identifier?: string;
};

export function isPublicLocale(value?: string | null): value is Language {
  return isValidLocale(value);
}

export function localeFromPathname(pathname?: string | null) {
  const [firstPart] = String(pathname || "")
    .split("/")
    .filter(Boolean);

  return isValidLocale(firstPart) ? firstPart : null;
}

export function publicRouteFromPathname(
  pathname?: string | null
): PublicRouteDescriptor | null {
  const parts = String(pathname || "")
    .split("/")
    .filter(Boolean);
  const locale = isValidLocale(parts[0]) ? parts[0] : undefined;
  const routeIndex = locale ? 1 : 0;
  const segment = parts[routeIndex];
  const identifier = parts[routeIndex + 1];

  if (parts.length === 0 || (locale && parts.length === 1)) {
    return { locale, kind: "home" };
  }

  const kind = legacySegments[segment || ""];

  if (!kind) return null;

  return { locale, kind, identifier };
}

export function localizedRoutePath(
  kind: PublicRouteKind,
  locale: Language,
  identifier?: string | number | null
) {
  if (kind === "home") {
    return `/${locale}`;
  }

  const segment = localeRouteMap(locale)[kind];
  const cleanIdentifier = String(identifier || "").trim();

  return cleanIdentifier
    ? `/${locale}/${segment}/${cleanIdentifier}`
    : `/${locale}/${segment}`;
}

export function localizedPathForCurrentRoute(
  pathname: string | null,
  locale: Language,
  search = "",
  hash = ""
) {
  const route = publicRouteFromPathname(pathname);
  const suffix = `${search || ""}${hash || ""}`;

  if (!route) return `${localizedRoutePath("home", locale)}${suffix}`;

  return `${localizedRoutePath(route.kind, locale, route.identifier)}${suffix}`;
}

export function localizedSectionKind(
  locale: Language,
  section?: string | null
) {
  if (!section) return null;

  const expected = localeRouteMap(locale);
  const match = Object.entries(expected).find(([, value]) => value === section);

  return match?.[0] as Exclude<PublicRouteKind, "home"> | undefined;
}
