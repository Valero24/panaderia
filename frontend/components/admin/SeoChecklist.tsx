"use client";

import { AlertTriangle, CheckCircle2, Circle, Sparkles } from "lucide-react";

import type { TranslationMap } from "@/components/admin/translations-model";
import { faqQualityStatus, faqWarnings, normalizeFaq } from "@/lib/faq";

type SeoChecklistProps = {
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  shortDescription?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  image?: string | null;
  translations?: TranslationMap | null;
  minimumWords?: number;
  hasInternalLinks?: boolean;
  internalLinksLabel?: string;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function wordCount(value: unknown) {
  if (!hasText(value)) return 0;
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function hasEnglishTranslation(translations?: TranslationMap | null) {
  const english = translations?.en;
  if (!english) return false;
  return Object.values(english).some((value) => hasText(value));
}

function hasAnyTranslation(translations?: TranslationMap | null) {
  if (!translations) return false;
  return Object.values(translations).some((fields) =>
    Object.values(fields || {}).some((value) => hasText(value))
  );
}

function seoStatus(completed: number, total: number) {
  if (completed >= total) return "Excelente";
  if (completed >= Math.ceil(total * 0.75)) return "Bueno";
  return "Basico";
}

export default function SeoChecklist({
  slug,
  seoTitle,
  seoDescription,
  shortDescription,
  seoContent,
  faq,
  image,
  translations,
  minimumWords = 700,
  hasInternalLinks = false,
  internalLinksLabel = "Tiene relaciones internas",
}: SeoChecklistProps) {
  const words = wordCount(seoContent);
  const titleLength = String(seoTitle || "").trim().length;
  const descriptionLength = String(seoDescription || "").trim().length;
  const faqItems = normalizeFaq(faq);
  const faqStatus = faqQualityStatus(faq);
  const checks = [
    { label: "Tiene slug", done: hasText(slug) },
    { label: "Tiene titulo SEO", done: hasText(seoTitle) },
    { label: "Tiene meta descripcion", done: hasText(seoDescription) },
    { label: "Tiene descripcion corta", done: hasText(shortDescription) },
    { label: "Tiene contenido SEO", done: hasText(seoContent) },
    {
      label: `FAQ configurada (${faqItems.length} preguntas)`,
      done: faqItems.length > 0,
      hint: faqStatus,
    },
    { label: "Tiene imagen principal", done: hasText(image) },
    { label: internalLinksLabel, done: hasInternalLinks },
    { label: "Tiene traduccion EN", done: hasEnglishTranslation(translations) },
    { label: "Tiene traducciones", done: hasAnyTranslation(translations) },
    {
      label: `Tiene contenido minimo recomendado (${minimumWords}+ palabras)`,
      done: words >= minimumWords,
      hint: `${words} palabras`,
    },
  ];
  const warnings = [
    titleLength > 70
      ? `Titulo SEO supera 70 caracteres (${titleLength}).`
      : null,
    descriptionLength > 160
      ? `Meta descripcion supera 160 caracteres (${descriptionLength}).`
      : null,
    hasText(seoContent) && words < minimumWords
      ? `Contenido SEO corto: ${words}/${minimumWords} palabras recomendadas.`
      : null,
    faqItems.length === 0 ? "Falta FAQ visible." : null,
    faqItems.length > 0 && faqItems.length < 3
      ? `FAQ basica: ${faqItems.length}/3 preguntas recomendadas como minimo.`
      : null,
    ...faqWarnings(faq),
    !hasText(image) ? "Falta imagen principal." : null,
    !hasInternalLinks ? "Falta relacion interna con destinos o productos." : null,
  ].filter((item): item is string => Boolean(item));
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

      {warnings.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Advertencias de calidad
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span aria-hidden="true">-</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
