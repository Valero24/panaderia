import { Injectable } from "@nestjs/common";
import {
  BookingStatus,
  OperationalNotificationStatus,
  PreReservationStatus,
  PropertyStatus,
  Role,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  publicHealth() {
    return {
      status: "ok",
      app: "Cartagena Tailored Travel API",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    };
  }

  async systemHealth() {
    const [database, settings, counts, criticalLogs, lastMigration] =
      await Promise.all([
        this.checkDatabase(),
        this.getSettings(),
        this.getCounts(),
        this.getCriticalLogs(),
        this.getLastMigration(),
      ]);
    const memory = process.memoryUsage();

    return {
      status: database.status === "ok" ? "ok" : "degraded",
      app: "Cartagena Tailored Travel API",
      timestamp: new Date().toISOString(),
      backend: {
        status: "ok",
        uptime: Math.round(process.uptime()),
        environment:
          process.env.APP_ENV || process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        appVersion: process.env.APP_VERSION || "0.0.1",
        memory: {
          rssMb: this.toMb(memory.rss),
          heapUsedMb: this.toMb(memory.heapUsed),
          heapTotalMb: this.toMb(memory.heapTotal),
        },
      },
      database,
      counts,
      flags: {
        demoModeEnabled: settings.demoModeEnabled,
        realPaymentsEnabled:
          settings.realPaymentsEnabled ||
          process.env.ENABLE_REAL_PAYMENTS === "true",
        realAvailabilityEnabled:
          settings.realAvailabilityEnabled ||
          process.env.ENABLE_REAL_AVAILABILITY === "true",
        whatsappNotificationsEnabled:
          settings.whatsappNotificationsEnabled ||
          process.env.ENABLE_WHATSAPP_NOTIFICATIONS === "true",
        dianMode: process.env.DIAN_MODE || "mock",
        wompiEnabled:
          process.env.WOMPI_ENABLED === "true" ||
          process.env.ENABLE_REAL_PAYMENTS === "true",
        factusEnabled: process.env.FACTUS_ENABLED === "true",
      },
      lastMigration,
      criticalLogs,
    };
  }

  private async checkDatabase() {
    const started = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        status: "error",
        latencyMs: Date.now() - started,
        errorMessage:
          error instanceof Error
            ? this.safeError(error.message)
            : "Database check failed",
      };
    }
  }

  private getSettings() {
    return this.prisma.companySettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
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
        demoModeEnabled: true,
        realPaymentsEnabled: false,
        realAvailabilityEnabled: false,
        whatsappNotificationsEnabled: false,
      },
    });
  }

  private async getCounts() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      users,
      activeAdvisors,
      activeProperties,
      activeExperiences,
      activePackages,
      pendingPreReservations,
      confirmedBookings,
      contacts,
      auditLogsLast24h,
      pendingOperationalNotifications,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          role: Role.ADVISOR,
          isActive: true,
          deletedAt: null,
        },
      }),
      this.prisma.property.count({
        where: {
          status: { in: [PropertyStatus.ACTIVE, PropertyStatus.FEATURED] },
        },
      }),
      this.prisma.experience.count({ where: { active: true } }),
      this.prisma.package.count({ where: { active: true } }),
      this.prisma.preReservation.count({
        where: {
          status: PreReservationStatus.PENDING_ADVISOR,
          archivedAt: null,
        },
      }),
      this.prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED },
      }),
      this.prisma.contactRequest.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.operationalNotification.count({
        where: { status: OperationalNotificationStatus.PENDING },
      }),
    ]);

    return {
      users,
      activeAdvisors,
      activeProducts: {
        properties: activeProperties,
        experiences: activeExperiences,
        packages: activePackages,
      },
      pendingPreReservations,
      confirmedBookings,
      contacts,
      auditLogsLast24h,
      pendingOperationalNotifications,
    };
  }

  private getCriticalLogs() {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: "FAILED", mode: "insensitive" } },
          { action: { contains: "ERROR", mode: "insensitive" } },
          { message: { contains: "fallo", mode: "insensitive" } },
          { message: { contains: "error", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        message: true,
        actorName: true,
        actorRole: true,
        createdAt: true,
      },
    });
  }

  private async getLastMigration() {
    try {
      const rows = await this.prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`
        SELECT migration_name, finished_at
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `;

      return rows[0] || null;
    } catch {
      return null;
    }
  }

  private toMb(value: number) {
    return Math.round((value / 1024 / 1024) * 100) / 100;
  }

  private safeError(message: string) {
    return message
      .replace(/postgresql:\/\/[^@\s]+@/gi, "postgresql://[REDACTED]@")
      .replace(/password=[^&\s]+/gi, "password=[REDACTED]");
  }
}
