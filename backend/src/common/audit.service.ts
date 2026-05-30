import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type AuditActor = {
  userId?: number;
  role?: string;
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
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: data.actor?.userId ?? null,
          actorRole: data.actor?.role ?? null,
          action: data.action,
          entityType: data.entityType,
          entityId: String(data.entityId),
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar auditoria ${data.action}:${data.entityType}:${data.entityId}`
      );
    }
  }
}
