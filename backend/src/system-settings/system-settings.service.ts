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
] as const;

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
      primaryColor: "#0D2B52",
      secondaryColor: "#B48A5A",
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
    };
  }

  private normalize(data: Record<string, unknown>) {
    const payload: Record<string, string | number | boolean | null> = {};

    for (const field of allowedFields) {
      if (data[field] === undefined) continue;

      if (
        [
          "demoModeEnabled",
          "realPaymentsEnabled",
          "realAvailabilityEnabled",
          "whatsappNotificationsEnabled",
        ].includes(field)
      ) {
        payload[field] = Boolean(data[field]);
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

    if (payload.defaultCurrency) {
      payload.defaultCurrency = String(payload.defaultCurrency).toUpperCase();
    }

    return payload;
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
