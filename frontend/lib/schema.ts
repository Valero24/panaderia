import {
  absoluteUrl,
  canonicalUrl,
  defaultOgImage,
  metaDescription,
  pageTitle,
  sanitizeSeoText,
  siteUrl,
} from "@/lib/seo";

type SchemaValue =
  | string
  | number
  | boolean
  | SchemaValue[]
  | { [key: string]: SchemaValue | null | undefined }
  | null
  | undefined;

type ImageLike = {
  url?: string | null;
  isPrimary?: boolean | null;
  active?: boolean | null;
};

type FeatureLike = {
  name?: string | null;
  title?: string | null;
};

type PublicProductSchemaInput = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  seoDescription?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  area?: string | null;
  mainImage?: string | null;
  images?: ImageLike[] | null;
  basePrice?: number | string | null;
  pricePerNight?: number | string | null;
  currency?: string | null;
  maxGuests?: number | null;
  maxCapacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  duration?: string | null;
  durationDescription?: string | null;
  itinerary?: string | null;
  included?: string | null;
  meetingPoint?: string | null;
  schedule?: string | null;
  experienceCategory?: string | null;
  category?: string | null;
  features?: FeatureLike[] | null;
  components?: {
    title?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    duration?: string | null;
    location?: string | null;
    sortOrder?: number | null;
    active?: boolean | null;
  }[] | null;
};

type BreadcrumbItem = {
  name: string;
  url: string;
};

type CollectionPageOptions = {
  name: string;
  description: string;
  url: string;
  image?: string | null;
};

type FaqItem = {
  question?: string | null;
  answer?: string | null;
};

const brandName = "Cartagena Tailored Travel";
const defaultDescription =
  "Agency specialized in luxury tourism, private tours, premium accommodations and tailored experiences in Cartagena, Colombia.";

function compactSchema<T extends SchemaValue>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const cleanValue = sanitizeSeoText(value);
    return cleanValue ? (cleanValue as T) : undefined;
  }

  if (Array.isArray(value)) {
    const compactArray = value
      .map((item) => compactSchema(item))
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined);

    return compactArray.length ? (compactArray as T) : undefined;
  }

  if (typeof value === "object") {
    const compactObject = Object.entries(value).reduce<Record<string, SchemaValue>>(
      (schema, [key, item]) => {
        const compactItem = compactSchema(item);

        if (compactItem !== undefined) {
          schema[key] = compactItem;
        }

        return schema;
      },
      {}
    );

    return Object.keys(compactObject).length ? (compactObject as T) : undefined;
  }

  return value;
}

function schemaObject(value: Record<string, SchemaValue>) {
  return compactSchema(value) || {};
}

function productName(item: PublicProductSchemaInput, fallback: string) {
  return pageTitle(item.title || item.name || fallback);
}

function productDescription(
  item: PublicProductSchemaInput,
  fallback = defaultDescription
) {
  return metaDescription(
    item.seoDescription || item.shortDescription || item.description || "",
    fallback
  );
}

function productImage(item?: PublicProductSchemaInput | null) {
  const primaryImage =
    item?.images?.find((image) => image.active !== false && image.isPrimary)?.url ||
    item?.images?.find((image) => image.active !== false)?.url ||
    item?.mainImage ||
    defaultOgImage.url;

  return absoluteUrl(primaryImage);
}

function productImages(item?: PublicProductSchemaInput | null) {
  const images = [
    ...(item?.images || [])
      .filter((image) => image.active !== false)
      .map((image) => image.url),
    item?.mainImage,
    defaultOgImage.url,
  ]
    .filter((url): url is string => Boolean(sanitizeSeoText(url)))
    .map((url) => absoluteUrl(url));

  return Array.from(new Set(images)).slice(0, 8);
}

function productPath(
  basePath: "alojamientos" | "experiencias" | "paquetes",
  item: PublicProductSchemaInput
) {
  const identifier = item.slug || item.id;
  return identifier ? `/${basePath}/${identifier}` : `/${basePath}`;
}

function addressSchema(item?: PublicProductSchemaInput | null) {
  const locality = item?.city || item?.location || "Cartagena";
  const area = item?.area;

  return schemaObject({
    "@type": "PostalAddress",
    addressLocality: area ? `${area}, ${locality}` : locality,
    addressCountry: "CO",
  });
}

function offerSchema(item: PublicProductSchemaInput) {
  const price = item.pricePerNight || item.basePrice;

  if (!price) return undefined;

  return schemaObject({
    "@type": "Offer",
    price,
    priceCurrency: item.currency || "COP",
    availability: "https://schema.org/InStock",
  });
}

function priceRangeSchema(item: PublicProductSchemaInput) {
  const price = item.pricePerNight || item.basePrice;
  const cleanPrice = sanitizeSeoText(String(price || ""));

  return cleanPrice ? `${item.currency || "COP"} ${cleanPrice}` : undefined;
}

function occupancySchema(item: PublicProductSchemaInput) {
  const maxValue = item.maxGuests || item.maxCapacity;

  if (!maxValue) return undefined;

  return schemaObject({
    "@type": "QuantitativeValue",
    maxValue,
    unitText: "guests",
  });
}

function geoSchema(item: PublicProductSchemaInput) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return schemaObject({
    "@type": "GeoCoordinates",
    latitude,
    longitude,
  });
}

function amenityFeatureSchema(item: PublicProductSchemaInput) {
  const amenities = (item.features || [])
    .map((feature) => feature.name || feature.title)
    .filter((name): name is string => Boolean(sanitizeSeoText(name)))
    .filter((name, index, values) => values.indexOf(name) === index)
    .map((name) =>
      schemaObject({
        "@type": "LocationFeatureSpecification",
        name,
        value: true,
      })
    );

  return amenities.length ? amenities : undefined;
}

function lodgingLocationSchema(item: PublicProductSchemaInput) {
  const locationName = [item.area, item.city || item.location]
    .filter(Boolean)
    .join(", ");

  if (!locationName) return undefined;

  return schemaObject({
    "@type": "Place",
    name: locationName,
    address: addressSchema(item),
    geo: geoSchema(item),
  });
}

function lodgingAdditionalProperties(item: PublicProductSchemaInput) {
  const values = [
    item.maxGuests || item.maxCapacity
      ? {
          name: "Capacidad maxima",
          value: String(item.maxGuests || item.maxCapacity),
          unitText: "huespedes",
        }
      : undefined,
    item.bedrooms
      ? {
          name: "Habitaciones",
          value: String(item.bedrooms),
        }
      : undefined,
    item.bathrooms
      ? {
          name: "Banos",
          value: String(item.bathrooms),
        }
      : undefined,
  ]
    .filter(Boolean)
    .map((item) =>
      schemaObject({
        "@type": "PropertyValue",
        ...(item as Record<string, SchemaValue>),
      })
    );

  return values.length ? values : undefined;
}

function touristItinerarySchema(item: PublicProductSchemaInput) {
  const itineraryItems = String(item.itinerary || "")
    .split(/\r?\n/)
    .map((line) => sanitizeSeoText(line))
    .filter(Boolean);

  if (itineraryItems.length > 0) {
    return itineraryItems.map((name, index) =>
      schemaObject({
        "@type": "ListItem",
        position: index + 1,
        name,
      })
    );
  }

  const activeComponents = (item.components || [])
    .filter((component) => component.active !== false)
    .sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0));

  if (activeComponents.length > 0) {
    return activeComponents.map((component, index) =>
      schemaObject({
        "@type": "ListItem",
        position: index + 1,
        name: component.title,
        description: component.shortDescription || component.description,
        item: {
          "@type": "TouristAttraction",
          name: component.title,
          description: component.shortDescription || component.description,
          location: component.location,
        },
      })
    );
  }

  return item.durationDescription || item.schedule || item.duration;
}

export function buildWebsiteSchema() {
  return schemaObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName,
    url: canonicalUrl("/"),
    inLanguage: ["es", "en", "fr", "pt", "it"],
    publisher: {
      "@type": "Organization",
      name: brandName,
      url: siteUrl,
      logo: defaultOgImage.url,
    },
  });
}

export function buildLocalBusinessSchema() {
  return schemaObject({
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "TravelAgency"],
    name: brandName,
    description: defaultDescription,
    url: canonicalUrl("/"),
    image: defaultOgImage.url,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cartagena",
      addressCountry: "CO",
    },
    areaServed: {
      "@type": "City",
      name: "Cartagena",
    },
  });
}

export function buildLodgingBusinessSchema(property: PublicProductSchemaInput) {
  const name = productName(property, "Alojamiento premium en Cartagena");
  const url = canonicalUrl(productPath("alojamientos", property));

  return schemaObject({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name,
    description: productDescription(
      property,
      "Luxury accommodation in Cartagena with personalized assistance."
    ),
    url,
    image: productImages(property),
    address: addressSchema(property),
    location: lodgingLocationSchema(property),
    geo: geoSchema(property),
    occupancy: occupancySchema(property),
    maximumAttendeeCapacity: property.maxGuests || property.maxCapacity,
    amenityFeature: amenityFeatureSchema(property),
    additionalProperty: lodgingAdditionalProperties(property),
    priceRange: priceRangeSchema(property),
    provider: {
      "@type": "TravelAgency",
      name: brandName,
      url: siteUrl,
    },
    offers: offerSchema(property),
  });
}

export function buildTouristTripSchema(
  item: PublicProductSchemaInput,
  basePath: "experiencias" | "paquetes" = "experiencias"
) {
  const name = productName(item, "Experiencia premium en Cartagena");
  const url = canonicalUrl(productPath(basePath, item));

  return schemaObject({
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name,
    description: productDescription(
      item,
      "Curated travel experience in Cartagena with personalized assistance."
    ),
    url,
    image: productImage(item),
    touristType: item.experienceCategory || item.category || "Luxury travel",
    duration: item.durationDescription || item.duration,
    location: item.location
      ? {
          "@type": "Place",
          name: item.location,
        }
      : undefined,
    itinerary: touristItinerarySchema(item),
    provider: {
      "@type": "TravelAgency",
      name: brandName,
      url: siteUrl,
    },
    offers: offerSchema(item),
  });
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  const itemListElement = items.map((item, index) =>
    schemaObject({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.url),
    })
  );

  return schemaObject({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
}

export function buildCollectionPageSchema({
  name,
  description,
  url,
  image,
}: CollectionPageOptions) {
  return schemaObject({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: canonicalUrl(url),
    image: absoluteUrl(image || defaultOgImage.url),
    isPartOf: {
      "@type": "WebSite",
      name: brandName,
      url: siteUrl,
    },
    publisher: {
      "@type": "TravelAgency",
      name: brandName,
      url: siteUrl,
    },
  });
}

export function buildFaqPageSchema(faqs: FaqItem[]) {
  const mainEntity = faqs
    .filter((faq) => sanitizeSeoText(faq.question) && sanitizeSeoText(faq.answer))
    .map((faq) =>
      schemaObject({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })
    );

  if (mainEntity.length === 0) return undefined;

  return schemaObject({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  });
}
