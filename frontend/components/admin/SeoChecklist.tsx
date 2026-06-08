"use client";

import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { TranslationMap } from "@/components/admin/translations-model";

type SeoChecklistProps = {
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  image?: string | null;
  translations?: TranslationMap | null;
  minimumWords?: number;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function wordCount(value: unknown) {
  if (!hasText(value)) return 0;
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function hasFaq(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (!item || typeof item !== "object") return false;
      const source = item as { question?: unknown; answer?: unknown };
      return hasText(source.question) && hasText(source.answer);
    });
  }

  if (!hasText(value)) return false;

  try {
    const parsed = JSON.parse(String(value));
    return hasFaq(parsed);
  } catch {
    return String(value).trim().length > 20;
  }
}

function hasEnglishTranslation(translations?: TranslationMap | null) {
  const english = translations?.en;
  if (!english) return false;
  return Object.values(english).some((value) => hasText(value));
}

function seoStatus(completed: number, total: number) {
  if (completed >= total) return "Excelente";
  if (completed >= Math.ceil(total * 0.75)) return "Bueno";
  return "Básico";
}

export default function SeoChecklist({
  slug,
  seoTitle,
  seoDescription,
  seoContent,
  faq,
  image,
  translations,
  minimumWords = 700,
}: SeoChecklistProps) {
  const words = wordCount(seoContent);
  const checks = [
    { label: "Tiene slug", done: hasText(slug) },
    { label: "Tiene title SEO", done: hasText(seoTitle) },
    { label: "Tiene meta description", done: hasText(seoDescription) },
    { label: "Tiene contenido SEO", done: hasText(seoContent) },
    { label: "Tiene FAQ", done: hasFaq(faq) },
    { label: "Tiene imagen principal", done: hasText(image) },
      { label: "Tiene traducción EN", done: hasEnglishTranslation(translations) },
      {
        label: `Tiene contenido mínimo recomendado (${minimumWords}+ palabras)`,
      done: words >= minimumWords,
      hint: `${words} palabras`,
    },
  ];
  const completed = checks.filter((item) => item.done).length;
  const status = seoStatus(completed, checks.length);
  const statusClass =
    status === "Excelente"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "Bueno"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#FBF8EF] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B68D40]">
            Estado SEO
          </p>
          <h3 className="mt-1 text-xl font-bold text-[#0D2B52]">
            Checklist editorial
          </h3>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 ${statusClass}`}
        >
          <Sparkles className="h-4 w-4" />
          {status}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {checks.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#0D2B52]"
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )}
            <span className={item.done ? "font-semibold" : "text-slate-500"}>
              {item.label}
              {item.hint ? (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {item.hint}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
