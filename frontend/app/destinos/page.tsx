import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, MessageCircle, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import JsonLd from "@/components/JsonLd";
import TranslatedDynamicText from "@/components/TranslatedDynamicText";
import TranslatedText from "@/components/TranslatedText";
import { apiUrl } from "@/lib/api";
import {
  getLocalizedSlug,
  type DynamicTranslations,
} from "@/lib/dynamic-translations";
import { optimizedUnsplashUrl } from "@/lib/image-url";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { buildCollectionPageSchema } from "@/lib/schema";
import type { Language } from "@/i18n";

export const revalidate = 600;

type Destination = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  location?: string | null;
  isFeatured?: boolean | null;
  translations?: DynamicTranslations | null;
  translatedSlugs?: Record<string, string | null> | null;
};

const collectionSchema = buildCollectionPageSchema({
  name: "Destinations in Cartagena | Cartagena Tailored Travel",
  description:
    "Explore Cartagena neighborhoods, islands and tourist areas to plan your stay and experiences.",
  url: "/destinos",
  image:
    "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
});

async function getDestinations(): Promise<Destination[]> {
  try {
    const response = await fetch(apiUrl("/destinations"), {
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function DestinosPage({
  locale = "es",
  includeSchema = true,
}: {
  locale?: Language;
  includeSchema?: boolean;
} = {}) {
  const destinations = await getDestinations();

  return (
    <main className="bg-[#F8F6F2] text-[#0D2B52]">
      {includeSchema ? <JsonLd data={collectionSchema} /> : null}
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:py-20">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[#B68D40]">
            <TranslatedText k="destinations.eyebrow" />
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            <TranslatedText k="destinations.title" />
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 lg:text-lg">
            <TranslatedText k="destinations.subtitle" />
          </p>
        </div>

        {destinations.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#D4AF37]/30 bg-white p-10 text-center text-slate-500">
            <TranslatedText k="destinations.empty" />
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {destinations.map((destination) => {
              const image =
                destination.heroImage ||
                "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=900";

              return (
                <Link
                  key={destination.id}
                  href={localizedRoutePath(
                    "destination",
                    locale,
                    getLocalizedSlug(destination, locale, destination.slug)
                  )}
                  className="group overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#0D2B52] via-[#143A66] to-[#B68D40]">
                    {destination.heroImage ? (
                      <Image
                        src={optimizedUnsplashUrl(image, 640, 68)}
                        alt={destination.name}
                        fill
                        sizes="(min-width: 1280px) 390px, (min-width: 640px) 50vw, 100vw"
                        quality={68}
                        loading="lazy"
                        fetchPriority="low"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-white">
                        <div>
                          <MapPin className="mx-auto h-8 w-8 text-[#D4AF37]" />
                          <p className="mt-3 text-sm uppercase tracking-[0.28em]">
                            Cartagena
                          </p>
                        </div>
                      </div>
                    )}
                    {destination.isFeatured && (
                      <Badge className="absolute left-4 top-4 bg-white text-[#0D2B52]">
                        <Star className="h-3 w-3 text-[#B68D40]" />
                        <TranslatedText k="destinations.featured" />
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 lg:p-5">
                    {destination.location && (
                      <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-[#B68D40]" />
                        <TranslatedDynamicText
                          entity={destination}
                          field="location"
                        />
                      </p>
                    )}
                    <h2 className="mt-3 text-xl font-bold leading-tight">
                      <TranslatedDynamicText entity={destination} field="name" />
                    </h2>
                    {destination.shortDescription && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        <TranslatedDynamicText
                          entity={destination}
                          field="shortDescription"
                        />
                      </p>
                    )}
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0D2B52]">
                      <TranslatedText k="destinations.view" />
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <section className="mt-12 rounded-3xl border border-[#D4AF37]/20 bg-[#071E3A] p-6 text-white shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#D4AF37]">
                Cartagena Tailored Travel
              </p>
              <h2 className="mt-3 text-2xl font-bold lg:text-3xl">
                <TranslatedText k="destinations.ctaTitle" />
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                <TranslatedText k="destinations.ctaText" />
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-xl bg-white text-[#0D2B52] hover:bg-[#F8F6F2]">
                <Link href={localizedRoutePath("contact", locale)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <TranslatedText k="destinations.ctaButton" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link href={localizedRoutePath("experience", locale)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <TranslatedText k="nav.experiences" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
