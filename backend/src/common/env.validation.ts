import { Logger } from "@nestjs/common";

const logger = new Logger("Environment");

function requireEnv(name: string) {
  if (!process.env[name]) {
    throw new Error(`Variable de entorno requerida faltante: ${name}`);
  }
}

function warnEnv(name: string) {
  if (!process.env[name]) {
    logger.warn(`Variable de entorno opcional no configurada: ${name}`);
  }
}

export function validateEnvironment() {
  requireEnv("DATABASE_URL");
  requireEnv("JWT_SECRET");

  const isProduction = process.env.NODE_ENV === "production";
  const realPaymentsEnabled = process.env.ENABLE_REAL_PAYMENTS === "true";
  const autoTranslationEnabled =
    process.env.AUTO_TRANSLATION_ENABLED === "true";

  if (isProduction) {
    if ((process.env.JWT_SECRET || "").length < 32) {
      throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
    }

    requireEnv("CORS_ORIGIN");

    if (realPaymentsEnabled) {
      requireEnv("WOMPI_PRIVATE_KEY");
      requireEnv("WOMPI_EVENTS_SECRET");
      requireEnv("WOMPI_BASE_URL");
    } else {
      warnEnv("WOMPI_PRIVATE_KEY");
      warnEnv("WOMPI_EVENTS_SECRET");
    }

    if (autoTranslationEnabled) {
      requireEnv("TRANSLATION_PROVIDER");
    }
  } else {
    if ((process.env.JWT_SECRET || "").length < 32) {
      logger.warn("JWT_SECRET de desarrollo es corto; usa 32+ caracteres en produccion");
    }
    warnEnv("WOMPI_PRIVATE_KEY");
    warnEnv("WOMPI_EVENTS_SECRET");
    warnEnv("MAIL_USER");
    warnEnv("WHATSAPP_API_URL");
    warnEnv("TRANSLATION_PROVIDER");
  }

  if (autoTranslationEnabled) {
    const provider = (process.env.TRANSLATION_PROVIDER || "").toLowerCase();
    const defaultSource = (
      process.env.TRANSLATION_DEFAULT_SOURCE || "es"
    ).toLowerCase();
    const targets = (process.env.TRANSLATION_TARGETS || "en,fr,pt,it")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (defaultSource !== "es") {
      logger.warn(
        "TRANSLATION_DEFAULT_SOURCE distinto de es; confirma que el contenido base no este en espanol"
      );
    }

    if (targets.length === 0) {
      throw new Error("TRANSLATION_TARGETS debe contener al menos un idioma");
    }

    if (provider === "openai") {
      requireEnv("OPENAI_API_KEY");
    } else if (provider === "google") {
      requireEnv("GOOGLE_TRANSLATE_API_KEY");
    } else if (provider === "deepl") {
      requireEnv("DEEPL_API_KEY");
    } else if (provider === "libretranslate") {
      requireEnv("TRANSLATION_API_URL");
    } else if (provider === "custom") {
      requireEnv("TRANSLATION_API_URL");
    } else {
      throw new Error(
        "TRANSLATION_PROVIDER debe ser openai, google, deepl, libretranslate o custom"
      );
    }
  }
}
