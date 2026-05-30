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
  } else {
    if ((process.env.JWT_SECRET || "").length < 32) {
      logger.warn("JWT_SECRET de desarrollo es corto; usa 32+ caracteres en produccion");
    }
    warnEnv("WOMPI_PRIVATE_KEY");
    warnEnv("WOMPI_EVENTS_SECRET");
    warnEnv("MAIL_USER");
    warnEnv("WHATSAPP_API_URL");
  }
}
