import ExperienciasPageClient from "./ExperienciasPageClient";
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

export default async function ExperienciasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedSlugs = parseFeatures(params?.features);
  const query = selectedSlugs.length > 0 ? `?features=${selectedSlugs.join(",")}` : "";
  const [experiences, availableFeatures] = await Promise.all([
    fetchPublicList<any>(`/experiences${query}`),
    fetchPublicList<any>("/public-filters?type=EXPERIENCE"),
  ]);

  return (
    <ExperienciasPageClient
      initialExperiences={experiences}
      initialAvailableFeatures={availableFeatures}
      initialSelectedSlugs={selectedSlugs}
    />
  );
}
