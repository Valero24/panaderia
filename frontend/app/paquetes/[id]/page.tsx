import Link from "next/link";
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
import PackageBookingCard from "@/components/packages/package-booking-card";
import ProductMediaGallery from "@/components/media/ProductMediaGallery";
import TranslatedText from "@/components/TranslatedText";
import ViewContentTracker from "@/components/ViewContentTracker";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PackageItem = {
  id: number;
  title: string;
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
  recommendations?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
};

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active?: boolean;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200";

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

function hasText(value?: string | null) {
  return Boolean(value && cleanPublicCopy(value).trim());
}

async function getPackage(id: string): Promise<PackageItem | null> {
  try {
    const res = await fetch(apiUrl(`/packages/${id}`), {
      cache: "no-store",
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
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function TextBlock({
  title,
  body,
  icon,
}: {
  title: ReactNode;
  body?: string | null;
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
          {cleanPublicCopy(body)}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailLine({
  title,
  titleKey,
  body,
  icon,
}: {
  title?: ReactNode;
  titleKey?: any;
  body?: string | null;
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
        {cleanPublicCopy(body)}
      </p>
    </div>
  );
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [item, extras] = await Promise.all([
    getPackage(id),
    getPackageExtras(id),
  ]);

  if (!item) {
    return (
      <main className="min-h-screen bg-[#F8F6F1] px-6 py-16 text-[#0D2B52]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold">
            <TranslatedText k="package.unavailable" />
          </h1>
          <p className="mt-3 text-slate-600">
            <TranslatedText k="package.unavailableText" />
          </p>
          <Link href="/paquetes">
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

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <ViewContentTracker
        contentType="PACKAGE"
        contentId={item.id}
        contentName={cleanPublicCopy(item.title)}
      />

      <section className="premium-reveal mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/paquetes"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#0D2B52]"
        >
          <ArrowLeft className="h-4 w-4" />
          <TranslatedText k="package.back" />
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <div className="space-y-8">
            <div className="premium-hover-lift overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <div className="relative">
                <ProductMediaGallery
                  title={cleanPublicCopy(item.title)}
                  media={item.images}
                  fallbackImage={item.mainImage || fallbackImage}
                />
                <div className="absolute left-5 top-5 z-10">
                  <Badge className="rounded-md bg-white text-[#0D2B52] hover:bg-white">
                    {cleanPublicCopy(item.category)}
                  </Badge>
                </div>
              </div>

              <div className="p-6 lg:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                  <TranslatedText k="package.eyebrow" />
                </p>
                <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
                  {cleanPublicCopy(item.title)}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  {cleanPublicCopy(item.shortDescription)}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-4">
                    <Clock className="h-5 w-5 text-[#B48A5A]" />
                    <p className="mt-2 text-sm font-semibold text-[#0D2B52]">
                      {cleanPublicCopy(item.duration)}
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
                  {cleanPublicCopy(item.description)}
                </p>
              </CardContent>
            </Card>

            {activeComponents.length > 0 && (
              <section className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                    <TranslatedText k="packageDetail.stagesEyebrow" />
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">
                    <TranslatedText k="packageDetail.stagesTitle" />
                  </h2>
                  <p className="mt-3 leading-7 text-slate-600">
                    <TranslatedText k="packageDetail.stagesText" />
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
                                {cleanPublicCopy(component.title)}
                              </h3>
                              {component.duration && (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-[#D4AF37]/40 bg-white"
                                >
                                  <Clock className="mr-1.5 h-3.5 w-3.5 text-[#B48A5A]" />
                                  {cleanPublicCopy(component.duration)}
                                </Badge>
                              )}
                            </div>

                            {component.shortDescription && (
                              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                {cleanPublicCopy(component.shortDescription)}
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
                              icon={<Info className="h-4 w-4 text-[#B48A5A]" />}
                            />
                            <DetailLine
                              titleKey="packageDetail.includes"
                              body={component.includes}
                              icon={
                                <CheckCircle2 className="h-4 w-4 text-[#B48A5A]" />
                              }
                            />
                            <DetailLine
                              titleKey="packageDetail.notIncludes"
                              body={component.excludes}
                              icon={<XCircle className="h-4 w-4 text-[#B48A5A]" />}
                            />
                            <DetailLine
                              titleKey="packageDetail.conditions"
                              body={component.conditions}
                              icon={
                                <ShieldCheck className="h-4 w-4 text-[#B48A5A]" />
                              }
                            />
                            <DetailLine
                              titleKey="packageDetail.recommendations"
                              body={component.recommendations}
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

            <div className="grid gap-5 md:grid-cols-2">
              <TextBlock
                title={<TranslatedText k="packageDetail.includes" />}
                body={item.includes}
                icon={<CheckCircle2 className="h-5 w-5 text-[#B48A5A]" />}
              />
              <TextBlock
                title={<TranslatedText k="packageDetail.notIncludes" />}
                body={item.notIncludes}
                icon={<XCircle className="h-5 w-5 text-[#B48A5A]" />}
              />
              <TextBlock
                title={<TranslatedText k="package.itinerary" />}
                body={item.itinerary}
                icon={<CalendarDays className="h-5 w-5 text-[#B48A5A]" />}
              />
            </div>

            <Card className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#B48A5A]" />
                  <div>
                    <h2 className="text-2xl font-semibold">
                      <TranslatedText k="packageDetail.conditionsRecommendations" />
                    </h2>
                    {hasText(item.policies) || hasText(item.recommendations) ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <DetailLine
                          titleKey="packageDetail.generalConditions"
                          body={item.policies}
                          icon={
                            <ShieldCheck className="h-4 w-4 text-[#B48A5A]" />
                          }
                        />
                        <DetailLine
                          titleKey="packageDetail.recommendations"
                          body={item.recommendations}
                          icon={<Sparkles className="h-4 w-4 text-[#B48A5A]" />}
                        />
                      </div>
                    ) : (
                      <p className="mt-4 leading-7 text-slate-600">
                        <TranslatedText k="packageDetail.advisorFallback" />
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="sticky top-24">
            <Card className="premium-reveal premium-delay-1 rounded-3xl border border-[#D4AF37]/25 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <CardContent className="space-y-6 p-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    <TranslatedText k="properties.from" />
                  </span>
                  <p className="mt-1 text-3xl font-semibold text-[#B48A5A]">
                    {money(item.basePrice)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    <TranslatedText k="package.baseNote" />
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-[#F8F6F1] p-4 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[#B48A5A]" />
                    {cleanPublicCopy(item.location)}
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#B48A5A]" />
                    {cleanPublicCopy(item.duration)}
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
