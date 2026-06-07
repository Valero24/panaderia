"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  HelpCircle,
  ListChecks,
  MapPin,
  ShieldCheck,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/context/LanguageContext";
import {
  getDynamicText,
  getDynamicValue,
  type DynamicTranslations,
} from "@/lib/dynamic-translations";

type ExperienceSeo = {
  seoContent?: string | null;
  itinerary?: string | null;
  included?: string | null;
  notIncluded?: string | null;
  meetingPoint?: string | null;
  durationDescription?: string | null;
  schedule?: string | null;
  recommendations?: string | null;
  policies?: string | null;
  conditions?: string | null;
  faq?: unknown;
  translations?: DynamicTranslations | null;
};

type FaqItem = {
  question?: string | null;
  answer?: string | null;
};

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function splitItems(value?: string | null) {
  return (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFaq(value: unknown): FaqItem[] {
  if (typeof value === "string") {
    try {
      return normalizeFaq(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? (item as FaqItem)
        : null
    )
    .filter(
      (item): item is FaqItem =>
        Boolean(item?.question?.trim() && item?.answer?.trim())
    );
}

function TextCard({
  title,
  text,
  icon: Icon,
  wide = false,
}: {
  title: string;
  text: string;
  icon: LucideIcon;
  wide?: boolean;
}) {
  if (!hasText(text)) return null;

  return (
    <Card className={`rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm ${wide ? "md:col-span-2" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[#B48A5A]" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  text,
  icon: Icon,
  positive = true,
}: {
  title: string;
  text: string;
  icon: LucideIcon;
  positive?: boolean;
}) {
  const items = splitItems(text);

  if (!hasText(text)) return null;

  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[#B48A5A]" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {items.length > 1 ? (
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            {items.map((item) => (
              <li key={item} className="flex gap-3">
                {positive ? (
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#B48A5A]" />
                ) : (
                  <XCircle className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
            {text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExperienceSeoSections({
  experience,
}: {
  experience: ExperienceSeo;
}) {
  const { language, t } = useTranslation();
  const seoContent = getDynamicText(
    experience,
    "seoContent",
    language,
    experience.seoContent
  );
  const itinerary = getDynamicText(
    experience,
    "itinerary",
    language,
    experience.itinerary
  );
  const included = getDynamicText(
    experience,
    "included",
    language,
    experience.included
  );
  const notIncluded = getDynamicText(
    experience,
    "notIncluded",
    language,
    experience.notIncluded
  );
  const meetingPoint = getDynamicText(
    experience,
    "meetingPoint",
    language,
    experience.meetingPoint
  );
  const durationDescription = getDynamicText(
    experience,
    "durationDescription",
    language,
    experience.durationDescription
  );
  const schedule = getDynamicText(
    experience,
    "schedule",
    language,
    experience.schedule
  );
  const recommendations = getDynamicText(
    experience,
    "recommendations",
    language,
    experience.recommendations
  );
  const conditions = getDynamicText(
    experience,
    "conditions",
    language,
    experience.conditions || experience.policies
  );
  const faqItems = normalizeFaq(
    getDynamicValue(experience, "faq", language, experience.faq)
  );
  const timing = [durationDescription, schedule].filter(Boolean).join("\n");
  const hasAnySection =
    hasText(seoContent) ||
    hasText(itinerary) ||
    hasText(timing) ||
    hasText(meetingPoint) ||
    hasText(included) ||
    hasText(notIncluded) ||
    hasText(conditions) ||
    hasText(recommendations) ||
    faqItems.length > 0;

  if (!hasAnySection) return null;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <TextCard
        title={t("experience.about")}
        text={seoContent}
        icon={Sparkles}
        wide
      />
      <ListCard
        title={t("experience.whatYouWillLive")}
        text={itinerary}
        icon={ListChecks}
      />
      <TextCard
        title={t("experience.durationAndSchedule")}
        text={timing}
        icon={Clock}
      />
      <TextCard
        title={t("experience.meetingPoint")}
        text={meetingPoint}
        icon={MapPin}
      />
      <ListCard
        title={t("experience.included")}
        text={included}
        icon={CheckCircle2}
      />
      <ListCard
        title={t("experience.notIncluded")}
        text={notIncluded}
        icon={XCircle}
        positive={false}
      />
      <TextCard
        title={t("experience.conditions")}
        text={conditions}
        icon={ShieldCheck}
      />
      <TextCard
        title={t("experience.recommendations")}
        text={recommendations}
        icon={CalendarDays}
      />

      {faqItems.length > 0 && (
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-[#B48A5A]" />
              <h2 className="text-xl font-semibold">
                {t("experience.faq")}
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={`${item.question}-${index}`}
                  className="rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-[#0D2B52]">
                    {item.question}
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
