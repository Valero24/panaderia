import { cleanPublicCopy } from "@/lib/public-copy";

const brand = "Cartagena Tailored Travel";
const defaultSeoLocale = "es";
const fallbackSiteUrl = "https://panaderia-psi.vercel.app";

function normalizeSiteUrl(value?: string | null) {
  const cleanValue = value?.trim().replace(/\/+$/, "");

  return cleanValue || fallbackSiteUrl;
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const defaultOgImage = {
  url: `${siteUrl}/og/cartagena-tailored-travel.jpg`,
  width: 1200,
  height: 630,
  alt: "Cartagena Tailored Travel luxury travel in Cartagena",
};

type SeoLocale = "es" | "en" | "fr" | "pt" | "it";

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

export function canonicalUrl(pathOrUrl?: string | null) {
  const absolute = absoluteUrl(pathOrUrl);

  try {
    const url = new URL(absolute);
    url.search = "";
    url.hash = "";

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

export function pageTitle(title: string) {
  const cleanTitle = sanitizeSeoText(title);
  return cleanTitle || brand;
}

export function absoluteTitle(title: string) {
  const cleanTitle = sanitizeSeoText(title);
  if (!cleanTitle) return brand;

  return cleanTitle.toLowerCase().includes(brand.toLowerCase())
    ? cleanTitle
    : `${cleanTitle} | ${brand}`;
}

export function metaDescription(value: string, fallback: string) {
  const cleanValue = sanitizeSeoText(value);
  const cleanFallback = sanitizeSeoText(fallback);
  const description = cleanValue || cleanFallback;

  return description.length > 160
    ? `${description.slice(0, 157).trim()}...`
    : description;
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
  return locale === "en" ||
    locale === "fr" ||
    locale === "pt" ||
    locale === "it" ||
    locale === "es"
    ? locale
    : defaultSeoLocale;
}

export function localizedSeoCopy(
  copies: LocalizedSeoCopy,
  locale?: string | null
) {
  const safeLocale = normalizeSeoLocale(locale);
  const fallback = copies[defaultSeoLocale] || {};
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

export function socialMetadata({
  title,
  description,
  url = siteUrl,
  image = defaultOgImage,
  locale = "es_CO",
  type = "website",
}: SocialMetadataOptions) {
  const cleanTitle = pageTitle(title);
  const cleanDescription = metaDescription(description, brand);
  const socialImage =
    typeof image === "string"
      ? {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: cleanTitle,
        }
      : {
          ...image,
          url: absoluteUrl(image.url),
          alt: image.alt || cleanTitle,
        };
  const absoluteSocialUrl = absoluteUrl(url);

  return {
    openGraph: {
      title: cleanTitle,
      description: cleanDescription,
      url: absoluteSocialUrl,
      siteName: brand,
      locale,
      type,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: cleanTitle,
      description: cleanDescription,
      images: [socialImage.url],
    },
  };
}
