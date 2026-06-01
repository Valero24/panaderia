"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Filter, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";

export type PublicProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

type PublicFilter = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
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

const categoryOrder = [
  "AMENITY",
  "LOCATION_STYLE",
  "EXPERIENCE_STYLE",
  "TRAVEL_TYPE",
  "SERVICE_LEVEL",
  "INCLUDED",
  "CONDITION",
  "OTHER",
];

const categoryKeys: Record<string, string> = {
  AMENITY: "filters.category.amenity",
  LOCATION_STYLE: "filters.category.location",
  EXPERIENCE_STYLE: "filters.category.experienceStyle",
  TRAVEL_TYPE: "filters.category.travelType",
  SERVICE_LEVEL: "filters.category.serviceLevel",
  INCLUDED: "filters.category.included",
  CONDITION: "filters.category.condition",
  OTHER: "filters.category.other",
};

function normalizeSlugs(slugs: string[]) {
  return [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
}

export default function PublicFilterPanel({
  productType,
  selectedSlugs,
  onApply,
  resultLabel,
}: PublicFilterPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<PublicFilter[]>([]);
  const [draftSlugs, setDraftSlugs] = useState<string[]>(selectedSlugs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftSlugs(selectedSlugs);
  }, [selectedSlugs]);

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

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const groupedFilters = useMemo(() => {
    return categoryOrder
      .map((category) => ({
        category,
        filters: filters.filter((filter) => filter.category === category),
      }))
      .filter((group) => group.filters.length > 0);
  }, [filters]);

  const filtersBySlug = useMemo(() => {
    return new Map(filters.map((filter) => [filter.slug, filter]));
  }, [filters]);

  const activeFilters = useMemo(
    () =>
      selectedSlugs.map((slug) => ({
        slug,
        name: filtersBySlug.get(slug)?.name || slug,
      })),
    [filtersBySlug, selectedSlugs]
  );

  const quickFilters = useMemo(() => {
    return filters
      .filter((filter) => !selectedSlugs.includes(filter.slug))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [filters, selectedSlugs]);

  function toggleSlug(slug: string) {
    if (draftSlugs.includes(slug)) {
      setDraftSlugs(draftSlugs.filter((item) => item !== slug));
      return;
    }

    setDraftSlugs([...draftSlugs, slug]);
  }

  function applyFilters() {
    onApply(normalizeSlugs(draftSlugs));
    setOpen(false);
  }

  function clearFilters() {
    setDraftSlugs([]);
    onApply([]);
    setOpen(false);
  }

  function removeActiveSlug(slug: string) {
    const next = selectedSlugs.filter((item) => item !== slug);
    setDraftSlugs(next);
    onApply(next);
  }

  function applyQuickSlug(slug: string) {
    const next = normalizeSlugs([...selectedSlugs, slug]);
    setDraftSlugs(next);
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
                onClick={() => {
                  setDraftSlugs([]);
                  onApply([]);
                }}
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

        {quickFilters.length > 0 && (
          <div className="border-t border-[#D4AF37]/15 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
              {t("filters.quickFilters")}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => applyQuickSlug(filter.slug)}
                  className="rounded-full border border-[#D4AF37]/25 bg-white px-3 py-1.5 text-sm font-medium text-[#0D2B52] transition hover:border-[#D4AF37]/60 hover:bg-[#FFFDF8]"
                >
                  {filter.name}
                  <span className="ml-2 text-xs text-slate-400">{filter.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0D2B52]/35 p-0 backdrop-blur-sm md:items-center md:p-6">
          <button
            type="button"
            aria-label={t("gallery.close")}
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[#D4AF37]/20 bg-[#FFFDF8] shadow-2xl md:max-w-3xl md:rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-[#D4AF37]/20 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
                  {t("filters.filter")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0D2B52]">
                  {t("filters.personalize")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {t("filters.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#D4AF37]/20 bg-white p-2 text-[#0D2B52] transition hover:bg-[#F8F6F1]"
                aria-label={t("gallery.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white p-6 text-sm text-slate-500">
                  {t("filters.loading")}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                  {error}
                </div>
              ) : groupedFilters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white p-6 text-sm text-slate-500">
                  {t("filters.empty")}
                </div>
              ) : (
                <div className="space-y-7">
                  {groupedFilters.map((group) => (
                    <section key={group.category} className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0D2B52]">
                        {t(categoryKeys[group.category] || "filters.category.other")}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.filters.map((filter) => {
                          const selected = draftSlugs.includes(filter.slug);

                          return (
                            <button
                              key={filter.id}
                              type="button"
                              onClick={() => toggleSlug(filter.slug)}
                              className={`min-w-0 rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-[#0D2B52] bg-[#0D2B52] text-white shadow-sm"
                                  : "border-[#D4AF37]/20 bg-white text-[#0D2B52] hover:border-[#D4AF37]/60 hover:bg-[#F8F6F1]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 shrink-0 text-[#B48A5A]" />
                                    <p className="font-semibold">{filter.name}</p>
                                  </div>
                                  {filter.description && (
                                    <p
                                      className={`mt-2 line-clamp-2 text-sm leading-6 ${
                                        selected ? "text-white/75" : "text-slate-500"
                                      }`}
                                    >
                                      {filter.description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    selected
                                      ? "bg-white/15 text-white"
                                      : "bg-[#D4AF37]/10 text-[#8A6A24]"
                                  }`}
                                >
                                  {selected ? <Check className="h-3.5 w-3.5" /> : filter.count}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-[#D4AF37]/20 bg-[#FFFDF8] p-4 md:p-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="h-11 rounded-full border-[#D4AF37]/40 bg-white"
                >
                  {t("filters.clear")}
                </Button>
                <Button
                  type="button"
                  onClick={applyFilters}
                  className="h-11 rounded-full bg-[#0D2B52] px-6 text-white hover:bg-[#12396d]"
                >
                  {t("filters.apply")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
