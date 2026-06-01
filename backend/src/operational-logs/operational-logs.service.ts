import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type LogsQuery = {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  take?: string;
};

@Injectable()
export class OperationalLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: LogsQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    const take = Math.min(Math.max(Number(query.take || 100), 1), 200);

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = String(query.entityId);
    }

    if (query.action) {
      where.action = {
        contains: query.action,
        mode: "insensitive",
      };
    }

    if (query.actorId) {
      const actorId = Number(query.actorId);

      if (Number.isInteger(actorId)) {
        where.actorId = actorId;
      }
    }

    if (query.from || query.to) {
      where.createdAt = {};

      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }

      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
