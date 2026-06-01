import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

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
          ip: data.ip || null,
          userAgent: data.userAgent || null,
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
      "accessToken",
      "refreshToken",
      "authorization",
      "jwt",
      "secret",
      "privateKey",
    ];
    const safe: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (blocked.includes(key)) {
        safe[key] = "[REDACTED]";
      } else {
        safe[key] = this.sanitize(item, depth + 1);
      }
    }

    return safe;
  }
}
