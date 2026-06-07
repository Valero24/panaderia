import AlojamientosPageClient from "./AlojamientosPageClient";
import { apiUrl } from "@/lib/api";

export const revalidate = 300;

type PageProps = {
  searchParams?: Promise<{
    features?: string;
  }>;
};

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

export default async function AlojamientosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedSlugs = parseFeatures(params?.features);
  const query = selectedSlugs.length > 0 ? `?features=${selectedSlugs.join(",")}` : "";
  const [properties, availableFeatures] = await Promise.all([
    fetchPublicList<any>(`/properties${query}`),
    fetchPublicList<any>("/public-filters?type=PROPERTY"),
  ]);

  return (
    <AlojamientosPageClient
      initialProperties={properties}
      initialAvailableFeatures={availableFeatures}
      initialSelectedSlugs={selectedSlugs}
    />
  );
}
