import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

type SettingsActor = {
  userId?: number;
  role?: string;
  email?: string;
  name?: string;
};

const allowedFields = [
  "businessName",
  "legalName",
  "nit",
  "email",
  "phone",
  "whatsappNumber",
  "address",
  "city",
  "country",
  "websiteUrl",
  "instagramUrl",
  "facebookUrl",
  "tiktokUrl",
  "logoUrl",
  "faviconUrl",
  "primaryColor",
  "secondaryColor",
  "defaultCurrency",
  "baseCurrency",
  "enabledDisplayCurrencies",
  "defaultDisplayCurrency",
  "exchangeRateMode",
  "exchangeRateSource",
  "exchangeRateDate",
  "currencyConversionEnabled",
  "exchangeRatesFromCOP",
  "taxRate",
  "serviceFeeRate",
  "footerText",
  "invoiceNotes",
  "bookingTerms",
  "privacyPolicyText",
  "demoModeEnabled",
  "realPaymentsEnabled",
  "realAvailabilityEnabled",
  "whatsappNotificationsEnabled",
  "factusEnabled",
  "factusMode",
  "factusNumberingRangeId",
  "factusDefaultDocumentCode",
  "factusDefaultPaymentForm",
  "factusDefaultPaymentMethodCode",
  "factusDefaultUnitMeasureId",
  "factusDefaultStandardCodeId",
  "factusDefaultTributeId",
  "factusDefaultMunicipalityId",
] as const;

const supportedDisplayCurrencies = ["COP", "USD", "EUR", "BRL"] as const;
const exchangeRateModes = ["MANUAL", "AUTO", "DISABLED"] as const;
const exchangeRateSources = ["MANUAL", "TRM", "API"] as const;

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  getSettings() {
    return this.prisma.companySettings.upsert({
      where: { id: 1 },
      update: {},
      create: this.defaultSettings(),
    });
  }

  async updateSettings(data: Record<string, unknown>, actor: SettingsActor) {
    const previous = await this.getSettings();
    const payload = this.normalize(data);

    const updated = await this.prisma.companySettings.upsert({
      where: { id: 1 },
      update: {
        ...payload,
        companyName: this.asString(payload.businessName, previous.companyName),
        legalId: this.asNullableString(payload.nit, previous.legalId),
        phones: this.asNullableString(payload.phone, previous.phones),
        policies: this.asNullableString(payload.bookingTerms, previous.policies),
        invoiceFooter: this.asNullableString(
          payload.footerText,
          previous.invoiceFooter
        ),
        legalInfo: this.asNullableString(payload.legalName, previous.legalInfo),
      },
      create: {
        ...this.defaultSettings(),
        ...payload,
        companyName: String(payload.businessName || "Cartagena Tailored Travel"),
        legalId: (payload.nit as string | undefined) || null,
        phones: (payload.phone as string | undefined) || null,
        policies: (payload.bookingTerms as string | undefined) || null,
        invoiceFooter: (payload.footerText as string | undefined) || null,
        legalInfo: (payload.legalName as string | undefined) || null,
      },
    });

    await this.audit.record({
      actor,
      action: "SYSTEM_SETTINGS_UPDATED",
      entityType: "CompanySettings",
      entityId: updated.id,
      message: "Configuracion general actualizada",
      previousValue: this.publicSnapshot(previous),
      newValue: this.publicSnapshot(updated),
      metadata: {
        changedFields: Object.keys(payload),
      },
    });

    return updated;
  }

  private defaultSettings() {
    return {
      id: 1,
      companyName: "Cartagena Tailored Travel",
      businessName: "Cartagena Tailored Travel",
      city: "Cartagena",
      country: "Colombia",
      defaultCurrency: "COP",
      baseCurrency: "COP",
      enabledDisplayCurrencies: ["COP", "USD", "EUR", "BRL"],
      defaultDisplayCurrency: "COP",
      exchangeRateMode: "MANUAL",
      exchangeRateSource: "MANUAL",
      exchangeRateDate: new Date(),
      currencyConversionEnabled: true,
      exchangeRatesFromCOP: {
        COP: 1,
        USD: 0.00025,
        EUR: 0.00023,
        BRL: 0.0014,
      },
      primaryColor: "#0D2B52",
      secondaryColor: "#B48A5A",
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
      factusEnabled: false,
      factusMode: "mock",
      factusDefaultDocumentCode: "01",
    };
  }

  private normalize(data: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (data[field] === undefined) continue;

      if (
        [
          "demoModeEnabled",
          "realPaymentsEnabled",
          "realAvailabilityEnabled",
          "whatsappNotificationsEnabled",
          "factusEnabled",
          "currencyConversionEnabled",
        ].includes(field)
      ) {
        payload[field] = Boolean(data[field]);
        continue;
      }

      if (field === "baseCurrency") {
        payload.baseCurrency = "COP";
        payload.defaultCurrency = "COP";
        continue;
      }

      if (field === "defaultCurrency") {
        payload.defaultCurrency = "COP";
        payload.baseCurrency = "COP";
        continue;
      }

      if (field === "enabledDisplayCurrencies") {
        payload.enabledDisplayCurrencies = this.normalizeDisplayCurrencies(
          data[field]
        );
        continue;
      }

      if (field === "defaultDisplayCurrency") {
        payload.defaultDisplayCurrency = this.normalizeCurrency(
          data[field],
          "COP"
        );
        continue;
      }

      if (field === "exchangeRateMode") {
        payload.exchangeRateMode = this.normalizeEnum(
          data[field],
          exchangeRateModes,
          "MANUAL"
        );
        continue;
      }

      if (field === "exchangeRateSource") {
        payload.exchangeRateSource = this.normalizeEnum(
          data[field],
          exchangeRateSources,
          "MANUAL"
        );
        continue;
      }

      if (field === "exchangeRateDate") {
        payload.exchangeRateDate = this.normalizeDate(data[field]);
        continue;
      }

      if (field === "exchangeRatesFromCOP") {
        payload.exchangeRatesFromCOP = this.normalizeExchangeRates(data[field]);
        continue;
      }

      if (["taxRate", "serviceFeeRate"].includes(field)) {
        const value = Number(data[field]);

        if (!Number.isFinite(value) || value < 0) {
          throw new BadRequestException(`${field} debe ser numerico y positivo`);
        }

        payload[field] = value;
        continue;
      }

      const value =
        typeof data[field] === "string" ? data[field].trim() : data[field];

      payload[field] = value ? String(value) : null;
    }

    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
      throw new BadRequestException("Correo invalido");
    }

    for (const field of [
      "websiteUrl",
      "instagramUrl",
      "facebookUrl",
      "tiktokUrl",
      "logoUrl",
      "faviconUrl",
    ]) {
      if (payload[field]) {
        this.validateUrl(field, String(payload[field]));
      }
    }

    if (!payload.businessName && data.businessName !== undefined) {
      throw new BadRequestException("Nombre comercial requerido");
    }

    if (!payload.defaultCurrency && data.defaultCurrency !== undefined) {
      throw new BadRequestException("Moneda requerida");
    }

    payload.baseCurrency = "COP";
    payload.defaultCurrency = "COP";

    if (
      Array.isArray(payload.enabledDisplayCurrencies) &&
      payload.defaultDisplayCurrency &&
      !payload.enabledDisplayCurrencies.includes(payload.defaultDisplayCurrency)
    ) {
      payload.defaultDisplayCurrency = "COP";
    }

    return payload;
  }

  private normalizeCurrency(value: unknown, fallback: string) {
    const currency = typeof value === "string" ? value.trim().toUpperCase() : "";

    return supportedDisplayCurrencies.includes(currency as any)
      ? currency
      : fallback;
  }

  private normalizeDisplayCurrencies(value: unknown) {
    const input = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];

    const currencies = input
      .map((currency) => this.normalizeCurrency(currency, ""))
      .filter(Boolean);
    const unique = Array.from(new Set(["COP", ...currencies]));

    return unique.filter((currency) =>
      supportedDisplayCurrencies.includes(currency as any)
    );
  }

  private normalizeEnum<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    fallback: T[number]
  ) {
    const normalized =
      typeof value === "string" ? value.trim().toUpperCase() : "";

    return allowed.includes(normalized as T[number])
      ? normalized
      : fallback;
  }

  private normalizeDate(value: unknown) {
    if (!value) return new Date();

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Fecha de tasa de cambio invalida");
    }

    return date;
  }

  private normalizeExchangeRates(value: unknown) {
    const source =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    const rates: Record<string, number> = { COP: 1 };

    for (const currency of supportedDisplayCurrencies) {
      if (currency === "COP") continue;

      const rate = Number(source[currency]);
      rates[currency] = Number.isFinite(rate) && rate > 0 ? rate : 0;
    }

    return rates;
  }

  private validateUrl(field: string, value: string) {
    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new BadRequestException(`${field} debe ser una URL valida`);
    }
  }

  private asString(value: unknown, fallback: string) {
    return typeof value === "string" ? value : fallback;
  }

  private asNullableString(value: unknown, fallback: string | null) {
    if (typeof value === "string") return value;
    if (value === null) return null;
    return fallback;
  }

  private publicSnapshot(settings: Record<string, unknown>) {
    return Object.fromEntries(
      allowedFields.map((field) => [field, settings[field] ?? null])
    );
  }
}
