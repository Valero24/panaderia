"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import type { PublicFilter } from "./PublicFilterPanel";

type PublicFilterModalProps = {
  filters: PublicFilter[];
  selectedSlugs: string[];
  loading: boolean;
  error: string;
  onApply: (slugs: string[]) => void;
  onClose: () => void;
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

export default function PublicFilterModal({
  filters,
  selectedSlugs,
  loading,
  error,
  onApply,
  onClose,
}: PublicFilterModalProps) {
  const { t } = useTranslation();
  const [draftSlugs, setDraftSlugs] = useState<string[]>(selectedSlugs);

  useEffect(() => {
    setDraftSlugs(selectedSlugs);
  }, [selectedSlugs]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const groupedFilters = useMemo(() => {
    return categoryOrder
      .map((category) => ({
        category,
        filters: filters.filter((filter) => filter.category === category),
      }))
      .filter((group) => group.filters.length > 0);
  }, [filters]);

  function toggleSlug(slug: string) {
    if (draftSlugs.includes(slug)) {
      setDraftSlugs(draftSlugs.filter((item) => item !== slug));
      return;
    }

    setDraftSlugs([...draftSlugs, slug]);
  }

  function applyFilters() {
    onApply(normalizeSlugs(draftSlugs));
    onClose();
  }

  function clearFilters() {
    setDraftSlugs([]);
    onApply([]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0D2B52]/35 p-0 backdrop-blur-sm md:items-center md:p-6">
      <button
        type="button"
        aria-label={t("gallery.close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
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
            onClick={onClose}
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
  );
}
