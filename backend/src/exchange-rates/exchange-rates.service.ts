import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateExchangeRateDto } from "./dto/create-exchange-rate.dto";

type ExchangeRateActor = {
  userId?: number;
  role?: string;
  email?: string;
  name?: string;
};

const supportedCurrencies = ["COP", "USD", "EUR", "BRL"] as const;
const allowedSources = ["MANUAL", "TRM", "API"] as const;

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll(query: {
    fromCurrency?: string;
    toCurrency?: string;
    isActive?: string;
    take?: string;
  }) {
    const where: Prisma.ExchangeRateWhereInput = {};
    const take = Math.min(Math.max(Number(query.take || 100), 1), 300);

    if (query.fromCurrency) {
      where.fromCurrency = this.normalizeCurrency(query.fromCurrency);
    }

    if (query.toCurrency) {
      where.toCurrency = this.normalizeCurrency(query.toCurrency);
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    return this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { rateDate: "desc" }],
      take,
    });
  }

  async getActiveRate(fromCurrency: string, toCurrency = "COP") {
    const from = this.normalizeCurrency(fromCurrency);
    const to = this.normalizeCurrency(toCurrency);

    if (from === to) {
      return {
        id: "same-currency",
        fromCurrency: from,
        toCurrency: to,
        rate: new Prisma.Decimal(1),
        source: "SYSTEM",
        rateDate: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        isActive: true,
      },
      orderBy: { rateDate: "desc" },
    });

    if (!rate) {
      throw new NotFoundException("Tasa de cambio activa no encontrada");
    }

    return rate;
  }

  async create(data: CreateExchangeRateDto, actor: ExchangeRateActor) {
    const fromCurrency = this.normalizeCurrency(data.fromCurrency);
    const toCurrency = this.normalizeCurrency(data.toCurrency || "COP");

    if (toCurrency !== "COP") {
      throw new BadRequestException(
        "Por ahora las tasas operativas deben convertir hacia COP"
      );
    }

    if (fromCurrency === toCurrency) {
      throw new BadRequestException("No se requiere tasa para la misma moneda");
    }

    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestException("La tasa debe ser numerica y positiva");
    }

    const source = this.normalizeSource(data.source || "MANUAL");
    const rateDate = data.rateDate ? new Date(data.rateDate) : new Date();

    if (Number.isNaN(rateDate.getTime())) {
      throw new BadRequestException("Fecha de tasa invalida");
    }

    const previousActive = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
      },
      orderBy: { rateDate: "desc" },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.exchangeRate.updateMany({
        where: {
          fromCurrency,
          toCurrency,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.exchangeRate.create({
        data: {
          fromCurrency,
          toCurrency,
          rate,
          source,
          rateDate,
          isActive: true,
        },
      });
    });

    await this.audit.record({
      actor,
      action: "EXCHANGE_RATE_CREATED",
      entityType: "ExchangeRate",
      entityId: created.id,
      message: "Nueva tasa de cambio registrada",
      previousValue: previousActive
        ? {
            id: previousActive.id,
            fromCurrency: previousActive.fromCurrency,
            toCurrency: previousActive.toCurrency,
            rate: Number(previousActive.rate),
            source: previousActive.source,
            rateDate: previousActive.rateDate,
            isActive: previousActive.isActive,
          }
        : null,
      newValue: {
        fromCurrency,
        toCurrency,
        rate,
        source,
        rateDate,
      },
      metadata: {
        keepsHistory: true,
      },
    });

    return created;
  }

  async updateStatus(id: string, isActive: boolean, actor: ExchangeRateActor) {
    const existing = await this.prisma.exchangeRate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tasa de cambio no encontrada");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.exchangeRate.updateMany({
          where: {
            id: { not: id },
            fromCurrency: existing.fromCurrency,
            toCurrency: existing.toCurrency,
            isActive: true,
          },
          data: { isActive: false },
        });
      }

      return tx.exchangeRate.update({
        where: { id },
        data: { isActive },
      });
    });

    await this.audit.record({
      actor,
      action: isActive ? "EXCHANGE_RATE_UPDATED" : "EXCHANGE_RATE_DISABLED",
      entityType: "ExchangeRate",
      entityId: updated.id,
      message: isActive
        ? "Tasa de cambio activada"
        : "Tasa de cambio desactivada",
      previousValue: {
        isActive: existing.isActive,
      },
      newValue: {
        isActive: updated.isActive,
        fromCurrency: updated.fromCurrency,
        toCurrency: updated.toCurrency,
        rate: Number(updated.rate),
      },
    });

    return updated;
  }

  private normalizeCurrency(value: unknown) {
    const currency = typeof value === "string" ? value.trim().toUpperCase() : "";

    if (!supportedCurrencies.includes(currency as any)) {
      throw new BadRequestException("Moneda no soportada");
    }

    return currency;
  }

  private normalizeSource(value: unknown) {
    const source = typeof value === "string" ? value.trim().toUpperCase() : "";

    if (!allowedSources.includes(source as any)) {
      return "MANUAL";
    }

    return source;
  }
}
