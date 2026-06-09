"use client";

import { HelpCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/context/LanguageContext";
import { type TranslatableEntity } from "@/lib/dynamic-translations";
import { getTranslatedFaq } from "@/lib/faq";

type PackageFaqSectionProps = {
  item: TranslatableEntity;
  fallback?: unknown;
};

export default function PackageFaqSection({
  item,
  fallback,
}: PackageFaqSectionProps) {
  const { language, t } = useTranslation();
  const faqItems = getTranslatedFaq(item, language, fallback);

  if (faqItems.length === 0) return null;

  return (
    <Card className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-6 lg:p-8">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-[#B48A5A]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold">{t("packageDetail.faq")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t("packageDetail.faqIntro")}
            </p>
            <div className="mt-5 space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={`${item.question}-${index}`}
                  className="rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F1] p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-[#0D2B52]">
                    {item.question}
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
