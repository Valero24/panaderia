import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Headphones,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import ProductCarousel from "@/components/home/ProductCarousel";
import MoneyText from "@/components/MoneyText";
import TranslatedHomeProductCard from "@/components/home/TranslatedHomeProductCard";
import TranslatedText from "@/components/TranslatedText";
import TrackedLink from "@/components/TrackedLink";
import { apiUrl } from "@/lib/api";
import type { DynamicTranslations } from "@/lib/dynamic-translations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cartagena Tailored Travel",
  description:
    "Plan a premium trip to Cartagena with luxury villas, verified stays, private experiences and personalized travel assistance.",
  openGraph: {
    title: "Cartagena Tailored Travel",
    description:
      "Premium villas, private experiences and tailored packages in Cartagena, Colombia.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1600",
        width: 1600,
        height: 900,
        alt: "Luxury villa and travel experience in Cartagena",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cartagena Tailored Travel",
    description:
      "Premium villas, private experiences and tailored packages in Cartagena, Colombia.",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1600",
    ],
  },
};

type Property = {
  id: number;
  title: string;
  city?: string | null;
  area?: string | null;
  pricePerNight?: number | null;
  maxGuests?: number | null;
  maxCapacity?: number | null;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
  translations?: DynamicTranslations | null;
};

type Experience = {
  id: number;
  title: string;
  shortDescription?: string | null;
  location?: string | null;
  duration?: string | null;
  maxGuests?: number | null;
  basePrice?: number | null;
  mainImage?: string | null;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
  translations?: DynamicTranslations | null;
};

type PackageItem = {
  id: number;
  title: string;
  shortDescription?: string | null;
  location?: string | null;
  duration?: string | null;
  maxGuests?: number | null;
  basePrice?: number | null;
  mainImage?: string | null;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
  translations?: DynamicTranslations | null;
};

const stayFallback =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=900";
const experienceFallback =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=900";
const packageFallback =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=900";

function primaryImage(
  item: {
    mainImage?: string | null;
    images?: {
      url: string;
      mediaType?: "IMAGE" | "VIDEO" | string | null;
      isPrimary?: boolean;
      active?: boolean | null;
    }[];
  },
  fallback: string
) {
  const images = (item.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    item.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    fallback
  );
}

async function fetchList<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(apiUrl(path), {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function HomePage() {
  const [properties, experiences, packages] = await Promise.all([
    fetchList<Property>("/properties"),
    fetchList<Experience>("/experiences"),
    fetchList<PackageItem>("/packages"),
  ]);

  const featuredProperties = properties;
  const featuredExperiences = experiences;
  const featuredPackages = packages;
  const trustItems = [
    {
      icon: Headphones,
      title: "home.trustPersonalized",
      text: "home.trustPersonalizedText",
    },
    {
      icon: ShieldCheck,
      title: "home.trustVerified",
      text: "home.trustVerifiedText",
    },
    {
      icon: Sparkles,
      title: "home.trustPremium",
      text: "home.trustPremiumText",
    },
    {
      icon: MapPinned,
      title: "home.trustSupport",
      text: "home.trustSupportText",
    },
  ];

  return (
    <main className="bg-[#F8F6F1]">
      <section id="home-hero" data-scroll-section className="relative min-h-[72vh] overflow-hidden lg:min-h-[76vh]">
        <Image
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1600"
          alt="Luxury stay in Cartagena"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={75}
          className="absolute inset-0 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />

        <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl items-center px-5 py-14 sm:px-6 lg:min-h-[76vh] lg:px-8">
          <div className="max-w-5xl premium-reveal-slow">
            <p className="mb-5 max-w-3xl text-xs uppercase tracking-[0.28em] text-[#D4AF37] sm:tracking-[0.34em] md:text-sm">
              <TranslatedText k="home.eyebrow" />
            </p>

            <h1 className="max-w-5xl text-3xl font-bold leading-[1.08] text-white sm:text-4xl md:text-5xl md:leading-[1.04] lg:text-6xl">
              <TranslatedText k="home.titleLine1" />
              {" "}
              <br />
              <TranslatedText k="home.titleLine2" />
            </h1>

            <p className="mt-7 max-w-3xl text-base leading-7 text-white/85 sm:text-lg md:leading-8 lg:text-xl">
              <TranslatedText k="home.subtitle" />
            </p>

            <div className="mt-9 flex max-w-full flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="#alojamientos"
                trackingLabel="explorar_alojamientos"
                trackingLocation="home_hero"
                className="premium-soft-button inline-flex h-14 w-full max-w-full items-center justify-center rounded-full bg-[#0D2B52] px-6 text-center text-sm font-semibold text-white transition hover:bg-[#12396d] sm:w-auto sm:px-8"
              >
                <TranslatedText k="home.exploreProperties" />
              </TrackedLink>

              <TrackedLink
                href="/contacto"
                trackingLabel="planear_mi_viaje"
                trackingLocation="home_hero"
                className="premium-soft-button inline-flex h-14 w-full max-w-full items-center justify-center rounded-full border border-[#D4AF37]/60 bg-white/10 px-6 text-center text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto sm:px-8"
              >
                <TranslatedText k="home.planJourney" />
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      <ProductSection
        id="alojamientos"
        eyebrowKey="home.staysEyebrow"
        titleKey="properties.available"
        subtitleKey="properties.availableSubtitle"
        ctaHref="/alojamientos"
        ctaKey="home.viewAllProperties"
        trackingLabel="ver_todos_alojamientos"
      >
        {featuredProperties.map((property) => (
          <TranslatedHomeProductCard
            key={property.id}
            item={property}
            href={`/alojamientos/${property.id}`}
            reserveHref={`/checkout/${property.id}?type=PROPERTY`}
            image={primaryImage(property, stayFallback)}
            fallbackImage={stayFallback}
            badge={<TranslatedText k="properties.curated" />}
            locationFallback={[property.area, property.city].filter(Boolean).join(", ") || "Cartagena"}
            price={<MoneyText value={property.pricePerNight} />}
            meta={
              <>
                {property.maxCapacity || property.maxGuests || 1}{" "}
                <TranslatedText k="properties.guests" />
              </>
            }
            metaIcon="users"
            button={<TranslatedText k="properties.view" />}
            trackingLabel={`abrir_alojamiento_${property.id}`}
          />
        ))}
      </ProductSection>

      <ProductSection
        id="experiencias"
        eyebrowKey="experiences.eyebrow"
        titleKey="experiences.title"
        subtitleKey="experiences.subtitle"
        ctaHref="/experiencias"
        ctaKey="home.viewAllExperiences"
        trackingLabel="ver_todas_experiencias"
      >
        {featuredExperiences.map((experience) => (
          <TranslatedHomeProductCard
            key={experience.id}
            item={experience}
            href={`/experiencias/${experience.id}`}
            reserveHref={`/checkout/${experience.id}?type=EXPERIENCE`}
            image={primaryImage(experience, experienceFallback)}
            fallbackImage={experienceFallback}
            badge={<TranslatedText k="shared.premiumExperience" />}
            descriptionField="shortDescription"
            locationField="location"
            price={<MoneyText value={experience.basePrice} />}
            meta={
              experience.duration || (
                <TranslatedText k="shared.durationToCoordinate" />
              )
            }
            button={<TranslatedText k="experiences.view" />}
            trackingLabel={`abrir_experiencia_${experience.id}`}
          />
        ))}
      </ProductSection>

      <ProductSection
        id="paquetes"
        eyebrowKey="packages.eyebrow"
        titleKey="packages.title"
        subtitleKey="packages.subtitle"
        ctaHref="/paquetes"
        ctaKey="home.viewAllPackages"
        trackingLabel="ver_todos_paquetes"
      >
        {featuredPackages.map((item) => (
          <TranslatedHomeProductCard
            key={item.id}
            item={item}
            href={`/paquetes/${item.id}`}
            reserveHref={`/checkout/${item.id}?type=PACKAGE`}
            image={primaryImage(item, packageFallback)}
            fallbackImage={packageFallback}
            badge={<TranslatedText k="shared.premiumPackage" />}
            descriptionField="shortDescription"
            locationField="location"
            price={<MoneyText value={item.basePrice} />}
            meta={
              item.duration || (
                <TranslatedText k="shared.durationToCoordinate" />
              )
            }
            button={<TranslatedText k="packages.view" />}
            trackingLabel={`abrir_paquete_${item.id}`}
          />
        ))}
      </ProductSection>

      <section id="home-respaldo" data-scroll-section className="premium-scroll-reveal border-y border-[#D4AF37]/15 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
                <TranslatedText k="home.trustEyebrow" />
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#0D2B52] md:text-4xl">
                <TranslatedText k="home.trustTitle" />
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                <TranslatedText k="home.trustSubtitle" />
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="premium-hover-lift rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F1] p-5 shadow-sm transition duration-300 hover:bg-white"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0D2B52] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-[#0D2B52]">
                      <TranslatedText k={item.title as any} />
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      <TranslatedText k={item.text as any} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="home-cta" data-scroll-section className="premium-scroll-reveal bg-[#F8F6F1] px-6 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#0D2B52] px-6 py-12 text-white shadow-sm md:px-10 lg:px-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
                <TranslatedText k="contact.eyebrow" />
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold md:text-4xl">
                <TranslatedText k="home.ctaTitle" />
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/75">
                <TranslatedText k="home.ctaSubtitle" />
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <TrackedLink
                href="/contacto"
                trackingLabel="hablar_con_asesor"
                trackingLocation="home_final_cta"
                className="premium-soft-button inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-[#0D2B52] transition hover:bg-[#F8F6F1]"
              >
                <TranslatedText k="home.talkAdvisor" />
              </TrackedLink>
              <TrackedLink
                href="/contacto"
                trackingLabel="whatsapp_contacto"
                trackingLocation="home_final_cta"
                className="premium-soft-button inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <TranslatedText k="common.whatsapp" />
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductSection({
  id,
  eyebrowKey,
  titleKey,
  subtitleKey,
  ctaHref,
  ctaKey,
  trackingLabel,
  children,
}: {
  id: string;
  eyebrowKey: any;
  titleKey: any;
  subtitleKey: any;
  ctaHref: string;
  ctaKey: any;
  trackingLabel: string;
  children: ReactNode;
}) {
  return (
    <section id={id} data-scroll-section className="premium-scroll-reveal bg-[#F8F6F1] px-6 py-14 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              <TranslatedText k={eyebrowKey} />
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#0D2B52] md:text-4xl">
              <TranslatedText k={titleKey} />
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              <TranslatedText k={subtitleKey} />
            </p>
          </div>
          <TrackedLink
            href={ctaHref}
            trackingLabel={trackingLabel}
            trackingLocation={`home_${id}`}
            className="premium-soft-button inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-white px-5 text-sm font-semibold text-[#0D2B52] transition hover:border-[#B48A5A] hover:text-[#B48A5A]"
          >
            <TranslatedText k={ctaKey} />
            <ArrowRight className="h-4 w-4" />
          </TrackedLink>
        </div>

        {children && <ProductCarousel>{children}</ProductCarousel>}
      </div>
    </section>
  );
}

