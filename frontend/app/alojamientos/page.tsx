import AlojamientosPageClient from "./AlojamientosPageClient";
import JsonLd from "@/components/JsonLd";
import { apiUrl } from "@/lib/api";
import { buildCollectionPageSchema } from "@/lib/schema";

export const revalidate = 300;

type PageProps = {
  searchParams?: Promise<{
    features?: string;
  }>;
  includeSchema?: boolean;
};

const collectionSchema = buildCollectionPageSchema({
  name: "Luxury Accommodations in Cartagena | Cartagena Tailored Travel",
  description:
    "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.",
  url: "/alojamientos",
  image:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
});

function parseFeatures(value?: string | null) {
  return (value || "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

async function fetchPublicList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(apiUrl(path), {
      next: { revalidate },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function AlojamientosPage({
  searchParams,
  includeSchema = true,
}: PageProps) {
  const params = await searchParams;
  const selectedSlugs = parseFeatures(params?.features);
  const query = selectedSlugs.length > 0 ? `?features=${selectedSlugs.join(",")}` : "";
  const [properties, availableFeatures] = await Promise.all([
    fetchPublicList<any>(`/properties${query}`),
    fetchPublicList<any>("/public-filters?type=PROPERTY"),
  ]);

  return (
    <>
      {includeSchema ? <JsonLd data={collectionSchema} /> : null}
      <AlojamientosPageClient
        initialProperties={properties}
        initialAvailableFeatures={availableFeatures}
        initialSelectedSlugs={selectedSlugs}
      />
    </>
  );
}
