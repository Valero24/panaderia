"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gem } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookingMoney from "@/components/BookingMoney";
import { useTranslation } from "@/context/LanguageContext";
import { trackInitiateCheckout } from "@/lib/analytics";
import { getDynamicText, type DynamicTranslations } from "@/lib/dynamic-translations";

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active?: boolean;
  translations?: DynamicTranslations | null;
};

type ExperienceBookingCardProps = {
  experienceId: number;
  basePrice: number;
  extras: ExtraService[];
};

export default function ExperienceBookingCard({
  experienceId,
  basePrice,
  extras,
}: ExperienceBookingCardProps) {
  const { language, t } = useTranslation();
  const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const activeExtras = extras.filter((extra) => extra.active !== false);

  const selectedExtras = useMemo(() => {
    return activeExtras.filter((extra) => selectedExtraIds.includes(extra.id));
  }, [activeExtras, selectedExtraIds]);

  const extrasTotal = selectedExtras.reduce((acc, extra) => {
    const quantity = quantities[extra.id] || 1;
    return acc + Number(extra.price || 0) * quantity;
  }, 0);

  const checkoutUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "EXPERIENCE",
    });

    if (selectedExtraIds.length > 0) {
      params.set("extras", selectedExtraIds.join(","));
    }

    return `/checkout/${experienceId}?${params.toString()}`;
  }, [experienceId, selectedExtraIds]);

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
                  <span className="inline-flex shrink-0 items-baseline gap-1 font-semibold text-[#B48A5A] sm:justify-end sm:text-right">
                    <span>+</span>
                    <BookingMoney value={extra.price} language={language} />
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

      <div className="space-y-3.5 rounded-xl bg-[#F8F6F1] p-4 text-sm">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="min-w-0 text-slate-600">{t("experience.basePerson")}</span>
          <BookingMoney value={basePrice} language={language} className="font-medium sm:justify-end sm:text-right" />
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="min-w-0 text-slate-600">{t("checkout.premiumServices")}</span>
          <BookingMoney value={extrasTotal} language={language} className="font-medium sm:justify-end sm:text-right" />
        </div>
        <div className="flex flex-col gap-2 border-t border-[#D4AF37]/20 pt-3 font-semibold sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span>{t("checkout.totalEstimate")}</span>
          <BookingMoney value={basePrice + extrasTotal} language={language} className="text-lg text-[#0D2B52] sm:justify-end sm:text-right" />
        </div>
        <p className="pt-1 text-xs leading-5 text-slate-500">
          {t("checkout.currencyApproxNote")}
        </p>
      </div>

      <Link href={checkoutUrl}>
        <Button
          onClick={() =>
            trackInitiateCheckout(
              "EXPERIENCE",
              experienceId,
              basePrice + extrasTotal
            )
          }
          className="premium-soft-button h-12 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
        >
          {t("experience.book")}
        </Button>
      </Link>
    </div>
  );
}
