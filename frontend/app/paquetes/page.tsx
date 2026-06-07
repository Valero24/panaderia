"use client";

import { useEffect, useState } from "react";
import { Gem } from "lucide-react";

import PublicProductCard from "@/components/public-product-card";
import PublicFilterPanel from "@/components/public/PublicFilterPanel";
import PublicJourneyHeader from "@/components/public/PublicJourneyHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";
import { packagePublicPath } from "@/lib/product-url";
import {
  buildFeaturedCollections,
  type PublicFeature,
} from "@/lib/public-feature-collections";

type PackageItem = {
  id: number;
  slug?: string | null;
  title: string;
  shortDescription: string;
  duration: string;
  location: string;
  maxGuests: number;
  basePrice: number;
  mainImage?: string | null;
  category: string;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
  translations?: DynamicTranslations | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=900";

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

async function getPackages(features: string[] = []): Promise<PackageItem[]> {
  const query = features.length > 0 ? `?features=${features.join(",")}` : "";
  const res = await fetch(apiUrl(`/packages${query}`), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudieron cargar paquetes.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function imageFor(item: PackageItem) {
  const images = (item.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    item.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    fallbackImage
  );
}

export default function PaquetesPage() {
  const { language, t } = useTranslation();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableFeatures, setAvailableFeatures] = useState<PublicFeature[]>([]);

  async function fetchPackages(features = selectedSlugs) {
    try {
      setLoading(true);
      setError("");
      const data = await getPackages(features);
      setPackages(data);
    } catch (loadError) {
      console.error(loadError);
      setError(t("filters.optionsLoadError"));
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableFeatures() {
    try {
      const response = await fetch(apiUrl("/public-filters?type=PACKAGE"), {
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
    fetchPackages(selectedSlugs);
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
      <section id="paquetes-hero" data-scroll-section className="premium-reveal mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <PublicJourneyHeader
          eyebrow={t("packages.eyebrow")}
          title={t("listing.package.heroTitle")}
          subtitle={t("listing.package.heroSubtitle")}
          tone="package"
          customizeLabel={t("filters.personalize")}
          advisorLabel={t("filters.talkAdvisor")}
          resultLabel={
            !loading && !error
              ? `${packages.length} ${t("packages.availableCount")}`
              : undefined
          }
          highlights={[
            t("listing.package.highlight1"),
            t("listing.package.highlight2"),
            t("listing.package.highlight3"),
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
            productType="PACKAGE"
            selectedSlugs={selectedSlugs}
            onApply={(slugs) => {
              setSelectedSlugs(slugs);
              updateFeatureUrl(slugs);
            }}
            resultLabel={
              !loading && !error
                ? `${packages.length} ${t("packages.availableCount")}`
                : undefined
            }
          />
        </div>

        <div id="paquetes-listado" data-scroll-section className="scroll-mt-28">
        {loading ? (
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-sm lg:max-w-[330px] xl:max-w-[320px]">
                <div className="aspect-[4/3] premium-skeleton lg:aspect-[16/9]" />
                <div className="space-y-4 p-5 lg:space-y-3 lg:p-4">
                  <div className="h-4 w-32 rounded premium-skeleton" />
                  <div className="h-8 w-4/5 rounded premium-skeleton lg:h-6" />
                  <div className="h-16 rounded-xl premium-skeleton lg:h-10" />
                  <div className="h-12 rounded-xl premium-skeleton lg:h-9" />
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
              onClick={() => fetchPackages(selectedSlugs)}
              className="mt-5 rounded-xl"
            >
              {t("filters.retry")}
            </Button>
          </div>
        ) : packages.length === 0 && selectedSlugs.length === 0 ? (
          <div className="premium-enter mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
            <Gem className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              {t("packages.emptyTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              {t("packages.emptySubtitle")}
            </p>
          </div>
        ) : packages.length === 0 ? (
          <div className="premium-enter mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
            <Gem className="mx-auto h-10 w-10 text-[#B48A5A]" />
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
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5">
            {packages.map((item) => (
              <PublicProductCard
                key={item.id}
                href={packagePublicPath(item)}
                reserveHref={`/checkout/${item.id}?type=PACKAGE`}
                image={imageFor(item)}
                fallbackImage={fallbackImage}
                badge={getDynamicText(item, "category", language)}
                title={getDynamicText(item, "title", language)}
                description={getDynamicText(item, "shortDescription", language)}
                location={getDynamicText(item, "location", language)}
                price={formatMoneyByLanguage(item.basePrice, language)}
                meta={getDynamicText(item, "duration", language)}
                metaIcon="calendar"
                secondaryMeta={
                  <>
                    {t("shared.upTo")} {item.maxGuests}
                  </>
                }
                button={t("packages.view")}
                trackingLabel={`abrir_paquete_${item.id}`}
                trackingLocation="paquetes_list"
              />
            ))}
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
