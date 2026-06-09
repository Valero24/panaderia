import PaquetesPageClient from "./PaquetesPageClient";
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
  name: "Luxury Travel Packages in Cartagena",
  description:
    "Personalized luxury travel packages combining accommodation, tours and premium experiences.",
  url: "/paquetes",
  image:
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
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

export default async function PaquetesPage({
  searchParams,
  includeSchema = true,
}: PageProps) {
  const params = await searchParams;
  const selectedSlugs = parseFeatures(params?.features);
  const query = selectedSlugs.length > 0 ? `?features=${selectedSlugs.join(",")}` : "";
  const [packages, availableFeatures] = await Promise.all([
    fetchPublicList<any>(`/packages${query}`),
    fetchPublicList<any>("/public-filters?type=PACKAGE"),
  ]);

  return (
    <>
      {includeSchema ? <JsonLd data={collectionSchema} /> : null}
      <PaquetesPageClient
        initialPackages={packages}
        initialAvailableFeatures={availableFeatures}
        initialSelectedSlugs={selectedSlugs}
      />
    </>
  );
}
