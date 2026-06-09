import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import JsonLd from "@/components/JsonLd";
import PublicProductCard from "@/components/public-product-card";
import ProductDestinationsLinks from "@/components/destinations/ProductDestinationsLinks";
import ExperienceBookingCard from "@/components/experiences/experience-booking-card";
import ExperienceSeoSections from "@/components/experiences/ExperienceSeoSections";
import BookingMoney from "@/components/BookingMoney";
import ProductMediaGallery from "@/components/media/ProductMediaGallery";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import PublicReviewsSection from "@/components/reviews/PublicReviewsSection";
import TranslatedDynamicText from "@/components/TranslatedDynamicText";
import TranslatedText from "@/components/TranslatedText";
import ViewContentTracker from "@/components/ViewContentTracker";
import { apiUrl } from "@/lib/api";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getTranslatedFaq } from "@/lib/faq";
import { cleanPublicCopy } from "@/lib/public-copy";
import {
  buildMetadata,
  defaultOgImage,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildTouristTripSchema,
  canUseAggregateRating,
} from "@/lib/schema";
import {
  getDynamicText,
  getLocalizedSlug,
  type DynamicTranslations,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import type { Language } from "@/i18n";
import {
  localizedEntityForSeo,
  localizedEntityMetadata,
} from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { experiencePublicPath } from "@/lib/product-url";

export const revalidate = 600;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  locale?: Language;
};

type Experience = {
  id: number;
  slug?: string | null;
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  shortDescription: string;
  description: string;
  location: string;
  duration: string;
  maxGuests: number;
  basePrice: number;
  category: string;
  mainImage?: string | null;
  policies?: string | null;
  recommendations?: string | null;
  itinerary?: string | null;
  included?: string | null;
  notIncluded?: string | null;
  meetingPoint?: string | null;
  durationDescription?: string | null;
  schedule?: string | null;
  conditions?: string | null;
  faq?: unknown;
  experienceCategory?: string | null;
  features?: {
    id?: number;
    name?: string | null;
    category?: string | null;
    translations?: DynamicTranslations | null;
  }[];
  averageRating?: number | string | null;
  reviewCount?: number | null;
  images?: {
    id?: number;
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    title?: string | null;
    description?: string | null;
    isPrimary?: boolean;
    active?: boolean | null;
    sortOrder?: number | null;
  }[];
  translations?: DynamicTranslations | null;
  destinations?: {
    id: number;
    name: string;
    slug: string;
    location?: string | null;
    translations?: DynamicTranslations | null;
  }[];
};

type PublicReviewSeo = {
  customerName?: string | null;
  publicName?: string | null;
  customerCountry?: string | null;
  rating?: number | string | null;
  title?: string | null;
  comment?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
};

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active?: boolean;
  translations?: DynamicTranslations | null;
};

const fallbackDescription =
  "Private experience in Cartagena with personalized service, curated details and premium assistance.";
const fallbackImage =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200";

async function getExperience(id: string): Promise<Experience | null> {
  try {
    const res = await fetch(apiUrl(`/experiences/${id}`), {
      next: { revalidate },
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

async function getExperienceExtras(id: string): Promise<ExtraService[]> {
  try {
    const res = await fetch(apiUrl(`/extras/experience/${id}`), {
      next: { revalidate },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getApprovedReviews(experience: Experience): Promise<PublicReviewSeo[]> {
  if (!canUseAggregateRating(experience)) return [];

  try {
    const res = await fetch(apiUrl(`/reviews/public/EXPERIENCE/${experience.id}`), {
      next: { revalidate },
    });

    if (!res.ok) return [];

    const reviews = await res.json();
    return Array.isArray(reviews) ? reviews : [];
  } catch {
    return [];
  }
}

function primaryImage(experience: Experience | null) {
  const activeImages = (experience?.images || []).filter(
    (image) => image.active !== false && image.url
  );

  return (
    activeImages.find((image) => image.isPrimary)?.url ||
    activeImages[0]?.url ||
    experience?.mainImage ||
    defaultOgImage.url
  );
}

function cardImage(experience: Experience) {
  return primaryImage(experience) || fallbackImage;
}

async function getPublicExperiences(): Promise<Experience[]> {
  try {
    const res = await fetch(apiUrl("/experiences"), {
      next: { revalidate },
    });

    if (!res.ok) return [];

    const experiences = await res.json();
    return Array.isArray(experiences) ? experiences : [];
  } catch {
    return [];
  }
}

function normalizedText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function destinationKeys(experience?: Experience | null) {
  return new Set(
    (experience?.destinations || [])
      .map((destination) => normalizedText(destination.slug || destination.name))
      .filter(Boolean)
  );
}

function categoryKeys(experience?: Experience | null) {
  return new Set(
    [
      experience?.experienceCategory,
      experience?.category,
      ...(experience?.features || []).map((feature) => feature.category || feature.name),
    ]
      .map((value) => normalizedText(value))
      .filter(Boolean)
  );
}

function relatedExperienceScore(current: Experience, candidate: Experience) {
  const currentDestinations = destinationKeys(current);
  const candidateDestinations = destinationKeys(candidate);
  const currentCategories = categoryKeys(current);
  const candidateCategories = categoryKeys(candidate);
  const currentPrice = Number(current.basePrice || 0);
  const candidatePrice = Number(candidate.basePrice || 0);
  const reviewCount = Number(candidate.reviewCount || 0);
  const averageRating = Number(candidate.averageRating || 0);
  let score = 0;

  candidateCategories.forEach((key) => {
    if (currentCategories.has(key)) score += 5;
  });

  candidateDestinations.forEach((key) => {
    if (currentDestinations.has(key)) score += 4;
  });

  if (currentPrice > 0 && candidatePrice > 0) {
    const differenceRatio = Math.abs(currentPrice - candidatePrice) / currentPrice;
    if (differenceRatio <= 0.15) score += 3;
    else if (differenceRatio <= 0.3) score += 2;
    else if (differenceRatio <= 0.5) score += 1;
  }

  if (reviewCount >= 5 && averageRating >= 4.5) score += 2;
  else if (reviewCount > 0) score += 1;

  return score;
}

async function getRelatedExperiences(
  experience: Experience | null
): Promise<Experience[]> {
  if (!experience?.id) return [];

  const experiences = await getPublicExperiences();

  return experiences
    .filter((candidate) => candidate?.id && candidate.id !== experience.id)
    .map((candidate) => ({
      experience: candidate,
      score: relatedExperienceScore(experience, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.experience);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const experience = await getExperience(id);

  if (!experience) {
    return buildMetadata({
      title: "Experiencia no disponible",
      description: fallbackDescription,
      path: `/experiencias/${id}`,
      image: defaultOgImage,
    });
  }

  return localizedEntityMetadata({
    kind: "experience",
    entity: experience as TranslatableEntity,
    locale: "es",
    fallbackTitle: "Experiencia premium | Cartagena Tailored Travel",
    fallbackDescription,
    image: primaryImage(experience),
  });
}

export default async function ExperienceDetailPage({
  params,
  locale = "es",
}: PageProps) {
  const { id } = await params;
  const experience = await getExperience(id);
  const localizedExperience = experience
    ? localizedEntityForSeo(experience as any, locale, "experience")
    : null;
  const experiencePublicUrl = experience?.slug?.trim()
    ? localizedRoutePath(
        "experience",
        locale,
        getLocalizedSlug(experience, locale, experience.slug)
      )
    : localizedRoutePath("experience", locale);
  const schemaExperience = localizedExperience || null;
  const [extras, approvedReviews, relatedExperiences] = experience
    ? await Promise.all([
        getExperienceExtras(String(experience.id)),
        getApprovedReviews(experience),
        getRelatedExperiences(experience),
      ])
    : [[], [], []];
  const faqSchema = experience
    ? buildFaqPageSchema(getTranslatedFaq(experience, locale, experience.faq))
    : undefined;

  if (!experience) {
    return (
      <main className="min-h-screen bg-[#F8F6F1] px-6 py-16 text-[#0D2B52]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
          <h2 className="text-3xl font-semibold">
            <TranslatedText k="experience.unavailable" />
          </h2>
          <p className="mt-3 text-slate-600">
            <TranslatedText k="experience.unavailableText" />
          </p>
          <Link href={localizedRoutePath("experience", locale)}>
            <Button className="mt-6 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
              <TranslatedText k="experience.back" />
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <JsonLd
        data={[
          buildTouristTripSchema(
            schemaExperience || experience,
            approvedReviews,
            "experiencias",
            locale
          ),
          buildBreadcrumbSchema([
            { name: "Home", url: localizedRoutePath("home", locale) },
            {
              name: "Experiencias",
              url: localizedRoutePath("experience", locale),
            },
            {
              name:
                getDynamicText(experience, "title", locale) ||
                experience.title ||
                "Experiencia premium",
              url:
                schemaExperience?.url || experiencePublicUrl,
            },
          ]),
          ...(faqSchema ? [faqSchema] : []),
        ]}
      />
      <ViewContentTracker
        contentType="EXPERIENCE"
        contentId={experience.id}
        contentName={cleanPublicCopy(experience.title)}
      />
      <section className="premium-reveal mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <PublicBreadcrumbs
          className="mb-4"
          items={[
            {
              label: <TranslatedText k="destinations.breadcrumbHome" />,
              href: localizedRoutePath("home", locale),
            },
            {
              label: <TranslatedText k="nav.experiences" />,
              href: localizedRoutePath("experience", locale),
            },
            {
              label:
                getDynamicText(experience, "title", locale) ||
                experience.title ||
                "Experiencia premium",
            },
          ]}
        />
        <Link
          href={localizedRoutePath("experience", locale)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#0D2B52]"
        >
          <ArrowLeft className="h-4 w-4" />
          <TranslatedText k="experience.back" />
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-start">
          <div className="space-y-8">
            <div className="premium-hover-lift overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <div className="relative">
                <ProductMediaGallery
                  title={cleanPublicCopy(experience.title)}
                  titleEntity={experience}
                  media={experience.images}
                  fallbackImage={experience.mainImage || fallbackImage}
                  layout="experience"
                />
                <div className="absolute left-5 top-5 z-10">
                  <Badge className="rounded-md bg-white text-[#0D2B52] hover:bg-white">
                  <TranslatedDynamicText entity={experience} field="category" />
                </Badge>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                  <TranslatedText k="experience.eyebrow" />
                </p>
                <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
                  <TranslatedDynamicText entity={experience} field="title" />
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  <TranslatedDynamicText entity={experience} field="shortDescription" />
                </p>
              </div>
            </div>

            <Card className="premium-scroll-reveal rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="space-y-5 p-6 lg:p-8">
                <h2 className="text-2xl font-semibold">
                  <TranslatedText k="experience.detail" />
                </h2>
                <p className="whitespace-pre-line leading-8 text-slate-600">
                  <TranslatedDynamicText entity={experience} field="description" />
                </p>
              </CardContent>
            </Card>

            <ExperienceSeoSections experience={experience} />

            <ProductDestinationsLinks destinations={experience.destinations} />

            {relatedExperiences.length > 0 && (
              <section className="border-b border-[#D4AF37]/20 pb-10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B68D40]">
                      <TranslatedText k="experience.relatedEyebrow" />
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      <TranslatedText k="experience.relatedTitle" />
                    </h2>
                  </div>
                  <Link
                    href={localizedRoutePath("experience", locale)}
                    className="text-sm font-semibold text-[#0D2B52] underline-offset-4 hover:underline"
                  >
                    <TranslatedText k="experience.relatedViewAll" />
                  </Link>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  <TranslatedText k="experience.relatedIntro" />
                </p>

                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {relatedExperiences.map((related) => (
                    <PublicProductCard
                      key={related.id}
                      href={experiencePublicPath(related, locale)}
                      reserveHref={`/checkout/${related.id}?type=EXPERIENCE`}
                      image={cardImage(related)}
                      fallbackImage={fallbackImage}
                      badge={getDynamicText(related, "category", locale)}
                      title={getDynamicText(related, "title", locale)}
                      description={getDynamicText(
                        related,
                        "shortDescription",
                        locale,
                        related.shortDescription
                      )}
                      location={getDynamicText(
                        related,
                        "location",
                        locale,
                        related.location
                      )}
                      price={formatMoneyByLanguage(related.basePrice, locale)}
                      meta={getDynamicText(
                        related,
                        "duration",
                        locale,
                        related.duration
                      )}
                      secondaryMeta={
                        <>
                          <TranslatedText k="shared.upTo" /> {related.maxGuests}
                        </>
                      }
                      button={<TranslatedText k="experiences.view" />}
                      trackingLabel={`abrir_experiencia_relacionada_${related.id}`}
                      trackingLocation="experiencia_detalle_relacionadas"
                      reserveTrackingLabel={`reservar_experiencia_relacionada_${related.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            <PublicReviewsSection
              targetType="EXPERIENCE"
              targetId={experience.id}
              locale={locale}
            />
          </div>

          <aside className="sticky top-6 lg:min-w-[360px] lg:max-w-[430px]">
            <Card className="premium-reveal premium-delay-1 rounded-2xl border border-[#D4AF37]/25 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <CardContent className="space-y-6 p-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    <TranslatedText k="properties.from" />
                  </span>
                  <p className="mt-1 text-3xl font-semibold leading-tight text-[#B48A5A]">
                    <BookingMoney value={experience.basePrice} />
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    <TranslatedText k="experience.baseNote" />
                  </p>
                </div>

                <div className="space-y-3 rounded-xl bg-[#F8F6F1] p-4 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedDynamicText entity={experience} field="location" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedDynamicText entity={experience} field="duration" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedText k="shared.upTo" /> {experience.maxGuests}{" "}
                    <TranslatedText k="shared.people" />
                  </div>
                </div>

                <ExperienceBookingCard
                  experienceId={experience.id}
                  basePrice={experience.basePrice}
                  extras={extras}
                />

                <p className="text-xs leading-5 text-slate-500">
                  <TranslatedText k="shared.noChargeStep" />
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
