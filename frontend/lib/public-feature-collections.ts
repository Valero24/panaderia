import type { Language } from "@/i18n";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";

export type PublicProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

export type PublicFeature = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  translations?: DynamicTranslations | null;
  category: string;
  count: number;
};

export type FeaturedCollection = {
  title: string;
  text: string;
  slug: string;
  countLabel: string;
};

const preferredSlugs = [
  "frente-al-mar",
  "centro-historico",
  "yates",
  "luna-de-miel",
  "familiar",
  "premium-vip",
  "vip",
  "islas",
  "romantico",
  "familia",
];

const preferredCategories = [
  "LOCATION_STYLE",
  "TRAVEL_TYPE",
  "EXPERIENCE_STYLE",
  "SERVICE_LEVEL",
  "INCLUDED",
  "AMENITY",
  "CONDITION",
  "OTHER",
];

function preferenceScore(feature: PublicFeature) {
  const slugIndex = preferredSlugs.findIndex(
    (slug) => feature.slug === slug || feature.slug.includes(slug)
  );
  const categoryIndex = preferredCategories.indexOf(feature.category);

  return {
    slug: slugIndex === -1 ? Number.MAX_SAFE_INTEGER : slugIndex,
    category: categoryIndex === -1 ? Number.MAX_SAFE_INTEGER : categoryIndex,
  };
}

export function buildFeaturedCollections(
  features: PublicFeature[],
  resultText: string,
  language: Language = "es"
): FeaturedCollection[] {
  const featureName = (feature: PublicFeature) =>
    getDynamicText(feature, "name", language);

  return features
    .filter((feature) => feature.count > 0)
    .sort((a, b) => {
      const scoreA = preferenceScore(a);
      const scoreB = preferenceScore(b);

      return (
        scoreA.slug - scoreB.slug ||
        scoreA.category - scoreB.category ||
        b.count - a.count ||
        featureName(a).localeCompare(featureName(b))
      );
    })
    .slice(0, 6)
    .map((feature) => ({
      title: featureName(feature),
      text:
        getDynamicText(feature, "description", language) ||
        `${featureName(feature)} · ${feature.count} ${resultText}`,
      slug: feature.slug,
      countLabel: `${feature.count}`,
    }));
}
