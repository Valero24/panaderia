"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ExternalLink, MapPin, MessageCircle } from "lucide-react";

import LazyProductCarousel from "@/components/home/LazyProductCarousel";
import PublicProductCard from "@/components/public-product-card";
import PublicImage from "@/components/PublicImage";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import {
  getDynamicText,
  type DynamicTranslations,
} from "@/lib/dynamic-translations";
import { getTranslatedFaq } from "@/lib/faq";
import { formatMoneyByLanguage } from "@/lib/currency";
import {
  experiencePublicPath,
  packagePublicPath,
  propertyPublicPath,
} from "@/lib/product-url";
import { localizedRoutePath } from "@/lib/i18n-routes";

type RelatedProduct = {
  id: number;
  title: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  area?: string | null;
  city?: string | null;
  address?: string | null;
  location?: string | null;
  category?: string | null;
  duration?: string | null;
  maxGuests?: number | null;
  maxCapacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  pricePerNight?: number | null;
  basePrice?: number | null;
  mainImage?: string | null;
  images?: { url?: string | null; isPrimary?: boolean | null }[];
  translations?: DynamicTranslations | null;
};

type Destination = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  heroImage?: string | null;
  gallery?: unknown;
  location?: string | null;
  isFeatured?: boolean | null;
  translations?: DynamicTranslations | null;
  properties?: RelatedProduct[];
  experiences?: RelatedProduct[];
  packages?: RelatedProduct[];
};

type DestinationMediaItem = {
  type: "IMAGE" | "VIDEO";
  url: string;
  title: string | null;
  description: string | null;
  isPrimary: boolean;
};

function normalizeGallery(value: unknown) {
  if (typeof value === "string") {
    try {
      return normalizeGallery(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          type: "IMAGE" as const,
          url: item.trim(),
          title: null,
          description: null,
          isPrimary: false,
        };
      }
      if (item && typeof item === "object") {
        const source = item as {
          type?: string | null;
          url?: string | null;
          title?: string | null;
          description?: string | null;
          isPrimary?: boolean | null;
        };
        return {
          type: source.type === "VIDEO" ? "VIDEO" as const : "IMAGE" as const,
          url: String(source.url || "").trim(),
          title: source.title || null,
          description: source.description || null,
          isPrimary: Boolean(source.isPrimary),
        };
      }
      return null;
    })
    .filter((item): item is DestinationMediaItem => Boolean(item?.url));
}

function videoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
  } catch {
    return "";
  }

  return url;
}

function primaryImage(item: RelatedProduct, fallback: string) {
  return (
    item.mainImage ||
    item.images?.find((image) => image.isPrimary)?.url ||
    item.images?.[0]?.url ||
    fallback
  );
}

function RelatedProductsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
        Cartagena Tailored Travel
      </p>
      <h2 className="mt-3 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DestinationDetailContent({
  destination,
}: {
  destination: Destination;
}) {
  const { language, t } = useTranslation();
  const name = getDynamicText(destination, "name", language);
  const shortDescription = getDynamicText(
    destination,
    "shortDescription",
    language
  );
  const description = getDynamicText(destination, "description", language);
  const seoContent = getDynamicText(destination, "seoContent", language);
  const location = getDynamicText(destination, "location", language);
  const faqs = getTranslatedFaq(destination, language, destination.faq);
  const gallery = normalizeGallery(destination.gallery);
  const properties = destination.properties || [];
  const experiences = destination.experiences || [];
  const packages = destination.packages || [];
  const heroImage =
    destination.heroImage ||
    gallery.find((item) => item.type === "IMAGE" && item.isPrimary)?.url ||
    gallery.find((item) => item.type === "IMAGE")?.url ||
    "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1600";

  return (
    <main className="bg-[#F8F6F2] text-[#0D2B52]">
      <section className="relative min-h-[520px] overflow-hidden">
        <PublicImage
          src={heroImage}
          alt={name}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={68}
          optimizeWidth={1600}
          className="absolute inset-0 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061A32]/90 via-[#061A32]/60 to-[#061A32]/15" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-6 py-16 text-white sm:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-200"
          >
            <Link
              href={localizedRoutePath("home", language)}
              className="transition hover:text-[#D4AF37]"
            >
              {t("destinations.breadcrumbHome")}
            </Link>
            <ChevronRight className="h-4 w-4 text-[#D4AF37]" />
            <Link
              href={localizedRoutePath("destination", language)}
              className="transition hover:text-[#D4AF37]"
            >
              {t("nav.destinations")}
            </Link>
            <ChevronRight className="h-4 w-4 text-[#D4AF37]" />
            <span className="max-w-full truncate font-semibold text-white">
              {name}
            </span>
          </nav>
          <Link
            href={localizedRoutePath("destination", language)}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("destinations.back")}
          </Link>
          <p className="text-xs uppercase tracking-[0.35em] text-[#D4AF37]">
            {destination.isFeatured ? t("destinations.featured") : t("destinations.eyebrow")}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {name}
          </h1>
          {shortDescription && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-100">
              {shortDescription}
            </p>
          )}
          {location && (
            <p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-[#D4AF37]" />
              {location}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {description && (
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                  {t("destinations.about")}
                </p>
                <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {description}
                </div>
              </section>
            )}

            {seoContent && (
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                  {t("destinations.seoContent")}
                </p>
                <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {seoContent}
                </div>
              </section>
            )}

            {properties.length > 0 && (
              <RelatedProductsSection
                title="Alojamientos en este destino"
                subtitle="Estadias conectadas con este destino para planear una visita con asesoria personalizada."
              >
                <LazyProductCarousel>
                  {properties.map((property) => {
                    const fallback =
                      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=70&w=900";
                    const capacity =
                      property.maxCapacity || property.maxGuests || 1;

                    return (
                      <PublicProductCard
                        key={property.id}
                        href={propertyPublicPath(property, language)}
                        reserveHref={`/checkout/${property.id}?type=PROPERTY`}
                        image={primaryImage(property, fallback)}
                        fallbackImage={fallback}
                        badge={t("properties.curated")}
                        title={getDynamicText(property, "title", language)}
                        description={
                          getDynamicText(
                            property,
                            "shortDescription",
                            language,
                            property.address || property.description
                          ) || t("shared.validationAssisted")
                        }
                        location={
                          [
                            getDynamicText(property, "area", language, property.area),
                            getDynamicText(property, "city", language, property.city),
                          ]
                            .filter(Boolean)
                            .join(", ") || "Cartagena"
                        }
                        price={formatMoneyByLanguage(
                          property.pricePerNight || property.basePrice,
                          language
                        )}
                        meta={`${property.bedrooms || 1} ${t("properties.bedrooms")} · ${
                          property.bathrooms || 1
                        } ${t("properties.bathrooms")}`}
                        secondaryMeta={`${capacity} ${t("properties.guests")}`}
                        metaIcon="users"
                        button={t("properties.view")}
                        trackingLabel={`destino_alojamiento_${property.id}`}
                        trackingLocation="destino_detalle"
                      />
                    );
                  })}
                </LazyProductCarousel>
              </RelatedProductsSection>
            )}

            {experiences.length > 0 && (
              <RelatedProductsSection
                title="Experiencias en este destino"
                subtitle="Planes privados y experiencias curadas para descubrir este destino con acompanamiento experto."
              >
                <LazyProductCarousel>
                  {experiences.map((item) => {
                    const fallback =
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=70&w=900";

                    return (
                      <PublicProductCard
                        key={item.id}
                        href={experiencePublicPath(item, language)}
                        reserveHref={`/checkout/${item.id}?type=EXPERIENCE`}
                        image={primaryImage(item, fallback)}
                        fallbackImage={fallback}
                        badge={getDynamicText(item, "category", language)}
                        title={getDynamicText(item, "title", language)}
                        description={getDynamicText(
                          item,
                          "shortDescription",
                          language
                        )}
                        location={getDynamicText(item, "location", language)}
                        price={formatMoneyByLanguage(item.basePrice, language)}
                        meta={getDynamicText(item, "duration", language)}
                        secondaryMeta={
                          <>
                            {t("shared.upTo")} {item.maxGuests || 1}
                          </>
                        }
                        button={t("experiences.view")}
                        trackingLabel={`destino_experiencia_${item.id}`}
                        trackingLocation="destino_detalle"
                      />
                    );
                  })}
                </LazyProductCarousel>
              </RelatedProductsSection>
            )}

            {packages.length > 0 && (
              <RelatedProductsSection
                title="Paquetes recomendados en este destino"
                subtitle="Viajes completos que combinan estadia, experiencias y servicios premium alrededor de este destino."
              >
                <LazyProductCarousel>
                  {packages.map((item) => {
                    const fallback =
                      "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&q=70&w=900";

                    return (
                      <PublicProductCard
                        key={item.id}
                        href={packagePublicPath(item, language)}
                        reserveHref={`/checkout/${item.id}?type=PACKAGE`}
                        image={primaryImage(item, fallback)}
                        fallbackImage={fallback}
                        badge={getDynamicText(item, "category", language)}
                        title={getDynamicText(item, "title", language)}
                        description={getDynamicText(
                          item,
                          "shortDescription",
                          language
                        )}
                        location={getDynamicText(item, "location", language)}
                        price={formatMoneyByLanguage(item.basePrice, language)}
                        meta={getDynamicText(item, "duration", language)}
                        metaIcon="calendar"
                        secondaryMeta={
                          <>
                            {t("shared.upTo")} {item.maxGuests || 1}
                          </>
                        }
                        button={t("packages.view")}
                        trackingLabel={`destino_paquete_${item.id}`}
                        trackingLocation="destino_detalle"
                      />
                    );
                  })}
                </LazyProductCarousel>
              </RelatedProductsSection>
            )}

            {gallery.length > 0 && (
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                  {t("destinations.gallery")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {gallery.slice(0, 6).map((media, index) => (
                    <div
                      key={`${media.url}-${index}`}
                      className="relative h-56 overflow-hidden rounded-2xl bg-slate-100"
                    >
                      {media.type === "VIDEO" ? (
                        videoEmbedUrl(media.url) ? (
                          <iframe
                            src={videoEmbedUrl(media.url)}
                            title={media.title || `${name} video ${index + 1}`}
                            className="h-full w-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0D2B52] p-6 text-center text-white"
                          >
                            <ExternalLink className="h-6 w-6 text-[#D4AF37]" />
                            <span className="text-sm font-semibold">
                              Ver video del destino
                            </span>
                          </a>
                        )
                      ) : (
                        <PublicImage
                          src={media.url}
                          alt={media.title || `${name} ${index + 1}`}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          quality={68}
                          optimizeWidth={900}
                          className="object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                  {t("destinations.faq")}
                </p>
                <div className="mt-4 space-y-3">
                  {faqs.map((faq, index) => (
                    <details
                      key={`${faq.question}-${index}`}
                      className="rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F1] p-4"
                    >
                      <summary className="cursor-pointer text-sm font-semibold text-[#0D2B52]">
                        {faq.question}
                      </summary>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
              Cartagena Tailored Travel
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              {t("destinations.ctaTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {t("destinations.ctaText")}
            </p>
            <Button
              asChild
              className="mt-5 w-full rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]"
            >
              <Link href="/contacto">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("destinations.ctaButton")}
              </Link>
            </Button>
          </aside>
        </div>
      </section>
    </main>
  );
}
