"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";

const PublicFilterModal = dynamic(() => import("./PublicFilterModal"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0D2B52]/25 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="h-36 w-full animate-pulse rounded-t-[28px] border border-[#D4AF37]/20 bg-[#FFFDF8] shadow-2xl md:max-w-3xl md:rounded-[30px]" />
    </div>
  ),
});

export type PublicProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

export type PublicFilter = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  translations?: DynamicTranslations | null;
  icon?: string | null;
  category: string;
  appliesTo: PublicProductType | "ALL";
  count: number;
};

type PublicFilterPanelProps = {
  productType: PublicProductType;
  selectedSlugs: string[];
  onApply: (slugs: string[]) => void;
  resultLabel?: string;
};

export default function PublicFilterPanel({
  productType,
  selectedSlugs,
  onApply,
  resultLabel,
}: PublicFilterPanelProps) {
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<PublicFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(apiUrl(`/public-filters?type=${productType}`), {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || t("filters.loadError"));
        }

        if (!cancelled) {
          setFilters(Array.isArray(data) ? data.filter((item) => item.count > 0) : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError(t("filters.loadError"));
          setFilters([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, [productType, t]);

  const filtersBySlug = useMemo(() => {
    return new Map(filters.map((filter) => [filter.slug, filter]));
  }, [filters]);

  const activeFilters = useMemo(
    () =>
      selectedSlugs.map((slug) => {
        const filter = filtersBySlug.get(slug);

        return {
          slug,
          name: filter ? getDynamicText(filter, "name", language) : slug,
        };
      }),
    [filtersBySlug, language, selectedSlugs]
  );

  function removeActiveSlug(slug: string) {
    const next = selectedSlugs.filter((item) => item !== slug);
    onApply(next);
  }

  return (
    <>
      <div className="space-y-4 rounded-[28px] border border-[#D4AF37]/15 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {resultLabel && (
              <span className="font-semibold text-[#0D2B52]">{resultLabel}</span>
            )}
            {selectedSlugs.length > 0 && (
              <span className="ml-0 mt-1 block text-slate-500 sm:ml-3 sm:mt-0 sm:inline">
                {selectedSlugs.length} {t("filters.activeFilters")}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="h-11 rounded-full border-[#D4AF37]/40 bg-white px-5 text-[#0D2B52] shadow-sm hover:border-[#D4AF37]/70 hover:bg-[#FFFDF8]"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4 text-[#B48A5A]" />
            {t("filters.personalize")}
            {selectedSlugs.length > 0 ? ` (${selectedSlugs.length})` : ""}
          </Button>
        </div>

        {activeFilters.length > 0 && (
          <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#FFFDF8] p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
                  {t("filters.activeFilters")}
                </p>
                <p className="mt-1 text-sm font-medium text-[#0D2B52]">
                  {selectedSlugs.length} {t("filters.activeFilters")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onApply([])}
                className="w-fit rounded-full border border-[#D4AF37]/25 bg-white px-3 py-1.5 text-sm font-semibold text-[#B48A5A] transition hover:border-[#D4AF37]/60 hover:bg-[#F8F6F1]"
              >
                {t("filters.clearAll")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.slug}
                  type="button"
                  onClick={() => removeActiveSlug(filter.slug)}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white px-3 py-2 text-sm font-medium text-[#0D2B52] shadow-sm transition hover:-translate-y-0.5 hover:border-[#D4AF37]/70 hover:bg-[#FFFCF4] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  aria-label={`${t("filters.clear")} ${filter.name}`}
                >
                  <span className="truncate">{filter.name}</span>
                  <span className="rounded-full bg-[#D4AF37]/10 p-1 text-[#8A6A24]">
                    <X className="h-3.5 w-3.5 shrink-0" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {open && (
        <PublicFilterModal
          filters={filters}
          selectedSlugs={selectedSlugs}
          loading={loading}
          error={error}
          onApply={onApply}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
