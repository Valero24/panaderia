import { cleanPublicCopy } from "@/lib/public-copy";

const brand = "Cartagena Tailored Travel";
const defaultSeoLocale = "es";
export const siteUrl = "https://cartagenatailoredtravel.com";
export const defaultOgImage = {
  url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1200",
  width: 1200,
  height: 630,
  alt: "Luxury travel experience in Cartagena",
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
  image?: typeof defaultOgImage;
};

export function pageTitle(title: string) {
  const cleanTitle = cleanPublicCopy(title).trim();
  return cleanTitle || brand;
}

export function absoluteTitle(title: string) {
  const cleanTitle = cleanPublicCopy(title).trim();
  return cleanTitle ? `${cleanTitle} | ${brand}` : brand;
}

export function metaDescription(value: string, fallback: string) {
  const cleanValue = cleanPublicCopy(value).replace(/\s+/g, " ").trim();
  const cleanFallback = cleanPublicCopy(fallback).replace(/\s+/g, " ").trim();
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
  const cleanDescription = cleanPublicCopy(description || "")
    .replace(/\s+/g, " ")
    .trim();

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
}: SocialMetadataOptions) {
  const cleanTitle = pageTitle(title);
  const cleanDescription = metaDescription(description, brand);

  return {
    openGraph: {
      title: cleanTitle,
      description: cleanDescription,
      url,
      siteName: brand,
      images: [image],
      locale: "es_CO",
      type: "website",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: cleanTitle,
      description: cleanDescription,
      images: [image.url],
    },
  };
}
