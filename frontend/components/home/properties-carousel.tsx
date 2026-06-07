"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { trackViewContent } from "@/lib/analytics";
import { propertyPublicPath } from "@/lib/product-url";

type Property = {
  id: number;
  slug?: string | null;
  title: string;
  city: string;
  area: string;
  pricePerNight: number;
  images?: {
    url: string;
  }[];
};

type Props = {
  properties: Property[];
};

export default function PropertiesCarousel({
  properties,
}: Props) {
  const { t } = useTranslation();
  const containerRef =
    useRef<HTMLDivElement>(null);

  const useCarousel =
    properties.length >= 3;

  const scroll = (
    direction: "left" | "right"
  ) => {
    if (!containerRef.current) return;

    const card =
      containerRef.current.querySelector(
        ".property-card-wrapper"
      ) as HTMLElement;

    if (!card) return;

    const cardWidth =
      card.offsetWidth + 24;

    containerRef.current.scrollBy({
      left:
        direction === "left"
          ? -cardWidth
          : cardWidth,
      behavior: "smooth",
    });
  };

  if (!properties?.length) {
    return (
      <section className="bg-[#F8F6F1] py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#B68D40]">
            {t("home.staysEyebrow")}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-[#0D2B52]">
            {t("properties.available")}
          </h2>

          <p className="mt-4 text-slate-600">
            {t("properties.emptySubtitle")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F8F6F1] py-20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
        {/* HEADER */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#B68D40]">
              {t("home.staysEyebrow")}
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#0D2B52]">
              {t("properties.available")}
            </h2>

            <p className="mt-3 text-slate-600 max-w-2xl">
              {t("properties.availableSubtitle")}
            </p>
          </div>

          {useCarousel && (
            <div className="hidden md:flex gap-3">
              <button
                onClick={() => scroll("left")}
                className="h-10 w-10 rounded-full border border-[#D4AF37]/20 bg-white text-[#0D2B52] hover:bg-[#0D2B52] hover:text-white transition"
              >
                <ChevronLeft className="mx-auto h-4 w-4" />
              </button>

              <button
                onClick={() => scroll("right")}
                className="h-10 w-10 rounded-full border border-[#D4AF37]/20 bg-white text-[#0D2B52] hover:bg-[#0D2B52] hover:text-white transition"
              >
                <ChevronRight className="mx-auto h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {!useCarousel && (
          <div className="flex justify-center gap-6 flex-wrap">
            {properties.map((property) => (
              <div
                key={property.id}
                className="w-[280px]"
              >
                <PropertyCard
                  property={property}
                />
              </div>
            ))}
          </div>
        )}

        {useCarousel && (
          <div
            ref={containerRef}
            className="
              flex
              gap-6
              overflow-x-auto
              scroll-smooth
              snap-x
              snap-mandatory
              pb-4
              no-scrollbar
            "
          >
            {properties.map((property) => (
              <div
                key={property.id}
                className="
                  property-card-wrapper
                  snap-start
                  flex-shrink-0
                  w-[260px]
                  md:w-[280px]
                  lg:w-[300px]
                "
              >
                <PropertyCard
                  property={property}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PropertyCard({
  property,
}: {
  property: Property;
}) {
  const { t } = useTranslation();
  const image =
    property.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1800";

  return (
    <Link
      href={propertyPublicPath(property)}
      className="group block"
      onClick={() =>
        trackViewContent("PROPERTY", property.id, property.title)
      }
    >
      <article
        className="
          overflow-hidden
          rounded-3xl
          border
          border-[#D4AF37]/15
          bg-white
          shadow-sm
          hover:shadow-xl
          transition
        "
      >
        <div className="relative h-[180px] overflow-hidden">
          <img
            src={image}
            alt={property.title}
            className="
              h-full
              w-full
              object-cover
              transition
              duration-700
              group-hover:scale-105
            "
          />
        </div>

        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#B68D40]">
            {t("properties.from")}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-[#0D2B52]">
            ${property.pricePerNight}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {t("properties.perNight")}
          </p>

          <h4 className="mt-4 text-lg font-bold text-[#0D2B52] line-clamp-2">
            {property.title}
          </h4>

          <p className="mt-2 text-sm text-slate-600 line-clamp-1">
            {property.area}, {property.city}
          </p>

          <div className="mt-5">
            <div
              className="
                h-10
                rounded-xl
                bg-[#0D2B52]
                hover:bg-[#12396d]
                transition
                flex
                items-center
                justify-center
                text-white
                text-sm
                font-medium
              "
            >
              {t("properties.explore")}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
