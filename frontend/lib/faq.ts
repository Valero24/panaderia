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
export const FAQ_MAX_QUESTION_LENGTH = 180;
export const FAQ_MAX_ANSWER_LENGTH = 700;

function cleanFaqText(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseFaqText(value: string): FaqItem[] {
  return value
    .split(";")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [rawQuestion, rawAnswer] = block
        .split("|")
        .map((part) => part.trim());
      const question = cleanFaqText(rawQuestion);
      const answer = cleanFaqText(rawAnswer);
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is FaqItem => Boolean(item));
}

export function normalizeFaq(value: unknown): FaqItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeFaq(JSON.parse(value));
    } catch {
      return normalizeFaq(parseFaqText(value));
    }
  }

  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

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
    .filter((item) => {
      const key = normalizeKey(item.question);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, FAQ_MAX_ITEMS);
}

export function faqQualityStatus(value: unknown) {
  const count = normalizeFaq(value).length;
  if (count === 0) return "Sin FAQ";
  if (count < 3) return "Basico";
  if (count < 5) return "Bueno";
  return "Excelente";
}

export function faqWarnings(value: unknown): string[] {
  const warnings: string[] = [];
  const rawItems =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return parseFaqText(value);
          }
        })()
      : value;

  if (!Array.isArray(rawItems)) return warnings;

  const seen = new Set<string>();

  rawItems.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const source = item as { question?: unknown; answer?: unknown };
    const question = cleanFaqText(source.question);
    const answer = cleanFaqText(source.answer);

    if ((question && !answer) || (!question && answer)) {
      warnings.push(`Pregunta ${index + 1}: completa pregunta y respuesta.`);
    }

    if (question.length > FAQ_MAX_QUESTION_LENGTH) {
      warnings.push(
        `Pregunta ${index + 1}: supera ${FAQ_MAX_QUESTION_LENGTH} caracteres.`
      );
    }

    if (answer.length > FAQ_MAX_ANSWER_LENGTH) {
      warnings.push(
        `Respuesta ${index + 1}: supera ${FAQ_MAX_ANSWER_LENGTH} caracteres.`
      );
    }

    if (question) {
      const key = normalizeKey(question);
      if (seen.has(key)) {
        warnings.push(`Pregunta ${index + 1}: parece duplicada.`);
      }
      seen.add(key);
    }
  });

  return warnings;
}

export function getTranslatedFaq(
  entity: TranslatableEntity | null | undefined,
  language: Language,
  fallback?: unknown
) {
  return normalizeFaq(getDynamicValue(entity, "faq", language, fallback));
}
