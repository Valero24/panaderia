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

export function normalizeFaq(value: unknown): FaqItem[] | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    try {
      return normalizeFaq(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  if (!Array.isArray(value)) return undefined;

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
    .slice(0, FAQ_MAX_ITEMS);

  return items.length ? items : undefined;
}
