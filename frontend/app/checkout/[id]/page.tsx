"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Gem,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";
import { trackInitiateCheckout, trackLead } from "@/lib/analytics";
import { cleanPublicCopy } from "@/lib/public-copy";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PropertyImage = {
  id: number;
  url: string;
  mediaType?: "IMAGE" | "VIDEO" | string | null;
  isPrimary?: boolean;
  active?: boolean | null;
};

type Property = {
  id: number;
  title: string;
  city?: string;
  area?: string;
  description?: string;
  pricePerNight: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  maxGuests?: number;
  maxCapacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  minimumNights?: number;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  images?: PropertyImage[];
};

type Experience = {
  id: number;
  title: string;
  shortDescription?: string;
  description?: string;
  location?: string;
  duration?: string;
  maxGuests?: number;
  basePrice: number;
  category?: string;
  mainImage?: string | null;
  images?: PropertyImage[];
};

type PackageItem = {
  id: number;
  title: string;
  shortDescription?: string;
  description?: string;
  duration?: string;
  location?: string;
  maxGuests?: number;
  basePrice: number;
  mainImage?: string | null;
  category?: string;
  images?: PropertyImage[];
};

type ExtraService = {
  id: number;
  name: string;
  description?: string;
  price: number;
  propertyId?: number | null;
  experienceId?: number | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1800";

const paymentMethods = [
  "PSE",
  "Tarjeta debito",
  "Tarjeta credito",
  "PayPal",
];

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

function firstImage(
  images?: PropertyImage[],
  mainImage?: string | null
) {
  const activeImages = (images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    mainImage ||
    activeImages.find((image) => image.isPrimary)?.url ||
    activeImages[0]?.url ||
    fallbackImage
  );
}

function daysBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function CheckoutPage({ params }: PageProps) {
  const { t } = useTranslation();
  const { id } = use(params);
  const searchParams = useSearchParams();
  const productId = Number(id);
  const typeParam = searchParams.get("type");
  const productType =
    typeParam === "EXPERIENCE"
      ? "EXPERIENCE"
      : typeParam === "PACKAGE"
        ? "PACKAGE"
        : "PROPERTY";

  const initialExtraIds = useMemo(() => {
    const raw = searchParams.get("extras");

    if (!raw) return [];

    return raw
      .split(",")
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
  }, [searchParams]);

  const [property, setProperty] = useState<Property | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [packageItem, setPackageItem] = useState<PackageItem | null>(null);
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>(initialExtraIds);
  const [extraQuantities, setExtraQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethodPreferred, setPaymentMethodPreferred] = useState("PSE");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoadError("");
        setProperty(null);
        setExperience(null);
        setPackageItem(null);
        setExtras([]);

        if (productType === "EXPERIENCE") {
          const experienceRes = await fetch(
            apiUrl(`/experiences/${productId}`)
          );

          if (!experienceRes.ok) {
            throw new Error("No se pudo cargar la experiencia");
          }

          setExperience(await experienceRes.json());

          const extrasRes = await fetch(
            apiUrl(`/extras/experience/${productId}`)
          );
          const extrasData = await extrasRes.json();

          setExtras(
            Array.isArray(extrasData)
              ? extrasData
              : extrasData?.data || extrasData?.extras || []
          );
          return;
        }

        if (productType === "PACKAGE") {
          const packageRes = await fetch(
            apiUrl(`/packages/${productId}`)
          );

          if (!packageRes.ok) {
            throw new Error("No se pudo cargar el paquete");
          }

          setPackageItem(await packageRes.json());

          const extrasRes = await fetch(
            apiUrl(`/extras/package/${productId}`)
          );
          const extrasData = await extrasRes.json();

          setExtras(
            Array.isArray(extrasData)
              ? extrasData
              : extrasData?.data || extrasData?.extras || []
          );
          return;
        }

        const propertyRes = await fetch(
          apiUrl(`/properties/${productId}`)
        );

        if (!propertyRes.ok) {
          throw new Error("No se pudo cargar el alojamiento");
        }

        setProperty(await propertyRes.json());

        const extrasRes = await fetch(
          apiUrl(`/extras/property/${productId}`)
        );
        const extrasData = await extrasRes.json();

        setExtras(
          Array.isArray(extrasData)
            ? extrasData
            : extrasData?.data || extrasData?.extras || []
        );
      } catch (error) {
        console.error(error);
        setLoadError(t("checkout.loadError"));
      }
    }

    if (productId) {
      fetchData();
    }
  }, [productId, productType]);

  useEffect(() => {
    setExtraQuantities((prev) => {
      const next = { ...prev };

      for (const extraId of initialExtraIds) {
        if (!next[extraId]) {
          next[extraId] = 1;
        }
      }

      return next;
    });
  }, [initialExtraIds]);

  const selectedExtras = useMemo(() => {
    return extras.filter((item) =>
      selectedExtraIds.includes(Number(item.id))
    );
  }, [extras, selectedExtraIds]);

  const nights = useMemo(() => daysBetween(checkIn, checkOut), [
    checkIn,
    checkOut,
  ]);

  const propertyMinimumNights = useMemo(() => {
    return Math.max(Number(property?.minimumNights || 1), 1);
  }, [property]);

  const propertyEstimateNights = useMemo(() => {
    if (productType !== "PROPERTY") return nights;

    return nights > 0 ? nights : propertyMinimumNights;
  }, [nights, productType, propertyMinimumNights]);

  const product =
    productType === "EXPERIENCE"
      ? experience
      : productType === "PACKAGE"
        ? packageItem
        : property;

  useEffect(() => {
    if (product) {
      trackInitiateCheckout(
        productType,
        productId,
        productType === "PROPERTY"
          ? property?.pricePerNight
          : productType === "EXPERIENCE"
            ? experience?.basePrice
            : packageItem?.basePrice
      );
    }
  }, [product, productType, productId, property, experience, packageItem]);

  const maxGuests = packageItem
    ? packageItem.maxGuests || 1
    : experience
    ? experience.maxGuests || 1
    : property
    ? Math.min(property.maxGuests || 1, property.maxCapacity || property.maxGuests || 1)
    : 1;

  const pricing = useMemo(() => {
    if (productType === "PACKAGE") {
      const base = Number(packageItem?.basePrice || 0);
      const extrasTotal = selectedExtras.reduce((acc, item) => {
        const quantity = extraQuantities[item.id] || 1;
        return acc + Number(item.price || 0) * quantity;
      }, 0);

      return {
        nightly: base,
        stay: base,
        cleaning: 0,
        service: 0,
        taxes: 0,
        extrasTotal,
        estimate: base + extrasTotal,
      };
    }

    if (productType === "EXPERIENCE") {
      const base = Number(experience?.basePrice || 0);
      const people = Math.max(Number(guests || 1), 1);
      const extrasTotal = selectedExtras.reduce((acc, item) => {
        const quantity = extraQuantities[item.id] || 1;
        return acc + Number(item.price || 0) * quantity;
      }, 0);

      return {
        nightly: base,
        stay: base * people,
        cleaning: 0,
        service: 0,
        taxes: 0,
        extrasTotal,
        estimate: base * people + extrasTotal,
      };
    }

    const nightly = Number(property?.pricePerNight || 0);
    const stay = nightly * propertyEstimateNights;
    const cleaning = Number(property?.cleaningFee || 0);
    const service = Number(property?.serviceFee || 0);
    const taxes = Number(property?.taxes || 0);
    const extrasTotal = selectedExtras.reduce((acc, item) => {
      const quantity = extraQuantities[item.id] || 1;
      return acc + Number(item.price || 0) * quantity;
    }, 0);

    return {
      nightly,
      stay,
      cleaning,
      service,
      taxes,
      extrasTotal,
      estimate: stay + cleaning + service + taxes + extrasTotal,
    };
  }, [
    productType,
    packageItem,
    experience,
    property,
    propertyEstimateNights,
    selectedExtras,
    extraQuantities,
    guests,
  ]);

  const heroImage =
    productType === "EXPERIENCE"
      ? firstImage(experience?.images, experience?.mainImage)
      : productType === "PACKAGE"
        ? firstImage(packageItem?.images, packageItem?.mainImage)
        : firstImage(product?.images);

  const validationMessage = useMemo(() => {
    if (Number.isNaN(productId)) return t("checkout.validation.invalidProduct");
    if (!product) {
      return productType === "EXPERIENCE"
        ? t("checkout.loadingExperience")
        : productType === "PACKAGE"
          ? t("checkout.loadingPackage")
        : t("checkout.loadingProperty");
    }
    if (!customerName.trim()) return t("checkout.validation.fullName");
    if (!email.trim() || !isEmail(email)) return t("checkout.validation.email");
    if (!phone.trim()) return t("checkout.validation.whatsapp");
    if (!checkIn || !checkOut) return t("checkout.validation.dates");
    if (new Date(checkOut) <= new Date(checkIn)) {
      return t("checkout.validation.dateOrder");
    }
    if (
      productType === "PROPERTY" &&
      property &&
      nights < (property.minimumNights || 1)
    ) {
      return `${t("checkout.validation.minimumStay")} ${
        property.minimumNights || 1
      } ${t("checkout.nights")}.`;
    }
    if (Number(guests) < 1) return t("checkout.validation.guests");
    if (Number(guests) > maxGuests) {
      return `${t("checkout.validation.maxCapacity")} ${maxGuests} ${t(
        "checkout.guests"
      )}.`;
    }

    return "";
  }, [
    productId,
    productType,
    product,
    property,
    packageItem,
    customerName,
    email,
    phone,
    checkIn,
    checkOut,
    nights,
    guests,
    maxGuests,
  ]);

  function toggleExtra(extraId: number) {
    setSelectedExtraIds((prev) => {
      if (prev.includes(extraId)) {
        return prev.filter((id) => id !== extraId);
      }

      setExtraQuantities((current) => ({
        ...current,
        [extraId]: current[extraId] || 1,
      }));

      return [...prev, extraId];
    });
  }

  function updateExtraQuantity(extraId: number, value: string) {
    const quantity = Math.max(Number(value || 1), 1);

    setExtraQuantities((prev) => ({
      ...prev,
      [extraId]: quantity,
    }));
  }

  async function submitAssistedRequest() {
    if (!product) return;

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setMessage("");
    setRequestId(null);

    try {
      const response = await fetch(apiUrl("/pre-reservations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          email,
          customerPhone: phone,
          customerCountry: country,
          paymentMethodPreferred,
          specialRequests,
          type: productType,
          referenceId: productId,
          checkIn,
          checkOut,
          guests: Number(guests),
          selectedExtras: selectedExtras.map((item) => ({
            id: item.id,
            quantity: extraQuantities[item.id] || 1,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || t("checkout.error"));
        return;
      }

      setRequestId(data.id);
      trackLead("checkout_assisted_request", {
        content_type: productType,
        content_id: String(productId),
        value: pricing.estimate,
        currency: "COP",
      });
      setMessage(
        `${t("checkout.requestSent")} ${t("checkout.advisorWillContact")}`
      );
    } catch (error) {
      console.error(error);
      setMessage(t("checkout.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.32em] text-[#B68D40]">
            {t("checkout.eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            {t("checkout.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            {t("checkout.subtitle")}
          </p>
        </div>

        {loadError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {loadError}
          </div>
        )}

        {requestId && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5 text-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">{t("checkout.sentTitle")}</p>
                <p className="mt-1 text-sm">
                  {t("checkout.sentMessage")} {t("checkout.reference")}: {requestId}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid min-w-0 gap-8 items-start lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-6">
            <Card className="rounded-lg border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="h-48 w-full shrink-0 overflow-hidden rounded-lg bg-slate-200 sm:h-32 sm:w-44">
                    <img
                      src={heroImage}
                      alt={cleanPublicCopy(product?.title) || t("shared.premiumStay")}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-md">
                        {productType === "EXPERIENCE"
                          ? t("shared.premiumExperience")
                          : productType === "PACKAGE"
                            ? t("shared.premiumPackage")
                            : t("shared.premiumStay")}
                      </Badge>
                      <Badge variant="outline" className="rounded-md">
                        {t("shared.validationAssisted")}
                      </Badge>
                    </div>

                    <h2 className="mt-3 text-2xl font-semibold">
                      {cleanPublicCopy(product?.title) ||
                        (productType === "EXPERIENCE"
                          ? t("checkout.loadingExperience")
                          : productType === "PACKAGE"
                            ? t("checkout.loadingPackage")
                          : t("checkout.loadingProperty"))}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-[#B68D40]" />
                      {packageItem
                        ? cleanPublicCopy(packageItem.location) || "Cartagena"
                        : experience
                        ? cleanPublicCopy(experience.location) || "Cartagena"
                        : `${property?.area || "Cartagena"}, ${
                            property?.city || "Colombia"
                          }`}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t("shared.max")} {maxGuests} {t("checkout.guests")}
                      </span>
                      {productType === "EXPERIENCE" || productType === "PACKAGE" ? (
                        <span>
                          {experience?.duration ||
                            packageItem?.duration ||
                            t("shared.durationToCoordinate")}
                        </span>
                      ) : (
                        <>
                          <span>
                            {t("property.minimumStay")} {property?.minimumNights || 1} {t("property.minimumNight")}
                          </span>
                          <span>
                            {t("property.checkIn")} {property?.checkInTime || t("property.askAdvisor")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-[#B68D40]" />
                  <h2 className="text-xl font-semibold">{t("checkout.guestData")}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.fullName")}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder={t("checkout.email")}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Input
                    placeholder={t("checkout.whatsapp")}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                  <Input
                    placeholder={t("checkout.country")}
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#B68D40]" />
                  <h2 className="text-xl font-semibold">
                    {productType === "EXPERIENCE"
                      ? t("checkout.experienceDetails")
                      : productType === "PACKAGE"
                        ? t("checkout.packageDetails")
                      : t("checkout.stayDetails")}
                  </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {productType === "EXPERIENCE" || productType === "PACKAGE"
                        ? t("checkout.start")
                        : t("checkout.entry")}
                    </label>
                    <Input
                      type="date"
                      value={checkIn}
                      onChange={(event) => setCheckIn(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {productType === "EXPERIENCE" || productType === "PACKAGE"
                        ? t("checkout.end")
                        : t("checkout.exit")}
                    </label>
                    <Input
                      type="date"
                      value={checkOut}
                      onChange={(event) => setCheckOut(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {t("checkout.guests")}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={maxGuests}
                      value={guests}
                      onChange={(event) => setGuests(event.target.value)}
                    />
                  </div>
                </div>

                <Textarea
                  placeholder={t("checkout.optionalComments")}
                  value={specialRequests}
                  onChange={(event) => setSpecialRequests(event.target.value)}
                  className="min-h-28"
                />
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Gem className="h-5 w-5 text-[#B68D40]" />
                  <h2 className="text-xl font-semibold">{t("checkout.premiumServices")}</h2>
                </div>

                <div className="mt-5 space-y-3">
                  {extras.length > 0 ? (
                    extras.map((item) => {
                      const selected = selectedExtraIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-4 ${
                            selected
                              ? "border-[#B68D40] bg-[#F8F6F1]"
                              : "border-[#D4AF37]/20"
                          }`}
                        >
                          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                            <label className="flex min-w-0 cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleExtra(item.id)}
                                className="mt-1 h-4 w-4 shrink-0"
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold">
                                  {item.name}
                                </span>
                                {item.description && (
                                  <span className="mt-2 block whitespace-pre-line text-sm leading-6 text-slate-500">
                                    {item.description}
                                  </span>
                                )}
                              </span>
                            </label>

                            <span className="shrink-0 font-semibold text-[#B68D40] sm:text-right">
                              + {money(item.price)}
                            </span>
                          </div>

                          {selected && (
                            <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#D4AF37]/20 pt-4">
                              <span className="text-sm text-slate-600">
                                {t("checkout.quantity")}
                              </span>
                              <Input
                                type="number"
                                min={1}
                                value={extraQuantities[item.id] || 1}
                                onChange={(event) =>
                                  updateExtraQuantity(item.id, event.target.value)
                                }
                                className="h-10 w-24"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#D4AF37]/40 p-5 text-slate-500">
                      {t("checkout.noExtras")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-6">
            <Card className="rounded-lg border border-[#D4AF37]/30 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[#B68D40]" />
                  <h2 className="text-xl font-semibold">{t("checkout.summary")}</h2>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      {productType === "EXPERIENCE"
                        ? `${Number(guests || 1)} ${t("shared.people")} x ${money(
                            pricing.nightly
                          )}`
                        : productType === "PACKAGE"
                          ? `${t("package.base")} x ${money(pricing.nightly)}`
                        : `${propertyEstimateNights} ${t(
                            "checkout.nights"
                          )} x ${money(pricing.nightly)}`}
                    </span>
                    <span>{money(pricing.stay)}</span>
                  </div>
                  {productType === "PROPERTY" && nights === 0 && (
                    <p className="-mt-1 text-xs text-slate-500">
                      Estimado con estadía mínima. Selecciona fechas para
                      calcular las noches reales.
                    </p>
                  )}
                  {pricing.cleaning > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("property.cleaning")}</span>
                      <span>{money(pricing.cleaning)}</span>
                    </div>
                  )}
                  {pricing.service > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("property.service")}</span>
                      <span>{money(pricing.service)}</span>
                    </div>
                  )}
                  {pricing.taxes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("checkout.estimatedTaxes")}</span>
                      <span>{money(pricing.taxes)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t("checkout.premiumServices")}</span>
                    <span>{money(pricing.extrasTotal)}</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#D4AF37]/20 pt-5">
                  <div className="flex justify-between">
                    <span className="font-semibold">{t("checkout.totalEstimate")}</span>
                    <span className="text-2xl font-semibold">
                      {money(pricing.estimate)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {t("property.finalAfterDates")}
                  </p>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium">
                    {t("checkout.paymentMethod")}
                  </label>
                  <select
                    value={paymentMethodPreferred}
                    onChange={(event) =>
                      setPaymentMethodPreferred(event.target.value)
                    }
                    className="h-11 w-full rounded-md border border-[#D4AF37]/30 bg-white px-3 text-sm"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method === "PSE"
                          ? t("checkout.payment.pse")
                          : method === "Tarjeta debito"
                          ? t("checkout.payment.debit")
                          : method === "Tarjeta credito"
                            ? t("checkout.payment.credit")
                            : t("checkout.payment.paypal")}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    El pago será coordinado por un asesor después de validar tu
                    solicitud. No se realiza ningún cobro en este paso.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={submitAssistedRequest}
                  disabled={loading || Boolean(requestId)}
                  className="mt-6 h-12 w-full rounded-md bg-[#0D2B52] hover:bg-[#12396d]"
                >
                  {loading ? t("checkout.sending") : t("checkout.validateAvailability")}
                </Button>

                {message && (
                  <div
                    className={`mt-4 rounded-lg p-4 text-sm ${
                      requestId
                        ? "bg-green-50 text-green-700"
                        : "bg-[#F8F6F1] text-slate-700"
                    }`}
                  >
                    {requestId && (
                      <CheckCircle2 className="mb-2 h-5 w-5" />
                    )}
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-[#D4AF37]/30 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#B68D40]" />
                  <h2 className="font-semibold">{t("checkout.personalAttention")}</h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("checkout.noCharge")}
                </p>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-[#B68D40]" />
                    {t("checkout.whatsappInfo")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#B68D40]" />
                    {t("checkout.emailInfo")}
                  </div>
                </div>

                {/* Stripe queda instalado temporalmente. La migracion a Wompi se hara en el bloque de pagos. */}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
