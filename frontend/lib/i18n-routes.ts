import type { Language } from "@/i18n";

export type PublicRouteKind =
  | "home"
  | "property"
  | "experience"
  | "package"
  | "destination"
  | "blog"
  | "about"
  | "contact";

export const publicLocales: Language[] = ["es", "en", "fr", "pt", "it"];

export const localizedSegments: Record<
  Language,
  Record<Exclude<PublicRouteKind, "home">, string>
> = {
  es: {
    property: "alojamientos",
    experience: "experiencias",
    package: "paquetes",
    destination: "destinos",
    blog: "blog",
    about: "nosotros",
    contact: "contacto",
  },
  en: {
    property: "stays",
    experience: "tours",
    package: "packages",
    destination: "destinations",
    blog: "blog",
    about: "about",
    contact: "contact",
  },
  fr: {
    property: "hebergements",
    experience: "experiences",
    package: "forfaits",
    destination: "destinations",
    blog: "blog",
    about: "a-propos",
    contact: "contact",
  },
  pt: {
    property: "acomodacoes",
    experience: "experiencias",
    package: "pacotes",
    destination: "destinos",
    blog: "blog",
    about: "sobre",
    contact: "contato",
  },
  it: {
    property: "alloggi",
    experience: "esperienze",
    package: "pacchetti",
    destination: "destinazioni",
    blog: "blog",
    about: "chi-siamo",
    contact: "contatto",
  },
};

const legacySegments: Record<string, Exclude<PublicRouteKind, "home">> = {
  alojamientos: "property",
  stays: "property",
  hebergements: "property",
  acomodacoes: "property",
  alloggi: "property",
  experiencias: "experience",
  experiences: "experience",
  tours: "experience",
  esperienze: "experience",
  paquetes: "package",
  packages: "package",
  forfaits: "package",
  pacotes: "package",
  pacchetti: "package",
  destinos: "destination",
  destinations: "destination",
  destinazioni: "destination",
  blog: "blog",
  nosotros: "about",
  about: "about",
  "a-propos": "about",
  sobre: "about",
  "chi-siamo": "about",
  contacto: "contact",
  contact: "contact",
  contato: "contact",
  contatto: "contact",
};

export type PublicRouteDescriptor = {
  locale?: Language;
  kind: PublicRouteKind;
  identifier?: string;
};

export function isPublicLocale(value?: string | null): value is Language {
  return publicLocales.includes(value as Language);
}

export function localeFromPathname(pathname?: string | null) {
  const [firstPart] = String(pathname || "")
    .split("/")
    .filter(Boolean);

  return isPublicLocale(firstPart) ? firstPart : null;
}

export function publicRouteFromPathname(
  pathname?: string | null
): PublicRouteDescriptor | null {
  const parts = String(pathname || "")
    .split("/")
    .filter(Boolean);
  const locale = isPublicLocale(parts[0]) ? parts[0] : undefined;
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

  const segment = localizedSegments[locale][kind];
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

  const expected = localizedSegments[locale];
  const match = Object.entries(expected).find(([, value]) => value === section);

  return match?.[0] as Exclude<PublicRouteKind, "home"> | undefined;
}
