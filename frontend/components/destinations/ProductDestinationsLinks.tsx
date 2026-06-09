"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";
import {
  getDynamicText,
  getLocalizedSlug,
  type DynamicTranslations,
} from "@/lib/dynamic-translations";
import { localizedRoutePath } from "@/lib/i18n-routes";

type DestinationLinkItem = {
  id: number;
  name: string;
  slug: string;
  location?: string | null;
  translations?: DynamicTranslations | null;
  translatedSlugs?: Record<string, string | null> | null;
};

export default function ProductDestinationsLinks({
  destinations,
}: {
  destinations?: DestinationLinkItem[] | null;
}) {
  const { language } = useTranslation();
  const items = Array.isArray(destinations)
    ? destinations.filter((item) => item?.slug && item?.name)
    : [];

  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-[#F8F6F2] p-3 text-[#B68D40]">
          <MapPinned className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#B68D40]">
            Enlaces internos
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#0D2B52]">
            Destinos relacionados
          </h2>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((destination) => (
          <Link
            key={destination.id}
            href={localizedRoutePath(
              "destination",
              language,
              getLocalizedSlug(destination, language, destination.slug)
            )}
            className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#F8F6F2] px-4 py-2 text-sm font-semibold text-[#0D2B52] transition hover:border-[#0D2B52] hover:bg-[#0D2B52] hover:text-white"
          >
            {getDynamicText(destination, "name", language)}
          </Link>
        ))}
      </div>
    </section>
  );
}
