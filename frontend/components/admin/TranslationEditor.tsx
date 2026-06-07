"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  languageLabels,
  normalizeTranslations,
  translationLanguages,
  updateTranslationField,
  type TranslationField,
  type TranslationLanguage,
  type TranslationMap,
} from "@/components/admin/translations-model";

type TranslationEditorProps = {
  title?: string;
  description?: string;
  fields: TranslationField[];
  value: TranslationMap;
  onChange: (value: TranslationMap) => void;
  disabled?: boolean;
};

const tabs: Array<{ key: "es" | TranslationLanguage; label: string }> = [
  { key: "es", label: "ES" },
  { key: "en", label: "EN" },
  { key: "fr", label: "FR" },
  { key: "pt", label: "PT" },
  { key: "it", label: "IT" },
];

export default function TranslationEditor({
  title = "Traducciones",
  description = "El español es obligatorio y se edita en los campos principales. Los demás idiomas son opcionales.",
  fields,
  value,
  onChange,
  disabled = false,
}: TranslationEditorProps) {
  const [activeTab, setActiveTab] = useState<"es" | TranslationLanguage>("es");
  const translations = useMemo(() => normalizeTranslations(value), [value]);

  function setField(language: TranslationLanguage, key: string, text: string) {
    onChange(updateTranslationField(translations, language, key, text));
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
          {title}
        </p>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[#0D2B52] bg-[#0D2B52] text-white"
                  : "border-[#D4AF37]/25 bg-[#F8F6F2] text-[#0D2B52] hover:border-[#D4AF37]/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "es" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4">
          <div className="text-sm font-semibold text-[#0D2B52]">
            Español principal
          </div>
          <p className="text-sm leading-6 text-slate-500">
            Estos textos se guardan en los campos principales del producto. Usa
            este tab como referencia para traducir los otros idiomas.
          </p>
          <div className="grid gap-3">
            {fields.map((field) => (
              <div key={field.key} className="min-w-0 rounded-xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B68D40]">
                  {field.label}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {field.baseValue || "Pendiente en campos principales"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-3 text-sm text-slate-500">
            Traduccion opcional para {languageLabels[activeTab]}. Si un campo
            queda vacío, el sitio usará el texto en español.
          </div>

          <div className="grid gap-4">
            {fields.map((field) => {
              const fieldValue = translations[activeTab]?.[field.key] || "";
              const commonProps = {
                value: fieldValue,
                disabled,
                placeholder: field.baseValue || field.label,
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setField(activeTab, field.key, event.target.value),
                className: "w-full min-w-0",
              };

              return (
                <label key={field.key} className="min-w-0 space-y-2">
                  <span className="text-sm font-medium text-[#0D2B52]">
                    {field.label}
                  </span>
                  {field.type === "textarea" ? (
                    <Textarea {...commonProps} className="min-h-28 w-full min-w-0" />
                  ) : (
                    <Input {...commonProps} />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
