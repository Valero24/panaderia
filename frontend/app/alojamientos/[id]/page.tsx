import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import PropertyDetailClient from "./PropertyDetailClient";
import { apiUrl } from "@/lib/api";
import { getTranslatedFaq } from "@/lib/faq";
import {
  absoluteTitle,
  canonicalUrl,
  defaultOgImage,
  metaDescription,
  pageTitle,
  socialMetadata,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildLodgingBusinessSchema,
  canUseAggregateRating,
} from "@/lib/schema";
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

export const revalidate = 600;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  locale?: Language;
};

type PropertySeo = {
  id: number;
  slug?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  city?: string | null;
  area?: string | null;
  maxGuests?: number | null;
  maxCapacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  pricePerNight?: number | null;
  basePrice?: number | null;
  currency?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoContent?: string | null;
  nearbyAttractions?: string | null;
  locationDescription?: string | null;
  guestRecommendations?: string | null;
  faq?: unknown;
  translations?: DynamicTranslations | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
  images?: {
    url?: string | null;
    isPrimary?: boolean | null;
  }[];
  features?: {
    name?: string | null;
    title?: string | null;
  }[];
};

type PublicReviewSeo = {
  customerName?: string | null;
  publicName?: string | null;
  customerCountry?: string | null;
  rating?: number | string | null;
  title?: string | null;
  comment?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
};

const fallbackDescription =
  "Luxury villa in Cartagena with premium amenities, personalized assistance and strategic location.";

async function getProperty(id: string): Promise<PropertySeo | null> {
  try {
    const response = await fetch(apiUrl(`/properties/${id}`), {
      next: { revalidate },
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

async function getApprovedReviews(property: PropertySeo): Promise<PublicReviewSeo[]> {
  if (!canUseAggregateRating(property)) return [];

  try {
    const response = await fetch(apiUrl(`/reviews/public/PROPERTY/${property.id}`), {
      next: { revalidate },
    });

    if (!response.ok) return [];

    const reviews = await response.json();
    return Array.isArray(reviews) ? reviews : [];
  } catch {
    return [];
  }
}

function primaryImage(property: PropertySeo | null) {
  return (
    property?.images?.find((image) => image.isPrimary)?.url ||
    property?.images?.[0]?.url ||
    defaultOgImage.url
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    return {
      title: pageTitle("Alojamiento no disponible"),
      description: fallbackDescription,
    };
  }

  const title = pageTitle(property.seoTitle || property.title || "Alojamiento premium");
  const capacity = property.maxGuests || property.maxCapacity;
  const location = [property.area, property.city].filter(Boolean).join(", ");
  const description = property.seoDescription
    ? metaDescription(property.seoDescription, fallbackDescription)
    : metaDescription(
        [
          property.shortDescription || property.description || "",
          location ? `Location: ${location}.` : "",
          capacity ? `Capacity up to ${capacity} guests.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        fallbackDescription
      );
  const image = primaryImage(property);
  const identifier = property.slug || property.id;
  const path = `/es/alojamientos/${identifier}`;
  const canonical = canonicalUrl(path);
  const social = socialMetadata({
    title: absoluteTitle(title),
    description,
    url: canonical,
    image: {
      url: image,
      width: 1200,
      height: 630,
      alt: title,
    },
  });

  return {
    title: absoluteTitle(title),
    description,
    keywords: property.seoKeywords
      ? property.seoKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : undefined,
    alternates: {
      canonical,
      languages: localizedAlternates("property", property as TranslatableEntity)
        .languages,
    },
    openGraph: social.openGraph,
    twitter: social.twitter,
  };
}

export default async function PropertyDetailPage({
  params,
  locale = "es",
}: PageProps) {
  const { id } = await params;
  const property = await getProperty(id);
  const localizedProperty = property
    ? localizedEntityForSeo(property as any, locale, "property")
    : null;
  const approvedReviews = property ? await getApprovedReviews(property) : [];
  const faqSchema = property
    ? buildFaqPageSchema(getTranslatedFaq(property, locale, property.faq))
    : undefined;

  return (
    <>
      {property ? (
        <JsonLd
          data={[
            buildLodgingBusinessSchema(
              localizedProperty || property,
              approvedReviews
            ),
            buildBreadcrumbSchema([
              { name: "Home", url: localizedRoutePath("home", locale) },
              {
                name: "Alojamientos",
                url: localizedRoutePath("property", locale),
              },
              {
                name:
                  getDynamicText(property, "title", locale) ||
                  property.title ||
                  "Alojamiento premium",
                url:
                  localizedProperty?.url ||
                  `/es/alojamientos/${property.slug || property.id}`,
              },
            ]),
            ...(faqSchema ? [faqSchema] : []),
          ]}
        />
      ) : null}
      <PropertyDetailClient params={params} initialProperty={property as any} />
    </>
  );
}
