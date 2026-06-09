import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import JsonLd from "@/components/JsonLd";
import ProductDestinationsLinks from "@/components/destinations/ProductDestinationsLinks";
import PackageBookingCard from "@/components/packages/package-booking-card";
import PackageFaqSection from "@/components/packages/PackageFaqSection";
import BookingMoney from "@/components/BookingMoney";
import ProductMediaGallery from "@/components/media/ProductMediaGallery";
import PublicProductCard from "@/components/public-product-card";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import PublicReviewsSection from "@/components/reviews/PublicReviewsSection";
import TranslatedDynamicText from "@/components/TranslatedDynamicText";
import TranslatedText from "@/components/TranslatedText";
import ViewContentTracker from "@/components/ViewContentTracker";
import { apiUrl } from "@/lib/api";
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
  type DynamicTranslations,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import type { Language } from "@/i18n";
import { formatMoneyByLanguage } from "@/lib/currency";
import {
  localizedEntityForSeo,
  localizedEntityMetadata,
} from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { packagePublicPath } from "@/lib/product-url";

export const revalidate = 600;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  locale?: Language;
};

type PackageItem = {
  id: number;
  slug?: string | null;
  seoTitle?: string | null;
  title: string;
  seoDescription?: string | null;
  seoContent?: string | null;
  shortDescription: string;
  description: string;
  duration: string;
  location: string;
  maxGuests: number;
  basePrice: number;
  mainImage?: string | null;
  category: string;
  includes?: string | null;
  notIncludes?: string | null;
  itinerary?: string | null;
  policies?: string | null;
  recommendations?: string | null;
  faq?: unknown;
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
  components?: PackageComponent[];
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

type PackageComponent = {
  id: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  includes?: string | null;
  excludes?: string | null;
  conditions?: string | null;
  duration?: string | null;
  location?: string | null;
  recommendations?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  translations?: DynamicTranslations | null;
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
  "Premium travel package in Cartagena combining curated stays, private experiences and personalized assistance.";
const fallbackImage =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200";

function hasText(value?: string | null) {
  return Boolean(value && cleanPublicCopy(value).trim());
}

async function getPackage(id: string): Promise<PackageItem | null> {
  try {
    const res = await fetch(apiUrl(`/packages/${id}`), {
      next: { revalidate },
    });

    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

async function getPackageExtras(id: string): Promise<ExtraService[]> {
  try {
    const res = await fetch(apiUrl(`/extras/package/${id}`), {
      next: { revalidate },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getApprovedReviews(item: PackageItem): Promise<PublicReviewSeo[]> {
  if (!canUseAggregateRating(item)) return [];

  try {
    const res = await fetch(apiUrl(`/reviews/public/PACKAGE/${item.id}`), {
      next: { revalidate },
    });

    if (!res.ok) return [];

    const reviews = await res.json();
    return Array.isArray(reviews) ? reviews : [];
  } catch {
    return [];
  }
}

function primaryImage(item: PackageItem | null) {
  const activeImages = (item?.images || []).filter(
    (image) => image.active !== false && image.url
  );

  return (
    activeImages.find((image) => image.isPrimary)?.url ||
    activeImages[0]?.url ||
    item?.mainImage ||
    defaultOgImage.url
  );
}

function cardImage(item: PackageItem) {
  return primaryImage(item) || fallbackImage;
}

async function getPublicPackages(): Promise<PackageItem[]> {
  try {
    const res = await fetch(apiUrl("/packages"), {
      next: { revalidate },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizedText(value?: string | null) {
  return cleanPublicCopy(value || "").toLowerCase();
}

function destinationKeys(item?: PackageItem | null) {
  return new Set(
    (item?.destinations || [])
      .map((destination) => normalizedText(destination.slug || destination.name))
      .filter(Boolean)
  );
}

function durationScore(current?: string | null, candidate?: string | null) {
  const currentText = normalizedText(current);
  const candidateText = normalizedText(candidate);

  if (!currentText || !candidateText) return 0;
  if (currentText === candidateText) return 3;

  const currentNumber = Number(currentText.match(/\d+/)?.[0] || 0);
  const candidateNumber = Number(candidateText.match(/\d+/)?.[0] || 0);

  if (currentNumber && candidateNumber) {
    const difference = Math.abs(currentNumber - candidateNumber);
    if (difference === 0) return 3;
    if (difference <= 1) return 2;
  }

  return currentText.includes(candidateText) || candidateText.includes(currentText)
    ? 1
    : 0;
}

function relatedPackageScore(current: PackageItem, candidate: PackageItem) {
  let score = 0;
  const currentDestinations = destinationKeys(current);
  const candidateDestinations = destinationKeys(candidate);

  candidateDestinations.forEach((destination) => {
    if (currentDestinations.has(destination)) score += 5;
  });

  if (
    normalizedText(current.category) &&
    normalizedText(current.category) === normalizedText(candidate.category)
  ) {
    score += 4;
  }

  score += durationScore(current.duration, candidate.duration);

  const currentPrice = Number(current.basePrice || 0);
  const candidatePrice = Number(candidate.basePrice || 0);

  if (currentPrice > 0 && candidatePrice > 0) {
    const difference = Math.abs(currentPrice - candidatePrice) / currentPrice;
    if (difference <= 0.15) score += 3;
    else if (difference <= 0.3) score += 2;
    else if (difference <= 0.5) score += 1;
  }

  return score;
}

async function getRelatedPackages(item: PackageItem | null): Promise<PackageItem[]> {
  if (!item?.id) return [];

  const packages = await getPublicPackages();

  return packages
    .filter((candidate) => candidate?.id && candidate.id !== item.id)
    .map((candidate) => ({
      item: candidate,
      score: relatedPackageScore(item, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((candidate) => candidate.item);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getPackage(id);

  if (!item) {
    return buildMetadata({
      title: "Paquete no disponible",
      description: fallbackDescription,
      path: `/paquetes/${id}`,
      image: defaultOgImage,
    });
  }

  return localizedEntityMetadata({
    kind: "package",
    entity: item as TranslatableEntity,
    locale: "es",
    fallbackTitle: "Paquete premium | Cartagena Tailored Travel",
    fallbackDescription,
    image: primaryImage(item),
  });
}

function TextBlock({
  title,
  body,
  entity,
  field,
  icon,
}: {
  title: ReactNode;
  body?: string | null;
  entity?: TranslatableEntity | null;
  field?: string;
  icon: ReactNode;
}) {
  if (!hasText(body)) return null;

  return (
    <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
          {entity && field ? (
            <TranslatedDynamicText entity={entity} field={field} fallback={body} />
          ) : (
            cleanPublicCopy(body)
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailLine({
  title,
  titleKey,
  body,
  entity,
  field,
  icon,
}: {
  title?: ReactNode;
  titleKey?: any;
  body?: string | null;
  entity?: TranslatableEntity | null;
  field?: string;
  icon: ReactNode;
}) {
  if (!hasText(body)) return null;

  return (
    <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
          {titleKey ? <TranslatedText k={titleKey} /> : title}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
        {entity && field ? (
          <TranslatedDynamicText entity={entity} field={field} fallback={body} />
        ) : (
          cleanPublicCopy(body)
        )}
      </p>
    </div>
  );
}

export default async function PackageDetailPage({
  params,
  locale = "es",
}: PageProps) {
  const { id } = await params;
  const item = await getPackage(id);
  const localizedPackage = item
    ? localizedEntityForSeo(item as any, locale, "package")
    : null;
  const packagePublicUrl = item?.slug?.trim()
    ? localizedRoutePath("package", locale, item.slug.trim())
    : localizedRoutePath("package", locale);
  const schemaPackage = localizedPackage || null;
  const [extras, approvedReviews, relatedPackages] = item
    ? await Promise.all([
        getPackageExtras(String(item.id)),
        getApprovedReviews(item),
        getRelatedPackages(item),
      ])
    : [[], [], []];

  if (!item) {
    return (
      <main className="min-h-screen bg-[#F8F6F1] px-6 py-16 text-[#0D2B52]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
          <h2 className="text-3xl font-semibold">
            <TranslatedText k="package.unavailable" />
          </h2>
          <p className="mt-3 text-slate-600">
            <TranslatedText k="package.unavailableText" />
          </p>
          <Link href={localizedRoutePath("package", locale)}>
            <Button className="mt-6 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
              <TranslatedText k="package.back" />
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const activeComponents = (item.components || []).filter(
    (component) => component.active !== false
  );
  const faqSchema = buildFaqPageSchema(getTranslatedFaq(item, locale, item.faq));
  const aboutField = hasText(item.seoContent) ? "seoContent" : "description";
  const aboutBody = hasText(item.seoContent) ? item.seoContent : item.description;

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <JsonLd
        data={[
          buildTouristTripSchema(
            schemaPackage || item,
            approvedReviews,
            "paquetes",
            locale
          ),
          buildBreadcrumbSchema([
            { name: "Home", url: localizedRoutePath("home", locale) },
            { name: "Paquetes", url: localizedRoutePath("package", locale) },
            {
              name:
                getDynamicText(item, "title", locale) ||
                item.title ||
                "Paquete premium",
              url:
                schemaPackage?.url || packagePublicUrl,
            },
          ]),
          ...(faqSchema ? [faqSchema] : []),
        ]}
      />
      <ViewContentTracker
        contentType="PACKAGE"
        contentId={item.id}
        contentName={cleanPublicCopy(item.title)}
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
              label: <TranslatedText k="nav.packages" />,
              href: localizedRoutePath("package", locale),
            },
            {
              label:
                getDynamicText(item, "title", locale) ||
                item.title ||
                "Paquete premium",
            },
          ]}
        />
        <Link
          href={localizedRoutePath("package", locale)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#0D2B52]"
        >
          <ArrowLeft className="h-4 w-4" />
          <TranslatedText k="package.back" />
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-start">
          <div className="space-y-8">
            <div className="premium-hover-lift overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <div className="relative">
                <ProductMediaGallery
                  title={cleanPublicCopy(item.title)}
                  titleEntity={item}
                  media={item.images}
                  fallbackImage={item.mainImage || fallbackImage}
                />
                <div className="absolute left-5 top-5 z-10">
                  <Badge className="rounded-md bg-white text-[#0D2B52] hover:bg-white">
                    <TranslatedDynamicText entity={item} field="category" />
                  </Badge>
                </div>
              </div>

              <div className="p-6 lg:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                  <TranslatedText k="package.eyebrow" />
                </p>
                <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
                  <TranslatedDynamicText entity={item} field="title" />
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  <TranslatedDynamicText entity={item} field="shortDescription" />
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-4">
                    <Clock className="h-5 w-5 text-[#B48A5A]" />
                    <p className="mt-2 text-sm font-semibold text-[#0D2B52]">
                      <TranslatedDynamicText entity={item} field="duration" />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <TranslatedText k="packageDetail.durationEstimated" />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-4">
                    <Users className="h-5 w-5 text-[#B48A5A]" />
                    <p className="mt-2 text-sm font-semibold text-[#0D2B52]">
                      <TranslatedText k="shared.upTo" /> {item.maxGuests}{" "}
                      <TranslatedText k="shared.people" />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <TranslatedText k="packageDetail.suggestedCapacity" />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-4">
                    <Sparkles className="h-5 w-5 text-[#B48A5A]" />
                    <p className="mt-2 text-sm font-semibold text-[#0D2B52]">
                      <TranslatedText k="packageDetail.personalAttention" />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <TranslatedText k="experiences.assisted" />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="space-y-5 p-6 lg:p-8">
                <h2 className="text-2xl font-semibold">
                  <TranslatedText k="packageDetail.about" />
                </h2>
                <p className="whitespace-pre-line leading-8 text-slate-600">
                  <TranslatedDynamicText
                    entity={item}
                    field={aboutField}
                    fallback={aboutBody}
                  />
                </p>
              </CardContent>
            </Card>

            <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                  <TranslatedText k="packageDetail.planningEyebrow" />
                </p>
                <h2 className="mt-2 text-3xl font-semibold">
                  <TranslatedText k="packageDetail.idealTitle" />
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  <TranslatedText k="packageDetail.idealIntro" />
                </p>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#F8F6F1] p-5">
                  <Users className="h-5 w-5 text-[#B48A5A]" />
                  <h3 className="mt-3 text-lg font-semibold">
                    <TranslatedText k="packageDetail.travelerProfile" />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    <TranslatedText k="shared.upTo" /> {item.maxGuests}{" "}
                    <TranslatedText k="shared.people" /> -{" "}
                    <TranslatedDynamicText entity={item} field="category" />
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F8F6F1] p-5">
                  <MapPin className="h-5 w-5 text-[#B48A5A]" />
                  <h3 className="mt-3 text-lg font-semibold">
                    <TranslatedText k="packageDetail.routeContext" />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    <TranslatedDynamicText entity={item} field="location" /> -{" "}
                    <TranslatedDynamicText entity={item} field="duration" />
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F8F6F1] p-5">
                  <ShieldCheck className="h-5 w-5 text-[#B48A5A]" />
                  <h3 className="mt-3 text-lg font-semibold">
                    <TranslatedText k="packageDetail.howItWorks" />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    <TranslatedText k="packageDetail.howItWorksText" />
                  </p>
                </div>
              </div>

            </section>

            {activeComponents.length > 0 && (
              <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                    <TranslatedText k="packageDetail.stagesEyebrow" />
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">
                    <TranslatedText k="packageDetail.includedTitle" />
                  </h2>
                  <p className="mt-3 leading-7 text-slate-600">
                    <TranslatedText k="packageDetail.includedText" />
                  </p>
                </div>

                <div className="mt-7 space-y-5">
                  {activeComponents.map((component, index) => {
                    const hasDetails = [
                      component.description,
                      component.includes,
                      component.excludes,
                      component.conditions,
                      component.recommendations,
                      component.location,
                    ].some(hasText);

                    return (
                      <details
                        key={component.id}
                        className="premium-hover-lift group overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#F8F6F1] shadow-sm transition open:bg-white"
                      >
                        <summary className="grid cursor-pointer list-none gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-start lg:p-6">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0D2B52] text-sm font-semibold text-white shadow-sm">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold text-[#0D2B52]">
                                <TranslatedDynamicText entity={component} field="title" />
                              </h3>
                              {component.duration && (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-[#D4AF37]/40 bg-white"
                                >
                                  <Clock className="mr-1.5 h-3.5 w-3.5 text-[#B48A5A]" />
                                  <TranslatedDynamicText entity={component} field="duration" />
                                </Badge>
                              )}
                              {component.location && (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-[#D4AF37]/40 bg-white"
                                >
                                  <MapPin className="mr-1.5 h-3.5 w-3.5 text-[#B48A5A]" />
                                  <TranslatedDynamicText entity={component} field="location" />
                                </Badge>
                              )}
                            </div>

                            {component.shortDescription && (
                              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                <TranslatedDynamicText entity={component} field="shortDescription" />
                              </p>
                            )}
                          </div>

                          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-white px-4 py-2 text-sm font-medium text-[#0D2B52] transition group-open:bg-[#0D2B52] group-open:text-white">
                            <TranslatedText k="packageDetail.viewDetails" />
                            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                          </span>
                        </summary>

                        {hasDetails && (
                          <div className="grid gap-3 border-t border-[#D4AF37]/20 bg-white p-5 md:grid-cols-2 lg:p-6">
                            <DetailLine
                              titleKey="packageDetail.fullDescription"
                              body={component.description}
                              entity={component}
                              field="description"
                              icon={<Info className="h-4 w-4 text-[#B48A5A]" />}
                            />
                            <DetailLine
                              titleKey="packageDetail.componentLocation"
                              body={component.location}
                              entity={component}
                              field="location"
                              icon={<MapPin className="h-4 w-4 text-[#B48A5A]" />}
                            />
                            <DetailLine
                              titleKey="packageDetail.includes"
                              body={component.includes}
                              entity={component}
                              field="includes"
                              icon={
                                <CheckCircle2 className="h-4 w-4 text-[#B48A5A]" />
                              }
                            />
                            <DetailLine
                              titleKey="packageDetail.notIncludes"
                              body={component.excludes}
                              entity={component}
                              field="excludes"
                              icon={<XCircle className="h-4 w-4 text-[#B48A5A]" />}
                            />
                            <DetailLine
                              titleKey="packageDetail.conditions"
                              body={component.conditions}
                              entity={component}
                              field="conditions"
                              icon={
                                <ShieldCheck className="h-4 w-4 text-[#B48A5A]" />
                              }
                            />
                            <DetailLine
                              titleKey="packageDetail.recommendations"
                              body={component.recommendations}
                              entity={component}
                              field="recommendations"
                              icon={<Sparkles className="h-4 w-4 text-[#B48A5A]" />}
                            />
                          </div>
                        )}
                      </details>
                    );
                  })}
                </div>
              </section>
            )}

            <TextBlock
              title={<TranslatedText k="packageDetail.fullItinerary" />}
              body={item.itinerary}
              entity={item}
              field="itinerary"
              icon={<CalendarDays className="h-5 w-5 text-[#B48A5A]" />}
            />

            {(hasText(item.includes) || hasText(item.notIncludes)) && (
              <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-semibold">
                    <TranslatedText k="packageDetail.scopeTitle" />
                  </h2>
                  <p className="mt-3 leading-7 text-slate-600">
                    <TranslatedText k="packageDetail.scopeIntro" />
                  </p>
                </div>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <TextBlock
                    title={<TranslatedText k="packageDetail.includes" />}
                    body={item.includes}
                    entity={item}
                    field="includes"
                    icon={<CheckCircle2 className="h-5 w-5 text-[#B48A5A]" />}
                  />
                  <TextBlock
                    title={<TranslatedText k="packageDetail.notIncludes" />}
                    body={item.notIncludes}
                    entity={item}
                    field="notIncludes"
                    icon={<XCircle className="h-5 w-5 text-[#B48A5A]" />}
                  />
                </div>
              </section>
            )}

            {(hasText(item.policies) || hasText(item.recommendations)) && (
              <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#B48A5A]" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-semibold">
                      <TranslatedText k="packageDetail.conditionsRecommendations" />
                    </h2>
                    <p className="mt-3 leading-7 text-slate-600">
                      <TranslatedText k="packageDetail.operationalInfoIntro" />
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <DetailLine
                        titleKey="packageDetail.generalConditions"
                        body={item.policies}
                        entity={item}
                        field="policies"
                        icon={
                          <ShieldCheck className="h-4 w-4 text-[#B48A5A]" />
                        }
                      />
                      <DetailLine
                        titleKey="packageDetail.recommendations"
                        body={item.recommendations}
                        entity={item}
                        field="recommendations"
                        icon={<Sparkles className="h-4 w-4 text-[#B48A5A]" />}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <ProductDestinationsLinks destinations={item.destinations} />

            {relatedPackages.length > 0 && (
              <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                      <TranslatedText k="packageDetail.relatedEyebrow" />
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">
                      <TranslatedText k="packageDetail.relatedTitle" />
                    </h2>
                  </div>
                  <Link
                    href={localizedRoutePath("package", locale)}
                    className="text-sm font-semibold text-[#0D2B52] underline-offset-4 hover:underline"
                  >
                    <TranslatedText k="packageDetail.relatedViewAll" />
                  </Link>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  <TranslatedText k="packageDetail.relatedIntro" />
                </p>

                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {relatedPackages.map((related) => (
                    <PublicProductCard
                      key={related.id}
                      href={packagePublicPath(related, locale)}
                      reserveHref={`/checkout/${related.id}?type=PACKAGE`}
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
                      button={<TranslatedText k="packages.view" />}
                      trackingLabel={`abrir_paquete_relacionado_${related.id}`}
                      trackingLocation="paquete_detalle_relacionados"
                      reserveTrackingLabel={`reservar_paquete_relacionado_${related.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            <PublicReviewsSection
              targetType="PACKAGE"
              targetId={item.id}
              locale={locale}
            />

            <PackageFaqSection item={item} fallback={item.faq} />
          </div>

          <aside className="sticky top-24 lg:min-w-[360px] lg:max-w-[430px]">
            <Card className="premium-reveal premium-delay-1 rounded-3xl border border-[#D4AF37]/25 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <CardContent className="space-y-6 p-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    <TranslatedText k="properties.from" />
                  </span>
                  <p className="mt-1 text-3xl font-semibold leading-tight text-[#B48A5A]">
                    <BookingMoney value={item.basePrice} />
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    <TranslatedText k="package.baseNote" />
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-[#F8F6F1] p-4 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedDynamicText entity={item} field="location" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedDynamicText entity={item} field="duration" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-[#B48A5A]" />
                    <TranslatedText k="shared.upTo" /> {item.maxGuests}{" "}
                    <TranslatedText k="shared.people" />
                  </div>
                </div>

                <PackageBookingCard
                  packageId={item.id}
                  basePrice={item.basePrice}
                  extras={extras}
                  components={activeComponents}
                />

                <p className="text-xs leading-5 text-slate-500">
                  <TranslatedText k="shared.noChargeStep" />
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>

        <section className="premium-scroll-reveal mt-10 overflow-hidden rounded-3xl bg-[#0D2B52] text-white shadow-sm">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#D4AF37]">
                <TranslatedText k="packageDetail.tailoredEyebrow" />
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                <TranslatedText k="packageDetail.ctaTitle" />
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-100">
                <TranslatedText k="packageDetail.ctaText" />
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/checkout/${item.id}?type=PACKAGE`}>
                <Button className="h-12 w-full rounded-xl bg-[#D4AF37] px-6 text-[#0D2B52] hover:bg-[#c6a032] sm:w-auto">
                  <TranslatedText k="packageDetail.reservePackage" />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contacto">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-xl border-white/40 bg-white/10 px-6 text-white hover:bg-white hover:text-[#0D2B52] sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <TranslatedText k="packageDetail.talkAdvisor" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
