import type { Metadata } from "next";

import PropertyDetailClient from "./PropertyDetailClient";
import { apiUrl } from "@/lib/api";
import { absoluteTitle, metaDescription, pageTitle } from "@/lib/seo";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: {
    url?: string | null;
    isPrimary?: boolean | null;
  }[];
};

const fallbackDescription =
  "Luxury villa in Cartagena with premium amenities, personalized assistance and strategic location.";

async function getProperty(id: string): Promise<PropertySeo | null> {
  try {
    const response = await fetch(apiUrl(`/properties/${id}`), {
      cache: "no-store",
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

function primaryImage(property: PropertySeo | null) {
  return (
    property?.images?.find((image) => image.isPrimary)?.url ||
    property?.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200"
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

  const location = [property.area, property.city].filter(Boolean).join(", ");
  const title = pageTitle(property.seoTitle || property.title || "Alojamiento premium");
  const capacity = property.maxGuests || property.maxCapacity;
  const descriptionSource =
    property.seoDescription || property.shortDescription || property.description || "";
  const descriptionDetails = [
    descriptionSource,
    location ? `Location: ${location}.` : "",
    capacity ? `Capacity up to ${capacity} guests.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const description = metaDescription(descriptionDetails, fallbackDescription);
  const image = primaryImage(property);

  return {
    title: absoluteTitle(title),
    description,
    alternates: {
      canonical: property.slug ? `/alojamientos/${property.slug}` : `/alojamientos/${property.id}`,
    },
    openGraph: {
      title: absoluteTitle(title),
      description,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 800,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: absoluteTitle(title),
      description,
      images: [image],
    },
  };
}

export default function PropertyDetailPage({ params }: PageProps) {
  return <PropertyDetailClient params={params} />;
}
