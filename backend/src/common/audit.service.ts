import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(data: {
    actor?: AuditActor | null;
    action: string;
    entityType: string;
    entityId: string | number;
    message?: string;
    metadata?: Record<string, unknown>;
    request?: any;
    previousValue?: unknown;
    newValue?: unknown;
  }) {
    return this.record({
      actor: data.actor,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      message: data.message,
      metadata: data.metadata,
      previousValue: data.previousValue,
      newValue: data.newValue,
      ip: this.getRequestIp(data.request) || data.actor?.ip,
      userAgent:
        data.request?.headers?.["user-agent"] ||
        data.request?.headers?.["User-Agent"] ||
        data.actor?.userAgent,
    });
  }

  async record(data: {
    actor?: AuditActor | null;
    action: string;
    entityType: string;
    entityId: string | number;
    message?: string;
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: data.actor?.userId ?? null,
          actorRole: data.actor?.role ?? null,
          actorName:
            data.actor?.name || data.actor?.email || data.actor?.role || null,
          action: data.action,
          entityType: data.entityType,
          entityId: String(data.entityId),
          message: data.message || this.defaultMessage(data.action),
          previousValue: this.toJson(data.previousValue),
          newValue: this.toJson(data.newValue),
          metadata: this.toJson(data.metadata),
          ip: data.ip || data.actor?.ip || null,
          userAgent: data.userAgent || data.actor?.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar auditoria ${data.action}:${data.entityType}:${data.entityId}`
      );
    }
  }

  private defaultMessage(action: string) {
    return action
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (letter) => letter.toUpperCase());
  }

  private toJson(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.sanitize(value) as Prisma.InputJsonValue;
  }

  private getRequestIp(request?: any) {
    const forwarded = request?.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0]?.trim();
    }

    return request?.ip || request?.socket?.remoteAddress || null;
  }

  private sanitize(value: unknown, depth = 0): unknown {
    if (depth > 4) {
      return "[Max depth]";
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, depth + 1));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const blocked = [
      "password",
      "token",
      "reviewToken",
      "reviewRequestToken",
      "accessToken",
      "refreshToken",
      "authorization",
      "jwt",
      "secret",
      "privateKey",
      "card",
      "payment",
      "phone",
      "customerPhone",
    ];
    const safe: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (blocked.includes(key) || blocked.includes(key.toLowerCase())) {
        safe[key] = "[REDACTED]";
      } else {
        safe[key] = this.sanitize(item, depth + 1);
      }
    }

    return safe;
  }
}
