import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  Headphones,
  MapPin,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import ProductCarousel from "@/components/home/ProductCarousel";
import PublicImage from "@/components/PublicImage";
import TranslatedText from "@/components/TranslatedText";
import TrackedLink from "@/components/TrackedLink";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";

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
};

const stayFallback =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=900";
const experienceFallback =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=900";
const packageFallback =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=900";

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

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
      <section className="relative min-h-[72vh] overflow-hidden lg:min-h-[76vh]">
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

        <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl items-center px-6 py-14 lg:min-h-[76vh] lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs uppercase tracking-[0.4em] text-[#D4AF37] md:text-sm">
              <TranslatedText k="home.eyebrow" />
            </p>

            <h1 className="text-5xl font-bold leading-[0.98] text-white md:text-7xl">
              <TranslatedText k="home.titleLine1" />
              <br />
              <TranslatedText k="home.titleLine2" />
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/85 md:text-xl">
              <TranslatedText k="home.subtitle" />
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="#alojamientos"
                trackingLabel="explorar_alojamientos"
                trackingLocation="home_hero"
                className="inline-flex h-14 items-center justify-center rounded-full bg-[#0D2B52] px-8 text-sm font-semibold text-white transition hover:bg-[#12396d]"
              >
                <TranslatedText k="home.exploreProperties" />
              </TrackedLink>

              <TrackedLink
                href="/contacto"
                trackingLabel="planear_mi_viaje"
                trackingLocation="home_hero"
                className="inline-flex h-14 items-center justify-center rounded-full border border-[#D4AF37]/60 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
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
          <ProductCard
            key={property.id}
            href={`/alojamientos/${property.id}`}
            image={primaryImage(property, stayFallback)}
            fallbackImage={stayFallback}
            badge={<TranslatedText k="properties.curated" />}
            title={cleanPublicCopy(property.title)}
            location={[property.area, property.city].filter(Boolean).join(", ") || "Cartagena"}
            price={money(property.pricePerNight)}
            meta={
              <>
                {property.maxCapacity || property.maxGuests || 1}{" "}
                <TranslatedText k="properties.guests" />
              </>
            }
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
          <ProductCard
            key={experience.id}
            href={`/experiencias/${experience.id}`}
            image={primaryImage(experience, experienceFallback)}
            fallbackImage={experienceFallback}
            badge={<TranslatedText k="shared.premiumExperience" />}
            title={cleanPublicCopy(experience.title)}
            location={experience.location || "Cartagena"}
            price={money(experience.basePrice)}
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
          <ProductCard
            key={item.id}
            href={`/paquetes/${item.id}`}
            image={primaryImage(item, packageFallback)}
            fallbackImage={packageFallback}
            badge={<TranslatedText k="shared.premiumPackage" />}
            title={cleanPublicCopy(item.title)}
            location={item.location || "Cartagena"}
            price={money(item.basePrice)}
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

      <section className="border-y border-[#D4AF37]/15 bg-white">
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
                    className="rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F1] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
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

      <section className="bg-[#F8F6F1] px-6 py-14 lg:px-8 lg:py-16">
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
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-[#0D2B52] transition hover:bg-[#F8F6F1]"
              >
                <TranslatedText k="home.talkAdvisor" />
              </TrackedLink>
              <TrackedLink
                href="/contacto"
                trackingLabel="whatsapp_contacto"
                trackingLocation="home_final_cta"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
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
    <section id={id} className="bg-[#F8F6F1] px-6 py-14 lg:px-8 lg:py-16">
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
            className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-white px-5 text-sm font-semibold text-[#0D2B52] transition hover:border-[#B48A5A] hover:text-[#B48A5A]"
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

function ProductCard({
  href,
  image,
  fallbackImage,
  badge,
  title,
  location,
  price,
  meta,
  button,
  trackingLabel,
}: {
  href: string;
  image: string;
  fallbackImage: string;
  badge: ReactNode;
  title: string;
  location: string;
  price: string;
  meta: ReactNode;
  button: ReactNode;
  trackingLabel: string;
}) {
  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <TrackedLink
        href={href}
        trackingLabel={trackingLabel}
        trackingLocation="home_product_card"
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          <PublicImage
            src={image}
            fallbackSrc={fallbackImage}
            alt={title}
            fill
            sizes="(min-width: 1280px) 390px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            quality={72}
            optimizeWidth={900}
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-[#0D2B52] shadow-sm backdrop-blur">
            {badge}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="min-h-[104px]">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-[#B48A5A]" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 min-h-[64px] text-2xl font-semibold leading-8 text-[#0D2B52]">
              {title}
            </h3>
          </div>

          <div className="mt-5 flex min-h-[76px] flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F8F6F1] px-3 py-2">
              <Clock className="h-4 w-4 text-[#B48A5A]" />
              <span className="line-clamp-1">{meta}</span>
            </span>
            <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F8F6F1] px-3 py-2">
              <Users className="h-4 w-4 text-[#B48A5A]" />
              <TranslatedText k="shared.validationAssisted" />
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#D4AF37]/20 pt-5">
            <div>
              <p className="text-xs text-slate-500">
                <TranslatedText k="properties.from" />
              </p>
              <p className="font-semibold text-[#0D2B52]">{price}</p>
            </div>
            <span className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0D2B52] px-4 text-sm font-semibold text-white transition group-hover:bg-[#12396d]">
              {button}
            </span>
          </div>
        </div>
      </TrackedLink>
    </article>
  );
}
