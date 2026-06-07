type ProductLike = {
  id: number | string;
  slug?: string | null;
};

type PublicLocale = "es" | "en" | "fr" | "pt" | "it";
type ProductKind = "property" | "experience" | "package";

const localizedProductSegments: Record<PublicLocale, Record<ProductKind, string>> = {
  es: {
    property: "alojamientos",
    experience: "experiencias",
    package: "paquetes",
  },
  en: {
    property: "stays",
    experience: "experiences",
    package: "packages",
  },
  fr: {
    property: "hebergements",
    experience: "experiences",
    package: "forfaits",
  },
  pt: {
    property: "acomodacoes",
    experience: "experiencias",
    package: "pacotes",
  },
  it: {
    property: "alloggi",
    experience: "esperienze",
    package: "pacchetti",
  },
};

function productIdentifier(item: ProductLike) {
  return item.slug?.trim() || String(item.id);
}

export function localizedProductPath(
  kind: ProductKind,
  item: ProductLike,
  locale?: PublicLocale
) {
  const identifier = productIdentifier(item);

  if (!locale || locale === "es") {
    return `/${localizedProductSegments.es[kind]}/${identifier}`;
  }

  return `/${locale}/${localizedProductSegments[locale][kind]}/${identifier}`;
}

export function propertyPublicPath(item: ProductLike) {
  return localizedProductPath("property", item);
}

export function experiencePublicPath(item: ProductLike) {
  return localizedProductPath("experience", item);
}

export function packagePublicPath(item: ProductLike) {
  return localizedProductPath("package", item);
}
