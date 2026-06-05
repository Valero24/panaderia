import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type SupportedCurrency = "COP" | "USD" | "EUR" | "BRL";

export type ConversionOptions = {
  strict?: boolean;
};

export type ExchangeRateSnapshot = {
  exchangeRateId: string | null;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  rate: Prisma.Decimal;
  source: string;
  rateDate: Date;
  fallbackApplied: boolean;
};

export type CurrencyConversionResult = ExchangeRateSnapshot & {
  baseCurrency: "COP";
  displayCurrency: SupportedCurrency;
  amountCop: Prisma.Decimal;
  displayAmount: Prisma.Decimal;
};

const supportedCurrencies: SupportedCurrency[] = ["COP", "USD", "EUR", "BRL"];
const copRounding = (Prisma.Decimal as any).ROUND_HALF_UP ?? 4;

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async convertCopToDisplayCurrency(
    amountCop: Prisma.Decimal.Value,
    displayCurrency: string,
    options: ConversionOptions = {}
  ): Promise<CurrencyConversionResult> {
    const normalizedCurrency = this.normalizeCurrency(displayCurrency);
    const copAmount = this.toDecimal(amountCop).toDecimalPlaces(0, copRounding);

    if (normalizedCurrency === "COP") {
      return this.sameCurrencyResult(copAmount);
    }

    const snapshot = await this.getActiveExchangeRateSnapshot(
      normalizedCurrency,
      "COP",
      options
    );

    if (snapshot.fallbackApplied) {
      return this.sameCurrencyResult(copAmount, true);
    }

    const displayAmount = copAmount
      .div(snapshot.rate)
      .toDecimalPlaces(2, copRounding);

    return {
      ...snapshot,
      baseCurrency: "COP",
      displayCurrency: normalizedCurrency,
      amountCop: copAmount,
      displayAmount,
    };
  }

  async convertDisplayCurrencyToCop(
    amount: Prisma.Decimal.Value,
    displayCurrency: string,
    options: ConversionOptions = {}
  ): Promise<CurrencyConversionResult> {
    const normalizedCurrency = this.normalizeCurrency(displayCurrency);
    const displayAmount = this.toDecimal(amount);

    if (normalizedCurrency === "COP") {
      const amountCop = displayAmount.toDecimalPlaces(0, copRounding);

      return this.sameCurrencyResult(amountCop);
    }

    const snapshot = await this.getActiveExchangeRateSnapshot(
      normalizedCurrency,
      "COP",
      options
    );

    if (snapshot.fallbackApplied) {
      const amountCop = displayAmount.toDecimalPlaces(0, copRounding);

      return this.sameCurrencyResult(amountCop, true);
    }

    const amountCop = displayAmount
      .mul(snapshot.rate)
      .toDecimalPlaces(0, copRounding);

    return {
      ...snapshot,
      baseCurrency: "COP",
      displayCurrency: normalizedCurrency,
      amountCop,
      displayAmount,
    };
  }

  async getActiveExchangeRate(
    fromCurrency: string,
    toCurrency = "COP",
    options: ConversionOptions = {}
  ) {
    return this.getActiveExchangeRateSnapshot(
      this.normalizeCurrency(fromCurrency),
      this.normalizeCurrency(toCurrency),
      options
    );
  }

  formatMoney(amount: Prisma.Decimal.Value, currency: string) {
    const normalizedCurrency = this.normalizeCurrency(currency);
    const locale =
      normalizedCurrency === "COP"
        ? "es-CO"
        : normalizedCurrency === "BRL"
          ? "pt-BR"
          : "en-US";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "COP" ? 0 : 2,
    }).format(this.toDecimal(amount).toNumber());
  }

  private async getActiveExchangeRateSnapshot(
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency,
    options: ConversionOptions
  ): Promise<ExchangeRateSnapshot> {
    if (fromCurrency === toCurrency) {
      return {
        exchangeRateId: null,
        fromCurrency,
        toCurrency,
        rate: new Prisma.Decimal(1),
        source: "SYSTEM",
        rateDate: new Date(),
        fallbackApplied: false,
      };
    }

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
      },
      orderBy: { rateDate: "desc" },
    });

    if (!rate) {
      if (options.strict) {
        throw new NotFoundException("Tasa de cambio activa no encontrada");
      }

      return {
        exchangeRateId: null,
        fromCurrency: "COP",
        toCurrency: "COP",
        rate: new Prisma.Decimal(1),
        source: "FALLBACK_COP",
        rateDate: new Date(),
        fallbackApplied: true,
      };
    }

    return {
      exchangeRateId: rate.id,
      fromCurrency,
      toCurrency,
      rate: new Prisma.Decimal(rate.rate),
      source: rate.source,
      rateDate: rate.rateDate,
      fallbackApplied: false,
    };
  }

  private sameCurrencyResult(
    amountCop: Prisma.Decimal,
    fallbackApplied = false
  ): CurrencyConversionResult {
    return {
      baseCurrency: "COP",
      displayCurrency: "COP",
      amountCop,
      displayAmount: amountCop,
      exchangeRateId: null,
      fromCurrency: "COP",
      toCurrency: "COP",
      rate: new Prisma.Decimal(1),
      source: fallbackApplied ? "FALLBACK_COP" : "SYSTEM",
      rateDate: new Date(),
      fallbackApplied,
    };
  }

  private normalizeCurrency(value: string): SupportedCurrency {
    const currency = String(value || "COP").trim().toUpperCase();

    if (!supportedCurrencies.includes(currency as SupportedCurrency)) {
      throw new BadRequestException("Moneda no soportada");
    }

    return currency as SupportedCurrency;
  }

  private toDecimal(value: Prisma.Decimal.Value) {
    try {
      return new Prisma.Decimal(value || 0);
    } catch {
      throw new BadRequestException("Monto invalido");
    }
  }
}
