"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import PublicProductCard from "@/components/public-product-card";
import PublicFilterPanel from "@/components/public/PublicFilterPanel";
import PublicJourneyHeader from "@/components/public/PublicJourneyHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";
import {
  buildFeaturedCollections,
  type PublicFeature,
} from "@/lib/public-feature-collections";

type Experience = {
  id: number;
  title: string;
  shortDescription: string;
  location: string;
  duration: string;
  maxGuests: number;
  basePrice: number;
  category: string;
  mainImage?: string | null;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
  translations?: DynamicTranslations | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=900";

function readFeaturesFromUrl() {
  if (typeof window === "undefined") return [];

  const params = new URLSearchParams(window.location.search);
  return (params.get("features") || "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function updateFeatureUrl(slugs: string[]) {
  const params = new URLSearchParams(window.location.search);

  if (slugs.length > 0) {
    params.set("features", slugs.join(","));
  } else {
    params.delete("features");
  }

  const query = params.toString();
  window.history.pushState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

async function getExperiences(features: string[] = []): Promise<Experience[]> {
  const query = features.length > 0 ? `?features=${features.join(",")}` : "";
  const res = await fetch(apiUrl(`/experiences${query}`), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudieron cargar experiencias.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function imageFor(experience: Experience) {
  const images = (experience.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    experience.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    fallbackImage
  );
}

export default function ExperienciasPage() {
  const { language, t } = useTranslation();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableFeatures, setAvailableFeatures] = useState<PublicFeature[]>([]);

  async function fetchExperiences(features = selectedSlugs) {
    try {
      setLoading(true);
      setError("");
      const data = await getExperiences(features);
      setExperiences(data);
    } catch (loadError) {
      console.error(loadError);
      setError(t("filters.optionsLoadError"));
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableFeatures() {
    try {
      const response = await fetch(apiUrl("/public-filters?type=EXPERIENCE"), {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t("filters.loadError"));
      }

      setAvailableFeatures(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
      setAvailableFeatures([]);
    }
  }

  useEffect(() => {
    function syncFromUrl() {
      setSelectedSlugs(readFeaturesFromUrl());
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    fetchAvailableFeatures();
  }, []);

  useEffect(() => {
    fetchExperiences(selectedSlugs);
  }, [selectedSlugs.join(",")]);

  const collections = buildFeaturedCollections(
    availableFeatures,
    t("filters.resultsFound"),
    language
  );

  function applyCollection(slug: string) {
    const next = [...new Set([...selectedSlugs, slug])];
    setSelectedSlugs(next);
    updateFeatureUrl(next);
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="premium-reveal mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <PublicJourneyHeader
          eyebrow={t("experiences.eyebrow")}
          title={t("listing.experience.heroTitle")}
          subtitle={t("listing.experience.heroSubtitle")}
          tone="experience"
          customizeLabel={t("filters.personalize")}
          advisorLabel={t("filters.talkAdvisor")}
          resultLabel={
            !loading && !error
              ? `${experiences.length} ${t("experiences.availableCount")}`
              : undefined
          }
          highlights={[
            t("listing.experience.highlight1"),
            t("listing.experience.highlight2"),
            t("listing.experience.highlight3"),
            t("listing.experience.highlight4"),
          ]}
          collectionsTitle={t("listing.featuredCollections")}
          collections={collections}
          onCollectionSelect={applyCollection}
          journeyLabel={t("listing.journeyLabel")}
          journeySteps={[
            t("listing.journeyStep1"),
            t("listing.journeyStep2"),
            t("listing.journeyStep3"),
          ]}
        />

        <div id="listado-filtros" className="mt-8 scroll-mt-28">
          <PublicFilterPanel
            productType="EXPERIENCE"
            selectedSlugs={selectedSlugs}
            onApply={(slugs) => {
              setSelectedSlugs(slugs);
              updateFeatureUrl(slugs);
            }}
            resultLabel={
              !loading && !error
                ? `${experiences.length} ${t("experiences.availableCount")}`
                : undefined
            }
          />
        </div>

        {loading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="aspect-[4/3] premium-skeleton" />
                <div className="space-y-4 p-5">
                  <div className="h-4 w-32 rounded premium-skeleton" />
                  <div className="h-8 w-4/5 rounded premium-skeleton" />
                  <div className="h-16 rounded-xl premium-skeleton" />
                  <div className="h-12 rounded-xl premium-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-white p-8 text-red-700 shadow-sm">
            <p className="font-semibold">{t("filters.optionsLoadError")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchExperiences(selectedSlugs)}
              className="mt-5 rounded-xl"
            >
              {t("filters.retry")}
            </Button>
          </div>
        ) : experiences.length === 0 && selectedSlugs.length === 0 ? (
          <div className="premium-enter mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              {t("experiences.emptyTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              {t("experiences.emptySubtitle")}
            </p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="premium-enter mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              {t("filters.noExactTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              {t("filters.noExactText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedSlugs([]);
                  updateFeatureUrl([]);
                }}
                className="rounded-xl"
              >
                {t("filters.clear")}
              </Button>
              <a href="/contacto">
                <Button type="button" className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                  {t("filters.talkAdvisor")}
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {experiences.map((item) => (
              <PublicProductCard
                key={item.id}
                href={`/experiencias/${item.id}`}
                reserveHref={`/checkout/${item.id}?type=EXPERIENCE`}
                image={imageFor(item)}
                fallbackImage={fallbackImage}
                badge={getDynamicText(item, "category", language)}
                title={getDynamicText(item, "title", language)}
                description={getDynamicText(item, "shortDescription", language)}
                location={getDynamicText(item, "location", language)}
                price={formatMoneyByLanguage(item.basePrice, language)}
                meta={getDynamicText(item, "duration", language)}
                secondaryMeta={
                  <>
                    {t("shared.upTo")} {item.maxGuests}
                  </>
                }
                button={t("experiences.view")}
                trackingLabel={`abrir_experiencia_${item.id}`}
                trackingLocation="experiencias_list"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
