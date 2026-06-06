import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExperienceBookingCard from "@/components/experiences/experience-booking-card";
import BookingMoney from "@/components/BookingMoney";
import ProductMediaGallery from "@/components/media/ProductMediaGallery";
import TranslatedDynamicText from "@/components/TranslatedDynamicText";
import TranslatedText from "@/components/TranslatedText";
import ViewContentTracker from "@/components/ViewContentTracker";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";
import type { DynamicTranslations } from "@/lib/dynamic-translations";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Experience = {
  id: number;
  title: string;
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
};

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active?: boolean;
  translations?: DynamicTranslations | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200";

async function getExperience(id: string): Promise<Experience | null> {
  try {
    const res = await fetch(apiUrl(`/experiences/${id}`), {
      cache: "no-store",
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
      cache: "no-store",
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

export default async function ExperienceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [experience, extras] = await Promise.all([
    getExperience(id),
    getExperienceExtras(id),
  ]);

  if (!experience) {
    return (
      <main className="min-h-screen bg-[#F8F6F1] px-6 py-16 text-[#0D2B52]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold">
            <TranslatedText k="experience.unavailable" />
          </h1>
          <p className="mt-3 text-slate-600">
            <TranslatedText k="experience.unavailableText" />
          </p>
          <Link href="/experiencias">
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
      <ViewContentTracker
        contentType="EXPERIENCE"
        contentId={experience.id}
        contentName={cleanPublicCopy(experience.title)}
      />
      <section className="premium-reveal mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/experiencias"
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

            {(experience.policies || experience.recommendations) && (
              <div className="grid gap-5 md:grid-cols-2">
                {experience.policies && (
                  <Card className="premium-hover-lift rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-[#B48A5A]" />
                        <h2 className="text-xl font-semibold">
                          <TranslatedText k="experience.policies" />
                        </h2>
                      </div>
                      <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                        <TranslatedDynamicText entity={experience} field="policies" />
                      </p>
                    </CardContent>
                  </Card>
                )}

                {experience.recommendations && (
                  <Card className="premium-hover-lift rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-[#B48A5A]" />
                        <h2 className="text-xl font-semibold">
                          <TranslatedText k="experience.recommendations" />
                        </h2>
                      </div>
                      <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                        <TranslatedDynamicText entity={experience} field="recommendations" />
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
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
