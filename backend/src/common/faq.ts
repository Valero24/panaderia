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

export function normalizeFaq(value: unknown): FaqItem[] | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    try {
      return normalizeFaq(JSON.parse(value));
    } catch {
      return normalizeFaq(parseFaqText(value));
    }
  }

  if (!Array.isArray(value)) return undefined;

  const seen = new Set<string>();
  const items = value
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

  return items.length ? items : undefined;
}
