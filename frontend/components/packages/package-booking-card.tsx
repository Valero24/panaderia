"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Gem, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/context/LanguageContext";
import { trackInitiateCheckout } from "@/lib/analytics";
import { formatMoneyByLanguage } from "@/lib/currency";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active?: boolean;
  translations?: DynamicTranslations | null;
};

type PackageComponent = {
  id: number;
  title: string;
  shortDescription?: string | null;
  duration?: string | null;
  location?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  translations?: DynamicTranslations | null;
};

type PackageBookingCardProps = {
  packageId: number;
  basePrice: number;
  extras: ExtraService[];
  components?: PackageComponent[];
};

export default function PackageBookingCard({
  packageId,
  basePrice,
  extras,
  components = [],
}: PackageBookingCardProps) {
  const { language, t } = useTranslation();
  const money = (value?: number | null) => formatMoneyByLanguage(value, language);
  const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const activeExtras = extras.filter((extra) => extra.active !== false);
  const activeComponents = components
    .filter((component) => component.active !== false && getDynamicText(component, "title", language))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const selectedExtras = useMemo(
    () => activeExtras.filter((extra) => selectedExtraIds.includes(extra.id)),
    [activeExtras, selectedExtraIds]
  );

  const extrasTotal = selectedExtras.reduce((acc, extra) => {
    const quantity = quantities[extra.id] || 1;
    return acc + Number(extra.price || 0) * quantity;
  }, 0);

  const checkoutUrl = useMemo(() => {
    const params = new URLSearchParams({ type: "PACKAGE" });

    if (selectedExtraIds.length > 0) {
      params.set("extras", selectedExtraIds.join(","));
    }

    return `/checkout/${packageId}?${params.toString()}`;
  }, [packageId, selectedExtraIds]);

  function toggleExtra(id: number) {
    setSelectedExtraIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      setQuantities((previous) => ({
        ...previous,
        [id]: previous[id] || 1,
      }));

      return [...current, id];
    });
  }

  function updateQuantity(id: number, value: string) {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(Number(value || 1), 1),
    }));
  }

  return (
    <div className="space-y-6">
      {activeComponents.length > 0 && (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#B48A5A]" />
            <h3 className="font-semibold">{t("packageDetail.includedTitle")}</h3>
          </div>
          <div className="mt-4 space-y-3">
            {activeComponents.slice(0, 4).map((component, index) => (
              <div key={component.id} className="rounded-xl bg-[#F8F6F1] p-3 text-sm">
                <p className="font-semibold text-[#0D2B52]">
                  {String(index + 1).padStart(2, "0")}.{" "}
                  {getDynamicText(component, "title", language)}
                </p>
                {getDynamicText(component, "shortDescription", language) && (
                  <p className="mt-1 line-clamp-2 leading-5 text-slate-500">
                    {getDynamicText(component, "shortDescription", language)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {getDynamicText(component, "duration", language) && (
                    <span>{getDynamicText(component, "duration", language)}</span>
                  )}
                  {getDynamicText(component, "location", language) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getDynamicText(component, "location", language)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeExtras.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-[#B48A5A]" />
            <h3 className="font-semibold">{t("checkout.premiumServices")}</h3>
          </div>

          {activeExtras.map((extra) => {
            const selected = selectedExtraIds.includes(extra.id);

            return (
              <div
                key={extra.id}
                className={`premium-hover-lift rounded-xl border p-4 text-sm ${
                  selected
                    ? "border-[#B48A5A] bg-[#F8F6F1]"
                    : "border-[#D4AF37]/20"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="flex min-w-0 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleExtra(extra.id)}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {getDynamicText(extra, "name", language)}
                      </span>
                      {getDynamicText(extra, "description", language) && (
                        <span className="mt-2 block whitespace-pre-line leading-6 text-slate-500">
                          {getDynamicText(extra, "description", language)}
                        </span>
                      )}
                    </span>
                  </label>
                  <span className="shrink-0 font-semibold text-[#B48A5A] sm:text-right">
                    + {money(extra.price)}
                  </span>
                </div>

                {selected && (
                  <div className="mt-3 flex items-center justify-between border-t border-[#D4AF37]/20 pt-3">
                    <span className="text-slate-500">{t("checkout.quantity")}</span>
                    <Input
                      type="number"
                      min={1}
                      value={quantities[extra.id] || 1}
                      onChange={(event) =>
                        updateQuantity(extra.id, event.target.value)
                      }
                      className="h-9 w-24"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 rounded-xl bg-[#F8F6F1] p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">{t("package.base")}</span>
          <span>{money(basePrice)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">{t("checkout.premiumServices")}</span>
          <span>{money(extrasTotal)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-[#D4AF37]/20 pt-3 font-semibold">
          <span>{t("checkout.totalEstimate")}</span>
          <span>{money(basePrice + extrasTotal)}</span>
        </div>
        <p className="pt-1 text-xs leading-5 text-slate-500">
          {t("checkout.currencyApproxNote")}
        </p>
      </div>

      <Link href={checkoutUrl}>
        <Button
          onClick={() =>
            trackInitiateCheckout("PACKAGE", packageId, basePrice + extrasTotal)
          }
          className="premium-soft-button h-12 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
        >
          {t("package.book")}
        </Button>
      </Link>
    </div>
  );
}
