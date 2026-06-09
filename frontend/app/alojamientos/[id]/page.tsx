import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import PropertyDetailClient from "./PropertyDetailClient";
import { apiUrl } from "@/lib/api";
import { getTranslatedFaq } from "@/lib/faq";
import {
  buildMetadata,
  defaultOgImage,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildLodgingBusinessSchema,
  canUseAggregateRating,
} from "@/lib/schema";
import {
  getDynamicText,
  getLocalizedSlug,
  type DynamicTranslations,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import type { Language } from "@/i18n";
import {
  localizedEntityForSeo,
  localizedEntityMetadata,
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
    active?: boolean | null;
  }[];
  features?: {
    name?: string | null;
    title?: string | null;
    translations?: DynamicTranslations | null;
  }[];
  destinations?: {
    id?: number | string | null;
    slug?: string | null;
    name?: string | null;
    seoDescription?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    location?: string | null;
    translations?: DynamicTranslations | null;
    translatedSlugs?: Record<string, string | null> | null;
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

type ExtraServiceSeo = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  translations?: DynamicTranslations | null;
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

async function getPropertyExtras(propertyId: number): Promise<ExtraServiceSeo[]> {
  try {
    const response = await fetch(apiUrl(`/extras/property/${propertyId}`), {
      next: { revalidate },
    });

    if (!response.ok) return [];

    const data = await response.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.extras)) return data.extras;

    return [];
  } catch {
    return [];
  }
}

function primaryImage(property: PropertySeo | null) {
  const activeImages = (property?.images || []).filter(
    (image) => image.active !== false && image.url
  );

  return (
    activeImages.find((image) => image.isPrimary)?.url ||
    activeImages[0]?.url ||
    defaultOgImage.url
  );
}

async function getPublicProperties(): Promise<PropertySeo[]> {
  try {
    const response = await fetch(apiUrl("/properties"), {
      next: { revalidate },
    });

    if (!response.ok) return [];

    const properties = await response.json();
    return Array.isArray(properties) ? properties : [];
  } catch {
    return [];
  }
}

function normalizedText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function destinationKeys(property?: PropertySeo | null) {
  return new Set(
    (property?.destinations || [])
      .map((destination) => normalizedText(destination.slug || destination.name))
      .filter(Boolean)
  );
}

function featureCategoryKeys(property?: PropertySeo | null) {
  return new Set(
    (property?.features || [])
      .map((feature: any) => normalizedText(feature.category || feature.name))
      .filter(Boolean)
  );
}

function relatedPropertyScore(current: PropertySeo, candidate: PropertySeo) {
  const currentDestinations = destinationKeys(current);
  const candidateDestinations = destinationKeys(candidate);
  const currentCategories = featureCategoryKeys(current);
  const candidateCategories = featureCategoryKeys(candidate);
  const currentCapacity = Number(current.maxCapacity || current.maxGuests || 0);
  const candidateCapacity = Number(candidate.maxCapacity || candidate.maxGuests || 0);
  let score = 0;

  candidateDestinations.forEach((key) => {
    if (currentDestinations.has(key)) score += 5;
  });

  if (
    normalizedText(current.area) &&
    normalizedText(current.area) === normalizedText(candidate.area)
  ) {
    score += 3;
  }

  if (currentCapacity > 0 && candidateCapacity > 0) {
    const capacityDifference = Math.abs(currentCapacity - candidateCapacity);
    if (capacityDifference === 0) score += 3;
    else if (capacityDifference <= 2) score += 2;
    else if (capacityDifference <= 4) score += 1;
  }

  candidateCategories.forEach((key) => {
    if (currentCategories.has(key)) score += 1;
  });

  return score;
}

async function getRelatedProperties(
  property: PropertySeo | null
): Promise<PropertySeo[]> {
  if (!property?.id) return [];

  const properties = await getPublicProperties();

  return properties
    .filter((candidate) => {
      if (!candidate?.id || candidate.id === property.id) return false;
      const status = String((candidate as any).status || "");
      return !["ARCHIVED", "MAINTENANCE", "DRAFT"].includes(status);
    })
    .map((candidate) => ({
      property: candidate,
      score: relatedPropertyScore(property, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.property);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    return buildMetadata({
      title: "Alojamiento no disponible",
      description: fallbackDescription,
      path: `/alojamientos/${id}`,
      image: defaultOgImage,
    });
  }

  const metadata = localizedEntityMetadata({
    kind: "property",
    entity: property as TranslatableEntity,
    locale: "es",
    fallbackTitle: "Alojamiento premium | Cartagena Tailored Travel",
    fallbackDescription,
    image: primaryImage(property),
  });

  return {
    ...metadata,
    keywords: property.seoKeywords
      ? property.seoKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : undefined,
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
  const propertyPublicUrl =
    property?.slug?.trim()
      ? localizedRoutePath(
          "property",
          locale,
          getLocalizedSlug(property, locale, property.slug)
        )
      : localizedRoutePath("property", locale);
  const schemaProperty = localizedProperty
    ? {
        ...localizedProperty,
        destinations: (property?.destinations || []).map((destination) => ({
          ...destination,
          name: getDynamicText(destination, "name", locale, destination.name),
          seoDescription: getDynamicText(
            destination,
            "seoDescription",
            locale,
            destination.seoDescription
          ),
          shortDescription: getDynamicText(
            destination,
            "shortDescription",
            locale,
            destination.shortDescription
          ),
          description: getDynamicText(
            destination,
            "description",
            locale,
            destination.description
          ),
          location: getDynamicText(
            destination,
            "location",
            locale,
            destination.location
          ),
          url: localizedRoutePath(
            "destination",
            locale,
            getLocalizedSlug(destination, locale, destination.slug)
          ),
        })),
      }
    : null;
  const [approvedReviews, extras, relatedProperties] = property
    ? await Promise.all([
        getApprovedReviews(property),
        getPropertyExtras(property.id),
        getRelatedProperties(property),
      ])
    : [[], [], []];
  const faqSchema = property
    ? buildFaqPageSchema(getTranslatedFaq(property, locale, property.faq))
    : undefined;

  return (
    <>
      {property ? (
        <JsonLd
          data={[
            buildLodgingBusinessSchema(
              schemaProperty || property,
              approvedReviews,
              locale
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
                schemaProperty?.url || propertyPublicUrl,
              },
            ]),
            ...(faqSchema ? [faqSchema] : []),
          ]}
        />
      ) : null}
      <PropertyDetailClient
        params={params}
        initialProperty={property as any}
        initialExtras={extras as any}
        initialRelatedProperties={relatedProperties as any}
      />
    </>
  );
}
