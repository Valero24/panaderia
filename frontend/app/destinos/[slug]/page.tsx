import type { Metadata } from "next";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import DestinationDetailContent from "@/components/destinations/DestinationDetailContent";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";
import { getTranslatedFaq } from "@/lib/faq";
import {
  getDynamicText,
  type DynamicTranslations,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import type { Language } from "@/i18n";
import {
  localizedAlternates,
  localizedEntityForSeo,
} from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import {
  absoluteTitle,
  buildMetadata,
  defaultOgImage,
  metaDescription,
  pageTitle,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildTouristDestinationSchema,
} from "@/lib/schema";

export const revalidate = 600;

type PageProps = {
  params: Promise<{ slug: string }>;
  locale?: Language;
};

type Destination = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  heroImage?: string | null;
  gallery?: unknown;
  location?: string | null;
  isFeatured?: boolean | null;
  translations?: DynamicTranslations | null;
};

const fallbackDescription =
  "Curated tourist destination in Cartagena with luxury travel assistance.";

function normalizeGallery(value: unknown) {
  if (typeof value === "string") {
    try {
      return normalizeGallery(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const source = item as { type?: string | null; url?: string | null };
        if (source.type === "VIDEO") return "";
        return source.url || "";
      }
      return "";
    })
    .map((url) => cleanPublicCopy(url))
    .filter(Boolean);
}

async function getDestination(slug: string): Promise<Destination | null> {
  try {
    const response = await fetch(apiUrl(`/destinations/${slug}`), {
      next: { revalidate },
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestination(slug);

  if (!destination) {
    return buildMetadata({
      title: "Destino no encontrado",
      description: fallbackDescription,
      path: `/destinos/${slug}`,
      image: defaultOgImage,
      robots: { index: false, follow: false },
    });
  }

  const title = destination.seoTitle
    ? pageTitle(destination.seoTitle)
    : absoluteTitle(destination.name);
  const description = metaDescription(
    destination.seoDescription ||
      destination.shortDescription ||
      destination.description ||
      "",
    fallbackDescription
  );
  const gallery = normalizeGallery(destination.gallery);
  const image = destination.heroImage || gallery[0] || defaultOgImage.url;
  return buildMetadata({
    title,
    description,
    path: destination.slug ? `/destinos/${destination.slug}` : "/destinos",
    image,
    languages: localizedAlternates(
      "destination",
      destination as TranslatableEntity
    ).languages,
  });
}

export default async function DestinationDetailPage({
  params,
  locale = "es",
}: PageProps) {
  const { slug } = await params;
  const destination = await getDestination(slug);

  if (!destination) notFound();

  const localizedDestination = localizedEntityForSeo(
    destination as any,
    locale,
    "destination"
  );
  const destinationPublicUrl = destination.slug?.trim()
    ? `/destinos/${destination.slug.trim()}`
    : "/destinos";
  const schemaDestination = localizedDestination;
  const faqSchema = buildFaqPageSchema(
    getTranslatedFaq(destination, locale, destination.faq)
  );
  const schemas = [
    buildTouristDestinationSchema(schemaDestination),
    buildBreadcrumbSchema([
      { name: "Home", url: localizedRoutePath("home", locale) },
      { name: "Destinos", url: localizedRoutePath("destination", locale) },
      {
        name:
          getDynamicText(destination, "name", locale) ||
          cleanPublicCopy(destination.name) ||
          "Destino",
        url:
          schemaDestination.url || destinationPublicUrl,
      },
    ]),
    faqSchema,
  ].filter(Boolean) as object[];

  return (
    <>
      <JsonLd data={schemas} />
      <DestinationDetailContent destination={destination} />
    </>
  );
}
