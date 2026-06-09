import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type TargetLocale = "en" | "fr" | "pt" | "it";
export type TranslationProvider =
  | "DISABLED"
  | "OPENAI"
  | "GOOGLE"
  | "DEEPL"
  | "LIBRETRANSLATE"
  | "CUSTOM";

export const TARGET_LOCALES: TargetLocale[] = ["en", "fr", "pt", "it"];

export type TranslationTextOptions = {
  preserveLineBreaks?: boolean;
};

export function cleanTranslationText(
  value: unknown,
  options: TranslationTextOptions = {}
) {
  const text = String(value || "").replace(
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    ""
  );

  if (!options.preserveLineBreaks) {
    return text.replace(/\s+/g, " ").trim();
  }

  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

@Injectable()
export class TranslationProviders {
  constructor(private readonly config: ConfigService) {}

  getProvider() {
    const configured = String(
      this.config.get<string>("TRANSLATION_PROVIDER") || "DISABLED"
    ).toUpperCase();

    if (["OPENAI", "GOOGLE", "DEEPL", "LIBRETRANSLATE", "CUSTOM"].includes(configured)) {
      return configured as TranslationProvider;
    }

    return "DISABLED" as TranslationProvider;
  }

  isAutoTranslationEnabled() {
    return String(this.config.get<string>("AUTO_TRANSLATION_ENABLED") || "false")
      .trim()
      .toLowerCase() === "true";
  }

  getDefaultSourceLanguage() {
    return String(this.config.get<string>("TRANSLATION_DEFAULT_SOURCE") || "es")
      .trim()
      .toLowerCase();
  }

  getTargetLocales(locales?: string[]) {
    const configured =
      locales?.length
        ? locales
        : String(
            this.config.get<string>("TRANSLATION_TARGETS") || TARGET_LOCALES.join(",")
          ).split(",");

    const normalized = configured
      .map((locale) => String(locale).trim().toLowerCase())
      .filter((locale): locale is TargetLocale =>
        TARGET_LOCALES.includes(locale as TargetLocale)
      );

    return [...new Set(normalized.length ? normalized : TARGET_LOCALES)];
  }

  async translate(
    text: string,
    sourceLocale: string,
    targetLocale: TargetLocale,
    options: TranslationTextOptions = {}
  ) {
    const provider = this.getProvider();

    if (provider === "OPENAI") {
      return this.translateWithOpenAi(text, targetLocale);
    }

    if (provider === "GOOGLE") {
      return this.translateWithGoogle(text, sourceLocale, targetLocale, options);
    }

    if (provider === "DEEPL") {
      return this.translateWithDeepL(text, sourceLocale, targetLocale, options);
    }

    if (provider === "LIBRETRANSLATE") {
      return this.translateWithLibreTranslate(
        text,
        sourceLocale,
        targetLocale,
        options
      );
    }

    if (provider === "CUSTOM") {
      return this.translateWithCustomProvider(
        text,
        sourceLocale,
        targetLocale,
        options
      );
    }

    return "";
  }

  private async translateWithOpenAi(text: string, targetLocale: TargetLocale) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");

    if (!apiKey) {
      throw new BadRequestException("OPENAI_API_KEY requerido para OPENAI");
    }

    const model = this.config.get<string>("OPENAI_TRANSLATION_MODEL") || "gpt-4o-mini";
    const endpoint =
      this.config.get<string>("OPENAI_API_URL") ||
      "https://api.openai.com/v1/chat/completions";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Translate Spanish tourism, SEO and hospitality content. Return only the translated text. Preserve useful line breaks and do not add explanations.",
          },
          {
            role: "user",
            content: `Target language: ${targetLocale}\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new BadRequestException("OpenAI no respondio la traduccion");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };

    return String(payload.choices?.[0]?.message?.content || "").trim();
  }

  private async translateWithGoogle(
    text: string,
    sourceLocale: string,
    targetLocale: TargetLocale,
    options: TranslationTextOptions
  ) {
    const apiKey = this.config.get<string>("GOOGLE_TRANSLATE_API_KEY");

    if (!apiKey) {
      throw new BadRequestException(
        "GOOGLE_TRANSLATE_API_KEY requerido para GOOGLE"
      );
    }

    const endpoint =
      this.config.get<string>("GOOGLE_TRANSLATE_API_URL") ||
      "https://translation.googleapis.com/language/translate/v2";

    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLocale,
        target: targetLocale,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new BadRequestException("Google Translate no respondio");
    }

    const payload = (await response.json()) as {
      data?: { translations?: { translatedText?: unknown }[] };
    };

    return cleanTranslationText(payload.data?.translations?.[0]?.translatedText, options);
  }

  private async translateWithDeepL(
    text: string,
    sourceLocale: string,
    targetLocale: TargetLocale,
    options: TranslationTextOptions
  ) {
    const apiKey = this.config.get<string>("DEEPL_API_KEY");

    if (!apiKey) {
      throw new BadRequestException("DEEPL_API_KEY requerido para DEEPL");
    }

    const endpoint =
      this.config.get<string>("DEEPL_API_URL") ||
      "https://api-free.deepl.com/v2/translate";

    const body = new URLSearchParams({
      text,
      source_lang: sourceLocale.toUpperCase(),
      target_lang: targetLocale.toUpperCase(),
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      throw new BadRequestException("DeepL no respondio");
    }

    const payload = (await response.json()) as {
      translations?: { text?: unknown }[];
    };

    return cleanTranslationText(payload.translations?.[0]?.text, options);
  }

  private async translateWithLibreTranslate(
    text: string,
    sourceLocale: string,
    targetLocale: TargetLocale,
    options: TranslationTextOptions
  ) {
    const baseUrl = this.config.get<string>("TRANSLATION_API_URL");

    if (!baseUrl) {
      throw new BadRequestException(
        "TRANSLATION_API_URL requerido para LIBRETRANSLATE"
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: sourceLocale,
        target: targetLocale,
        format: "text",
        api_key: this.config.get<string>("TRANSLATION_API_KEY") || undefined,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException("El proveedor de traduccion no respondio");
    }

    const payload = (await response.json()) as { translatedText?: unknown };
    return cleanTranslationText(payload.translatedText, options);
  }

  private async translateWithCustomProvider(
    text: string,
    sourceLocale: string,
    targetLocale: TargetLocale,
    options: TranslationTextOptions
  ) {
    const baseUrl = this.config.get<string>("TRANSLATION_API_URL");

    if (!baseUrl) {
      throw new BadRequestException("TRANSLATION_API_URL requerido para CUSTOM");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.get<string>("TRANSLATION_API_KEY")
          ? { Authorization: `Bearer ${this.config.get<string>("TRANSLATION_API_KEY")}` }
          : {}),
      },
      body: JSON.stringify({
        text,
        q: text,
        source: sourceLocale,
        target: targetLocale,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new BadRequestException("El proveedor custom de traduccion no respondio");
    }

    const payload = (await response.json()) as {
      translatedText?: unknown;
      text?: unknown;
      translation?: unknown;
    };

    return cleanTranslationText(
      payload.translatedText || payload.text || payload.translation,
      options
    );
  }
}
