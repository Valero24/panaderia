"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  Home,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicImage from "@/components/PublicImage";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";
import { trackViewContent } from "@/lib/analytics";

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
};

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=900";

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

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
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(apiUrl("/properties"), {
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

  useEffect(() => {
    fetchProperties();
  }, []);

  const visibleProperties = useMemo(() => {
    return properties.filter((property) => {
      return !["ARCHIVED", "MAINTENANCE"].includes(property.status || "");
    });
  }, [properties]);

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">
              {t("properties.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {t("properties.subtitle")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={fetchProperties}
            disabled={loading}
            className="h-11 rounded-xl border-[#D4AF37]/40 bg-white premium-focus"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("properties.refresh")}
          </Button>
        </div>

        {loading && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="aspect-[4/3] premium-skeleton" />
                <div className="space-y-4 p-5">
                  <div className="h-4 w-32 rounded premium-skeleton" />
                  <div className="h-8 w-4/5 rounded premium-skeleton" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-xl premium-skeleton" />
                    <div className="h-16 rounded-xl premium-skeleton" />
                    <div className="h-16 rounded-xl premium-skeleton" />
                  </div>
                  <div className="h-12 rounded-xl premium-skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-red-200 bg-white p-8 text-red-700 shadow-sm">
            <p className="font-semibold">{t("properties.loadErrorTitle")}</p>
            <p className="mt-2 text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={fetchProperties}
              className="mt-5 rounded-xl"
            >
              {t("properties.retry")}
            </Button>
          </div>
        )}

        {!loading && !error && visibleProperties.length === 0 && (
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

        {!loading && !error && visibleProperties.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => {
              const capacity = property.maxCapacity || property.maxGuests || 1;

              return (
                <Card
                  key={property.id}
                  className="premium-enter flex h-full flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <PublicImage
                      src={primaryImage(property)}
                      fallbackSrc={fallbackImage}
                      alt={property.title}
                      fill
                      sizes="(min-width: 1280px) 390px, (min-width: 768px) 50vw, 100vw"
                      quality={72}
                      optimizeWidth={900}
                      className="object-cover transition duration-500 hover:scale-105"
                    />
                    <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-[#0D2B52] shadow-sm backdrop-blur">
                      {t("properties.curated")}
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="min-h-[96px]">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-[#B48A5A]" />
                        <span className="line-clamp-1">{locationLabel(property)}</span>
                      </div>

                      <h2 className="mt-2 line-clamp-2 min-h-[64px] text-2xl font-semibold leading-8">
                        {property.title}
                      </h2>
                    </div>

                    <div className="mt-5 grid min-h-[82px] grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-[#F8F6F1] p-3">
                        <Users className="h-4 w-4 text-[#B48A5A]" />
                        <p className="mt-2 text-slate-600">{capacity}</p>
                        <p className="text-[11px] text-slate-400">{t("properties.guests")}</p>
                      </div>
                      <div className="rounded-xl bg-[#F8F6F1] p-3">
                        <BedDouble className="h-4 w-4 text-[#B48A5A]" />
                        <p className="mt-2 text-slate-600">
                          {property.bedrooms || 1}
                        </p>
                        <p className="text-[11px] text-slate-400">{t("properties.bedrooms")}</p>
                      </div>
                      <div className="rounded-xl bg-[#F8F6F1] p-3">
                        <Bath className="h-4 w-4 text-[#B48A5A]" />
                        <p className="mt-2 text-slate-600">
                          {property.bathrooms || 1}
                        </p>
                        <p className="text-[11px] text-slate-400">{t("properties.bathrooms")}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#D4AF37]/20 pt-5">
                      <div>
                        <p className="text-xs text-slate-500">{t("properties.from")}</p>
                        <p className="font-semibold text-[#0D2B52]">
                          {money(property.pricePerNight)}
                        </p>
                      </div>

                      <Button
                        asChild
                        className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                      >
                        <Link
                          href={`/alojamientos/${property.id}`}
                          onClick={() =>
                            trackViewContent("PROPERTY", property.id, property.title)
                          }
                        >
                          {t("properties.view")}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
