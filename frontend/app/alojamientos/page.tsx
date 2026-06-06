"use client";

import { useEffect, useMemo, useState } from "react";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import PublicProductCard from "@/components/public-product-card";
import PublicFilterPanel from "@/components/public/PublicFilterPanel";
import PublicJourneyHeader from "@/components/public/PublicJourneyHeader";
import { apiUrl } from "@/lib/api";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";
import {
  buildFeaturedCollections,
  type PublicFeature,
} from "@/lib/public-feature-collections";
import { useTranslation } from "@/context/LanguageContext";

type PropertyImage = {
  id?: number;
  url: string;
  mediaType?: "IMAGE" | "VIDEO" | string | null;
  isPrimary?: boolean;
  active?: boolean | null;
};

type Property = {
  id: number;
  title: string;
  city?: string | null;
  area?: string | null;
  address?: string | null;
  pricePerNight?: number | null;
  maxGuests?: number | null;
  maxCapacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status?: "DRAFT" | "ACTIVE" | "FEATURED" | "MAINTENANCE" | "ARCHIVED";
  images?: PropertyImage[];
  translations?: DynamicTranslations | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=900";

function primaryImage(property: Property) {
  const images = (property.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );
  const primary = images.find((image) => image.isPrimary);

  return primary?.url || images[0]?.url || fallbackImage;
}

function locationLabel(property: Property) {
  return [property.area, property.city].filter(Boolean).join(", ") || "Cartagena";
}

export default function PublicPropertiesPage() {
  const { language, t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<PublicFeature[]>([]);

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
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.pushState({}, "", nextUrl);
  }

  async function fetchProperties(features = selectedSlugs) {
    try {
      setLoading(true);
      setError("");

      const query = features.length > 0 ? `?features=${features.join(",")}` : "";
      const res = await fetch(apiUrl(`/properties${query}`), {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t("properties.loadErrorTitle"));
      }

      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : t("properties.connectionError")
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableFeatures() {
    try {
      const response = await fetch(apiUrl("/public-filters?type=PROPERTY"), {
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
    fetchProperties(selectedSlugs);
  }, [selectedSlugs.join(",")]);

  const visibleProperties = useMemo(() => {
    return properties.filter((property) => {
      return !["ARCHIVED", "MAINTENANCE"].includes(property.status || "");
    });
  }, [properties]);

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
      <section id="alojamientos-hero" data-scroll-section className="premium-reveal mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <PublicJourneyHeader
          eyebrow={t("home.eyebrow")}
          title={t("listing.property.heroTitle")}
          subtitle={t("listing.property.heroSubtitle")}
          tone="property"
          customizeLabel={t("filters.personalize")}
          advisorLabel={t("filters.talkAdvisor")}
          resultLabel={
            !loading && !error
              ? `${visibleProperties.length} ${t("properties.availableCount")}`
              : undefined
          }
          highlights={[
            t("listing.property.highlight1"),
            t("listing.property.highlight2"),
            t("listing.property.highlight3"),
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
            productType="PROPERTY"
            selectedSlugs={selectedSlugs}
            onApply={(slugs) => {
              setSelectedSlugs(slugs);
              updateFeatureUrl(slugs);
            }}
            resultLabel={
              !loading && !error
                ? `${visibleProperties.length} ${t("properties.availableCount")}`
                : undefined
            }
          />
        </div>

        <div id="alojamientos-listado" data-scroll-section className="scroll-mt-28">
        {loading && (
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-sm lg:max-w-[330px] xl:max-w-[320px]"
              >
                <div className="aspect-[4/3] premium-skeleton lg:aspect-[16/9]" />
                <div className="space-y-4 p-5 lg:space-y-3 lg:p-4">
                  <div className="h-4 w-32 rounded premium-skeleton" />
                  <div className="h-8 w-4/5 rounded premium-skeleton lg:h-6" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-xl premium-skeleton lg:h-10" />
                    <div className="h-16 rounded-xl premium-skeleton lg:h-10" />
                    <div className="h-16 rounded-xl premium-skeleton lg:h-10" />
                  </div>
                  <div className="h-12 rounded-xl premium-skeleton lg:h-9" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-red-200 bg-white p-8 text-red-700 shadow-sm">
            <p className="font-semibold">{t("filters.optionsLoadError")}</p>
            <p className="mt-2 text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchProperties(selectedSlugs)}
              className="mt-5 rounded-xl"
            >
              {t("filters.retry")}
            </Button>
          </div>
        )}

        {!loading && !error && visibleProperties.length === 0 && selectedSlugs.length === 0 && (
          <div className="mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-10 text-center shadow-sm">
            <Home className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              {t("properties.emptyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              {t("properties.emptySubtitle")}
            </p>
          </div>
        )}

        {!loading && !error && visibleProperties.length === 0 && selectedSlugs.length > 0 && (
          <div className="mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-10 text-center shadow-sm">
            <Home className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              {t("filters.noExactTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
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
        )}

        {!loading && !error && visibleProperties.length > 0 && (
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5">
            {visibleProperties.map((property) => {
              const capacity = property.maxCapacity || property.maxGuests || 1;

              return (
                <PublicProductCard
                  key={property.id}
                  href={`/alojamientos/${property.id}`}
                  reserveHref={`/checkout/${property.id}?type=PROPERTY`}
                  image={primaryImage(property)}
                  fallbackImage={fallbackImage}
                  badge={t("properties.curated")}
                  title={getDynamicText(property, "title", language)}
                  description={
                    getDynamicText(property, "address", language, property.address) ||
                    t("shared.validationAssisted")
                  }
                  location={
                    [
                      getDynamicText(property, "area", language, property.area),
                      getDynamicText(property, "city", language, property.city),
                    ]
                      .filter(Boolean)
                      .join(", ") || "Cartagena"
                  }
                  price={formatMoneyByLanguage(property.pricePerNight, language)}
                  meta={`${property.bedrooms || 1} ${t("properties.bedrooms")} · ${
                    property.bathrooms || 1
                  } ${t("properties.bathrooms")}`}
                  secondaryMeta={`${capacity} ${t("properties.guests")}`}
                  metaIcon="users"
                  button={t("properties.view")}
                  trackingLabel={`abrir_alojamiento_${property.id}`}
                  trackingLocation="alojamientos_list"
                />
              );
            })}
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
