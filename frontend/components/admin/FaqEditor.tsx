"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FAQ_MAX_ANSWER_LENGTH,
  FAQ_MAX_ITEMS,
  FAQ_MAX_QUESTION_LENGTH,
  faqQualityStatus,
  faqWarnings,
  normalizeFaq,
} from "@/lib/faq";

type FaqDraftItem = {
  question: string;
  answer: string;
};

type FaqEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  maxItems?: number;
};

function parseDraft(value: string): FaqDraftItem[] {
  if (!value.trim()) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const source = item as { question?: unknown; answer?: unknown };

        return {
          question: String(source.question || ""),
          answer: String(source.answer || ""),
        };
      })
      .filter((item): item is FaqDraftItem => Boolean(item));
  } catch {
    return normalizeFaq(value);
  }
}

function serialize(items: FaqDraftItem[]) {
  const cleanItems = items.map((item) => ({
    question: item.question.trim(),
    answer: item.answer.trim(),
  }));

  return cleanItems.length ? JSON.stringify(cleanItems, null, 2) : "";
}

export default function FaqEditor({
  value,
  onChange,
  disabled = false,
  title = "Preguntas frecuentes",
  description = "Agrega preguntas reales con respuestas claras. Solo se publican y se usan en Schema si tienen pregunta y respuesta.",
  maxItems = FAQ_MAX_ITEMS,
}: FaqEditorProps) {
  const items = parseDraft(value).slice(0, maxItems);
  const validItems = normalizeFaq(value);
  const warnings = faqWarnings(value);
  const status = faqQualityStatus(value);
  const statusClass =
    status === "Excelente"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "Bueno"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : status === "Basico"
          ? "bg-slate-50 text-slate-700 ring-slate-200"
          : "bg-red-50 text-red-700 ring-red-200";

  function updateItems(nextItems: FaqDraftItem[]) {
    onChange(serialize(nextItems.slice(0, maxItems)));
  }

  function addItem() {
    if (disabled || items.length >= maxItems) return;
    updateItems([...items, { question: "", answer: "" }]);
  }

  function updateItem(index: number, patch: Partial<FaqDraftItem>) {
    updateItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function removeItem(index: number) {
    updateItems(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    updateItems(nextItems);
  }

  return (
    <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#FBF8EF] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#0D2B52]">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1 ring-1 ${statusClass}`}>
              FAQ: {status}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-[#D4AF37]/20">
              {validItems.length} preguntas validas
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          disabled={disabled || items.length >= maxItems}
          className="rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar pregunta ({items.length}/{maxItems})
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/30 bg-white p-4 text-sm text-slate-500">
          No hay preguntas frecuentes agregadas.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item, index) => {
            const hasPartial = Boolean(
              (item.question.trim() && !item.answer.trim()) ||
                (!item.question.trim() && item.answer.trim())
            );

            return (
              <div
                key={index}
                className="rounded-2xl border border-[#D4AF37]/15 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0D2B52]">
                    Pregunta {index + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveItem(index, -1)}
                      disabled={disabled || index === 0}
                      className="rounded-lg text-xs"
                    >
                      <ArrowUp className="mr-1 h-4 w-4" />
                      Mover arriba
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveItem(index, 1)}
                      disabled={disabled || index === items.length - 1}
                      className="rounded-lg text-xs"
                    >
                      <ArrowDown className="mr-1 h-4 w-4" />
                      Mover abajo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="rounded-lg text-xs text-red-600"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  <Input
                    placeholder="Pregunta"
                    value={item.question}
                    maxLength={FAQ_MAX_QUESTION_LENGTH + 40}
                    onChange={(event) =>
                      updateItem(index, { question: event.target.value })
                    }
                    disabled={disabled}
                  />
                  <Textarea
                    placeholder="Respuesta"
                    value={item.answer}
                    maxLength={FAQ_MAX_ANSWER_LENGTH + 120}
                    onChange={(event) =>
                      updateItem(index, { answer: event.target.value })
                    }
                    disabled={disabled}
                    className="min-h-24"
                  />
                </div>

                {hasPartial && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Completa pregunta y respuesta para que esta FAQ se publique.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">Advertencias de FAQ</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="flex gap-2">
                <span aria-hidden="true">-</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
