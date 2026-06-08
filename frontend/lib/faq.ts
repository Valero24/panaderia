import type { Language } from "@/i18n";
import {
  getDynamicValue,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_MAX_ITEMS = 8;

function cleanFaqText(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeFaq(value: unknown): FaqItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeFaq(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const source = item as {
        question?: unknown;
        answer?: unknown;
      };
      const question = cleanFaqText(source.question);
      const answer = cleanFaqText(source.answer);

      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is FaqItem => Boolean(item))
    .slice(0, FAQ_MAX_ITEMS);
}

export function getTranslatedFaq(
  entity: TranslatableEntity | null | undefined,
  language: Language,
  fallback?: unknown
) {
  return normalizeFaq(getDynamicValue(entity, "faq", language, fallback));
}
