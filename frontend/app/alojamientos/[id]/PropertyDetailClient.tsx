"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Baby,
  Bath,
  BedDouble,
  CalendarDays,
  CigaretteOff,
  Clock,
  Gem,
  Home,
  MapPin,
  PartyPopper,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingMoney from "@/components/BookingMoney";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";
import { trackInitiateCheckout, trackViewContent } from "@/lib/analytics";
import ProductMediaGallery from "@/components/media/ProductMediaGallery";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";

type PropertyImage = {
  id: number;
  url: string;
  mediaType?: "IMAGE" | "VIDEO" | string | null;
  title?: string | null;
  description?: string | null;
  isPrimary?: boolean;
  active?: boolean | null;
  sortOrder?: number | null;
};

type PropertyFeature = {
  id: number;
  name: string;
  translations?: DynamicTranslations | null;
};

type Property = {
  id: number;
  slug?: string | null;
  title: string;
  description: string;
  city: string;
  area: string;
  address?: string | null;
  pricePerNight: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  basePrice?: number;
  highSeasonPrice?: number | null;
  lowSeasonPrice?: number | null;
  maxGuests: number;
  maxCapacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  minimumNights?: number;
  allowsPets?: boolean;
  allowsSmoking?: boolean;
  allowsEvents?: boolean;
  allowsChildren?: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  cancellationPolicy?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: PropertyImage[];
  features?: PropertyFeature[];
  translations?: DynamicTranslations | null;
};

type ExtraService = {
  id: number;
  name: string;
  description?: string;
  price: number;
  propertyId: number;
  translations?: DynamicTranslations | null;
};

type ExtrasApiResponse =
  | ExtraService[]
  | {
      data?: ExtraService[];
      extras?: ExtraService[];
    };

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200";

function normalizeExtras(data: ExtrasApiResponse): ExtraService[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.extras)) return data.extras;
  return [];
}

export default function PropertyDetailPage({ params }: PageProps) {
  const { language, t } = useTranslation();
  const money = (value?: number | null) => formatMoneyByLanguage(value, language);
  const { id } = use(params);
  const identifier = id;

  const [property, setProperty] = useState<Property | null>(null);
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const propertyRes = await fetch(apiUrl(`/properties/${identifier}`));

        if (!propertyRes.ok) {
          throw new Error(t("properties.loadErrorTitle"));
        }

        const propertyData = await propertyRes.json();
        setProperty(propertyData);

        const extrasRes = await fetch(apiUrl(`/extras/property/${propertyData.id}`));

        if (extrasRes.ok) {
          setExtras(normalizeExtras(await extrasRes.json()));
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : t("properties.connectionError"));
      } finally {
        setLoading(false);
      }
    }

    if (identifier) {
      fetchData();
    }
  }, [identifier, t]);

  useEffect(() => {
    if (property) {
      trackViewContent("PROPERTY", property.id, getDynamicText(property, "title", language));
    }
  }, [language, property]);

  const selectedExtrasData = useMemo(() => {
    return extras.filter((item) =>
      selectedExtras.includes(Number(item.id))
    );
  }, [extras, selectedExtras]);

  const extrasTotal = useMemo(() => {
    return selectedExtrasData.reduce(
      (acc, item) => acc + Number(item.price || 0),
      0
    );
  }, [selectedExtrasData]);

  const pricing = useMemo(() => {
    const nightly = Number(property?.pricePerNight || 0);
    const minimumNights = Math.max(Number(property?.minimumNights || 1), 1);
    const cleaning = Number(property?.cleaningFee || 0);
    const service = Number(property?.serviceFee || 0);
    const taxes = Number(property?.taxes || 0);
    const stay = nightly * minimumNights;

    return {
      nightly,
      minimumNights,
      stay,
      cleaning,
      service,
      taxes,
      total: stay + cleaning + service + taxes + extrasTotal,
    };
  }, [property, extrasTotal]);

  const checkoutHref = useMemo(() => {
    const search = new URLSearchParams();

    if (selectedExtras.length > 0) {
      search.set("extras", selectedExtras.join(","));
    }

    const query = search.toString();
    const checkoutId = property?.id ?? identifier;
    return query
      ? `/checkout/${checkoutId}?${query}`
      : `/checkout/${checkoutId}`;
  }, [identifier, property?.id, selectedExtras]);

  function toggleExtra(extraId: number) {
    setSelectedExtras((prev) =>
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    );
  }

  if (!identifier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t("property.invalid")}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        {t("property.loading")}
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error || t("property.notFound")}
      </div>
    );
  }

  const capacity = property.maxCapacity || property.maxGuests;
  const rules = [
    {
      icon: PawPrint,
      label: t("property.pets"),
      value: property.allowsPets
        ? t("property.allowedPlural")
        : t("property.notAllowedPlural"),
    },
    {
      icon: CigaretteOff,
      label: t("property.smoking"),
      value: property.allowsSmoking
        ? t("property.allowedSingular")
        : t("property.notAllowedSingular"),
    },
    {
      icon: PartyPopper,
      label: t("property.events"),
      value: property.allowsEvents
        ? t("property.allowedPlural")
        : t("property.notAllowedPlural"),
    },
    {
      icon: Baby,
      label: t("property.children"),
      value: property.allowsChildren
        ? t("property.welcome")
        : t("property.askAdvisor"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="premium-reveal max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#B68D40]" />
              {getDynamicText(property, "area", language, property.area)}, {getDynamicText(property, "city", language, property.city)}
            </span>
            {getDynamicText(property, "address", language, property.address) && (
              <span>{getDynamicText(property, "address", language, property.address)}</span>
            )}
          </div>

          <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-normal text-[#0D2B52]">
            {getDynamicText(property, "title", language)}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              {capacity} {t("properties.guests")}
            </Badge>
            <Badge variant="outline" className="rounded-md px-3 py-1">
              {property.bedrooms || 1} {t("properties.bedrooms")}
            </Badge>
            <Badge variant="outline" className="rounded-md px-3 py-1">
              {property.bathrooms || 1} {t("properties.bathrooms")}
            </Badge>
            <Badge variant="outline" className="rounded-md px-3 py-1">
              {t("property.minimumStay")} {property.minimumNights || 1} {t("property.minimumNight")}
            </Badge>
          </div>
        </div>

        <div className="premium-reveal mb-10">
          <ProductMediaGallery
            title={getDynamicText(property, "title", language)}
            titleEntity={property}
            media={property.images}
            fallbackImage={fallbackImage}
          />
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] items-start">
          <div className="space-y-10">
            <section className="border-b border-[#D4AF37]/20 pb-10">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: Users,
                    label: t("property.capacity"),
                    value: `${capacity} ${t("properties.guests")}`,
                  },
                  {
                    icon: BedDouble,
                    label: t("properties.bedrooms"),
                    value: `${property.bedrooms || 1}`,
                  },
                  {
                    icon: Bath,
                    label: t("properties.bathrooms"),
                    value: `${property.bathrooms || 1}`,
                  },
                  {
                    icon: CalendarDays,
                    label: t("property.minimumStay"),
                    value: `${property.minimumNights || 1} ${t("property.minimumNight")}`,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="premium-hover-lift rounded-lg border border-[#D4AF37]/20 bg-white p-4"
                    >
                      <Icon className="h-5 w-5 text-[#B68D40]" />
                      <p className="mt-3 text-sm text-slate-500">
                        {item.label}
                      </p>
                      <p className="font-semibold text-[#0D2B52]">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-b border-[#D4AF37]/20 pb-10">
              <h2 className="text-2xl font-semibold">
                {t("property.about")}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
                {getDynamicText(property, "description", language) || t("property.descriptionPending")}
              </p>
            </section>

            {property.features && property.features.length > 0 && (
              <section className="border-b border-[#D4AF37]/20 pb-10">
                <h2 className="text-2xl font-semibold">
                  {t("property.features")}
                </h2>

                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  {property.features.map((feature) => (
                    <div
                      key={feature.id}
                      className="premium-hover-lift flex items-center gap-3 rounded-lg border border-[#D4AF37]/20 bg-white p-4"
                    >
                      <Sparkles className="h-5 w-5 text-[#B68D40]" />
                      <span className="text-slate-700">
                        {getDynamicText(feature, "name", language)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="border-b border-[#D4AF37]/20 pb-10">
              <h2 className="text-2xl font-semibold">
                {t("property.premiumServices")}
              </h2>

              {extras.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-[#D4AF37]/40 bg-white p-6 text-center text-slate-500">
                  {t("property.noPremiumServices")}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {extras.map((item) => {
                    const selected = selectedExtras.includes(Number(item.id));

                    return (
                      <label
                        key={item.id}
                        className={`premium-hover-lift grid cursor-pointer gap-4 rounded-lg border bg-white p-4 transition sm:grid-cols-[1fr_auto] ${
                          selected
                            ? "border-[#B68D40] ring-1 ring-[#B68D40]"
                            : "border-[#D4AF37]/20 hover:border-[#B68D40]"
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleExtra(Number(item.id))}
                            className="mt-1 h-4 w-4 shrink-0"
                          />

                          <div className="min-w-0">
                            <p className="font-semibold text-[#0D2B52]">
                              {getDynamicText(item, "name", language)}
                            </p>
                            {getDynamicText(item, "description", language) && (
                              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">
                                {getDynamicText(item, "description", language)}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 font-semibold text-[#B68D40] sm:text-right">
                          + {money(item.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="border-b border-[#D4AF37]/20 pb-10">
              <h2 className="text-2xl font-semibold">{t("property.rules")}</h2>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div className="premium-hover-lift rounded-lg border border-[#D4AF37]/20 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#B68D40]" />
                    <p className="font-semibold">{t("property.checkInOut")}</p>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>{t("property.checkIn")}: {property.checkInTime || t("property.askAdvisor")}</p>
                    <p>{t("property.checkOut")}: {property.checkOutTime || t("property.askAdvisor")}</p>
                  </div>
                </div>

                <div className="premium-hover-lift rounded-lg border border-[#D4AF37]/20 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#B68D40]" />
                    <p className="font-semibold">{t("property.cancellation")}</p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {getDynamicText(
                      property,
                      "cancellationPolicy",
                      language,
                      property.cancellationPolicy
                    ) || t("property.askAdvisor")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rules.map((rule) => {
                  const Icon = rule.icon;

                  return (
                    <div
                      key={rule.label}
                      className="premium-hover-lift rounded-lg border border-[#D4AF37]/20 bg-white p-4"
                    >
                      <Icon className="h-5 w-5 text-[#B68D40]" />
                      <p className="mt-3 text-sm text-slate-500">
                        {rule.label}
                      </p>
                      <p className="font-semibold">{rule.value}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">{t("property.location")}</h2>

              <div className="premium-hover-lift mt-5 rounded-lg border border-[#D4AF37]/20 bg-white p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-[#B68D40]" />
                  <div>
                    <p className="font-semibold">
                      {getDynamicText(property, "area", language, property.area)}, {getDynamicText(property, "city", language, property.city)}
                    </p>
                    {getDynamicText(property, "address", language, property.address) && (
                      <p className="mt-1 text-sm text-slate-600">
                        {getDynamicText(property, "address", language, property.address)}
                      </p>
                    )}
                    {property.latitude && property.longitude && (
                      <p className="mt-2 text-sm text-slate-500">
                        {t("property.coordinates")}: {property.latitude}, {property.longitude}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="premium-reveal premium-delay-1 sticky top-24 rounded-lg border border-[#D4AF37]/30 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl sm:p-6 lg:min-w-[360px] lg:max-w-[430px]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#B68D40]">
              {t("property.reserve")}
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-3xl font-semibold leading-tight text-[#0D2B52] sm:text-4xl">
                  <BookingMoney
                    value={pricing.nightly}
                    language={language}
                    amountClassName="font-semibold"
                  />
                </p>
                <p className="text-sm text-slate-500">{t("properties.perNight")}</p>
              </div>

              <div className="text-left text-sm leading-6 text-slate-500 sm:text-right">
                <p>{capacity} {t("properties.guests")}</p>
                <p>{t("property.minimumStay")} {property.minimumNights || 1} {t("property.minimumNight")}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3.5 border-t border-[#D4AF37]/20 pt-5 text-sm">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="min-w-0 text-slate-600">
                  {pricing.minimumNights} {t("checkout.nights")} x{" "}
                  <BookingMoney value={pricing.nightly} language={language} />
                </span>
                <BookingMoney
                  value={pricing.stay}
                  language={language}
                  className="font-medium sm:justify-end sm:text-right"
                />
              </div>

              {pricing.cleaning > 0 && (
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="min-w-0 text-slate-600">{t("property.cleaning")}</span>
                  <BookingMoney value={pricing.cleaning} language={language} className="font-medium sm:justify-end sm:text-right" />
                </div>
              )}

              {pricing.service > 0 && (
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="min-w-0 text-slate-600">{t("property.service")}</span>
                  <BookingMoney value={pricing.service} language={language} className="font-medium sm:justify-end sm:text-right" />
                </div>
              )}

              {pricing.taxes > 0 && (
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="min-w-0 text-slate-600">{t("property.taxes")}</span>
                  <BookingMoney value={pricing.taxes} language={language} className="font-medium sm:justify-end sm:text-right" />
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="min-w-0 text-slate-600">{t("property.premiumServices")}</span>
                <BookingMoney value={extrasTotal} language={language} className="font-medium sm:justify-end sm:text-right" />
              </div>
            </div>

            {selectedExtrasData.length > 0 && (
              <div className="mt-5 rounded-lg bg-[#F8F6F1] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Gem className="h-4 w-4 text-[#B68D40]" />
                  {t("property.selected")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {selectedExtrasData.map((extra) => (
                    <div key={extra.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <span className="min-w-0">{getDynamicText(extra, "name", language)}</span>
                      <BookingMoney value={extra.price} language={language} className="font-medium text-[#0D2B52] sm:justify-end sm:text-right" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-[#D4AF37]/20 pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="font-semibold">{t("property.totalEstimate")}</span>
                <BookingMoney
                  value={pricing.total}
                  language={language}
                  className="text-2xl font-semibold text-[#0D2B52] sm:justify-end sm:text-right"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t("property.finalAfterDates")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t("checkout.currencyApproxNote")}
              </p>
            </div>

            <Link
              href={checkoutHref}
              onClick={() =>
                trackInitiateCheckout("PROPERTY", property.id, pricing.total)
              }
            >
              <Button className="premium-soft-button mt-6 h-12 w-full rounded-md bg-[#0D2B52] hover:bg-[#12396d]">
                {t("property.bookNow")}
              </Button>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
