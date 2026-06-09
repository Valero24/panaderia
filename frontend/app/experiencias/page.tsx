import ExperienciasPageClient from "./ExperienciasPageClient";
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
  name: "Private Tours & Experiences in Cartagena",
  description:
    "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.",
  url: "/experiencias",
  image:
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
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

export default async function ExperienciasPage({
  searchParams,
  includeSchema = true,
}: PageProps) {
  const params = await searchParams;
  const selectedSlugs = parseFeatures(params?.features);
  const query = selectedSlugs.length > 0 ? `?features=${selectedSlugs.join(",")}` : "";
  const [experiences, availableFeatures] = await Promise.all([
    fetchPublicList<any>(`/experiences${query}`),
    fetchPublicList<any>("/public-filters?type=EXPERIENCE"),
  ]);

  return (
    <>
      {includeSchema ? <JsonLd data={collectionSchema} /> : null}
      <ExperienciasPageClient
        initialExperiences={experiences}
        initialAvailableFeatures={availableFeatures}
        initialSelectedSlugs={selectedSlugs}
      />
    </>
  );
}
