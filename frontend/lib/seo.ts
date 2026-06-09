import type { Metadata } from "next";

import { cleanPublicCopy } from "@/lib/public-copy";
import { defaultLocale, isValidLocale, supportedLocales } from "@/lib/locales";

const brand = "Cartagena Tailored Travel";
const fallbackSiteUrl = "https://panaderia-psi.vercel.app";
const maxSeoTitleLength = 70;
const maxMetaDescriptionLength = 160;

function normalizeSiteUrl(value?: string | null) {
  const cleanValue = value?.trim().replace(/\/+$/, "");

  if (!cleanValue) return fallbackSiteUrl;

  try {
    const url = new URL(cleanValue);
    const hostname = url.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local");

    if (isLocalhost) return fallbackSiteUrl;

    return url.origin;
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const defaultOgImage = {
  url: `${siteUrl}/og/cartagena-tailored-travel.jpg`,
  width: 1200,
  height: 630,
  alt: "Cartagena Tailored Travel luxury travel in Cartagena",
};

type SeoLocale = (typeof supportedLocales)[number];

type SeoCopy = {
  title?: string | null;
  description?: string | null;
};

type LocalizedSeoCopy = Partial<Record<SeoLocale, SeoCopy>>;

type SocialMetadataOptions = {
  title: string;
  description: string;
  url?: string;
  image?: string | typeof defaultOgImage;
  locale?: string;
  type?: "article" | "profile" | "website";
};

type BuildMetadataOptions = {
  title: string;
  description: string;
  path?: string | null;
  url?: string | null;
  image?: string | typeof defaultOgImage;
  locale?: string | null;
  type?: "article" | "profile" | "website";
  keywords?: string[] | string | null;
  languages?: Record<string, string> | null;
  robots?: Metadata["robots"];
  titleMode?: "absolute" | "template";
};

type SocialImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export function absoluteUrl(pathOrUrl?: string | null) {
  const value = String(pathOrUrl || "").trim();

  if (!value) return siteUrl;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export function normalizeCanonicalPath(pathOrUrl?: string | null) {
  const value = String(pathOrUrl || "").trim();

  if (!value) return "/";

  try {
    const url = /^https?:\/\//i.test(value)
      ? new URL(value)
      : value.startsWith("//")
        ? new URL(`https:${value}`)
        : new URL(value.startsWith("/") ? value : `/${value}`, siteUrl);
    const pathname = url.pathname
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");

    return pathname || "/";
  } catch {
    const [rawPath] = value.split(/[?#]/);
    const normalized = rawPath
      .replace(/\\/g, "/")
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");

    if (!normalized || normalized === ".") return "/";

    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }
}

export function canonicalUrl(pathOrUrl?: string | null) {
  const canonicalPath = normalizeCanonicalPath(pathOrUrl);

  try {
    const url = new URL(canonicalPath, siteUrl);
    url.search = "";
    url.hash = "";

    if (url.pathname === "/") {
      return url.toString();
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return siteUrl;
  }
}

export function buildHreflangAlternates(pathOrUrl?: string | null) {
  const canonical = canonicalUrl(pathOrUrl);

  return {
    canonical,
    languages: {
      "x-default": canonicalUrl("/"),
    },
  };
}

export function absoluteImageUrl(pathOrUrl?: string | null) {
  return absoluteUrl(pathOrUrl || defaultOgImage.url);
}

export function sanitizeSeoText(value?: string | null) {
  const raw = String(value || "");

  if (!raw || raw === "undefined" || raw === "null" || raw === "[object Object]") {
    return "";
  }

  return cleanPublicCopy(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateMetaDescription(value: string, maxLength = 160) {
  const cleanValue = sanitizeSeoText(value);

  if (cleanValue.length <= maxLength) return cleanValue;

  const truncated = cleanValue.slice(0, Math.max(0, maxLength - 3)).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  const readable =
    lastSpace > 90 ? truncated.slice(0, lastSpace).trim() : truncated;

  return `${readable}...`;
}

export function truncateSeoTitle(value: string, maxLength = maxSeoTitleLength) {
  const cleanValue = sanitizeSeoText(value);

  if (cleanValue.length <= maxLength) return cleanValue;

  const truncated = cleanValue.slice(0, Math.max(0, maxLength - 3)).trim();
  const lastSeparator = Math.max(
    truncated.lastIndexOf(" | "),
    truncated.lastIndexOf(" - ")
  );
  const lastSpace = truncated.lastIndexOf(" ");
  const cutAt =
    lastSeparator > Math.floor(maxLength * 0.45)
      ? lastSeparator
      : lastSpace > Math.floor(maxLength * 0.6)
        ? lastSpace
        : truncated.length;

  return `${truncated.slice(0, cutAt).trim()}...`;
}

export function pageTitle(title: string) {
  const cleanTitle = sanitizeSeoText(title);
  return truncateSeoTitle(cleanTitle || brand);
}

export function absoluteTitle(title: string) {
  const cleanTitle = sanitizeSeoText(title);
  if (!cleanTitle) return brand;

  if (cleanTitle.toLowerCase().includes(brand.toLowerCase())) {
    return truncateSeoTitle(cleanTitle);
  }

  const suffix = ` | ${brand}`;
  const maxBaseLength = Math.max(brand.length, maxSeoTitleLength - suffix.length);
  const baseTitle =
    cleanTitle.length > maxBaseLength
      ? truncateSeoTitle(cleanTitle, maxBaseLength)
      : cleanTitle;

  return `${baseTitle}${suffix}`;
}

export function metaDescription(value: string, fallback: string) {
  const cleanValue = sanitizeSeoText(value);
  const cleanFallback = sanitizeSeoText(fallback);
  const description = cleanValue || cleanFallback;

  return truncateMetaDescription(description, maxMetaDescriptionLength);
}

export function productSeoDescription({
  description,
  fallback,
  location,
}: {
  description?: string | null;
  fallback: string;
  location?: string | null;
}) {
  const cleanDescription = sanitizeSeoText(description || "");

  if (cleanDescription) {
    return metaDescription(cleanDescription, fallback);
  }

  return metaDescription(location ? `${fallback} ${location}.` : fallback, fallback);
}

function normalizeSeoLocale(locale?: string | null): SeoLocale {
  return isValidLocale(locale) ? locale : defaultLocale;
}

export function localizedSeoCopy(
  copies: LocalizedSeoCopy,
  locale?: string | null
) {
  const safeLocale = normalizeSeoLocale(locale);
  const fallback = copies[defaultLocale] || {};
  const selected = copies[safeLocale] || fallback;
  const title = pageTitle(selected.title || fallback.title || brand);
  const description = metaDescription(
    selected.description || "",
    fallback.description || brand
  );

  return {
    title,
    description,
  };
}

function normalizeSocialImage(
  image: SocialMetadataOptions["image"],
  fallbackAlt: string
): SocialImage {
  if (typeof image === "string") {
    return {
      url: absoluteImageUrl(image),
      width: defaultOgImage.width,
      height: defaultOgImage.height,
      alt: fallbackAlt,
    };
  }

  const selectedImage = image || defaultOgImage;

  return {
    url: absoluteImageUrl(selectedImage.url),
    width: selectedImage.width || defaultOgImage.width,
    height: selectedImage.height || defaultOgImage.height,
    alt: sanitizeSeoText(selectedImage.alt) || fallbackAlt,
  };
}

export function buildOpenGraph({
  title,
  description,
  url = siteUrl,
  image = defaultOgImage,
  locale = "es_CO",
  type = "website",
}: SocialMetadataOptions) {
  const cleanTitle = pageTitle(title);
  const cleanDescription = metaDescription(description, brand);
  const cleanLocale = sanitizeSeoText(locale) || "es_CO";
  const cleanType = type || "website";
  const socialImage = normalizeSocialImage(image, cleanTitle);
  const absoluteSocialUrl = canonicalUrl(url);

  return {
    title: cleanTitle,
    description: cleanDescription,
    url: absoluteSocialUrl,
    siteName: brand,
    locale: cleanLocale,
    type: cleanType,
    images: [socialImage],
  };
}

export function buildTwitterCard({
  title,
  description,
  image = defaultOgImage,
}: Pick<SocialMetadataOptions, "title" | "description" | "image">) {
  const cleanTitle = pageTitle(title);
  const cleanDescription = metaDescription(description, brand);
  const socialImage = normalizeSocialImage(image, cleanTitle);

  return {
    card: "summary_large_image" as const,
    title: cleanTitle,
    description: cleanDescription,
    images: [socialImage.url],
  };
}

export function socialMetadata(options: SocialMetadataOptions) {
  const openGraph = buildOpenGraph(options);
  const twitter = buildTwitterCard(options);

  return {
    openGraph,
    twitter,
  };
}

function normalizeSocialLocale(locale?: string | null) {
  const normalized = normalizeSeoLocale(locale);
  const locales: Record<SeoLocale, string> = {
    es: "es_CO",
    en: "en_US",
    fr: "fr_FR",
    pt: "pt_BR",
    it: "it_IT",
  };

  return locales[normalized];
}

function normalizeKeywords(value?: string[] | string | null) {
  if (!value) return undefined;

  const items = Array.isArray(value) ? value : value.split(",");
  const keywords = items
    .map((item) => sanitizeSeoText(item))
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index);

  return keywords.length ? keywords : undefined;
}

export function buildMetadata({
  title,
  description,
  path,
  url,
  image,
  locale = defaultLocale,
  type = "website",
  keywords,
  languages,
  robots,
  titleMode = "absolute",
}: BuildMetadataOptions): Metadata {
  const cleanTitle = pageTitle(title);
  const fullTitle = absoluteTitle(title);
  const cleanDescription = metaDescription(description, brand);
  const canonicalPath = normalizeCanonicalPath(url || path || "/");
  const canonical = canonicalUrl(canonicalPath);
  const social = socialMetadata({
    title: fullTitle,
    description: cleanDescription,
    url: canonical,
    image,
    locale: normalizeSocialLocale(locale),
    type,
  });

  return {
    metadataBase: new URL(siteUrl),
    title:
      titleMode === "template"
        ? cleanTitle
        : {
            absolute: fullTitle,
          },
    description: cleanDescription,
    keywords: normalizeKeywords(keywords),
    alternates: {
      canonical: canonicalPath === "/" ? new URL(`${siteUrl}/`) : canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: social.openGraph,
    twitter: social.twitter,
    ...(robots ? { robots } : {}),
  };
}
