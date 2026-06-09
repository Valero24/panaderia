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

export const supportedLocales: Language[] = ["es", "en", "fr", "pt", "it"];

export const defaultLocale: Language = "es";

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

export const legacySegments: Record<string, Exclude<PublicRouteKind, "home">> = {
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

export function isValidLocale(value?: string | null): value is Language {
  return supportedLocales.includes(value as Language);
}

export function getDefaultLocale() {
  return defaultLocale;
}

export function localeRouteMap(locale: Language = defaultLocale) {
  return localizedSegments[locale];
}
