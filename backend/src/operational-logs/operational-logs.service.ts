import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type LogsQuery = {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  user?: string;
  jobId?: string;
  importType?: string;
  category?: string;
  search?: string;
  from?: string;
  to?: string;
  take?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class OperationalLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: LogsQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    const limit = Math.min(Math.max(Number(query.limit || query.take || 100), 1), 200);
    const page = Math.max(Number(query.page || 1), 1);
    const skip = (page - 1) * limit;

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

    if (query.user) {
      where.actorName = {
        contains: query.user,
        mode: "insensitive",
      };
    }

    if (query.importType) {
      where.metadata = {
        path: ["type"],
        equals: query.importType,
      } as any;
    }

    if (query.jobId) {
      const numericJobId = Number(query.jobId);
      const jobIdFilters: Prisma.AuditLogWhereInput[] = [
        {
          entityType: "BulkImportJob",
          entityId: String(query.jobId),
        },
        {
          metadata: {
            path: ["jobId"],
            equals: Number.isFinite(numericJobId) ? numericJobId : query.jobId,
          } as any,
        },
        {
          metadata: {
            path: ["jobId"],
            equals: String(query.jobId),
          } as any,
        },
      ];

      where.OR = [...(where.OR || []), ...jobIdFilters];
    }

    const categoryFilter = this.categoryWhere(query.category);
    if (categoryFilter.length) {
      where.OR = [...(where.OR || []), ...categoryFilter];
    }

    if (query.search) {
      const searchFilter: Prisma.AuditLogWhereInput[] = [
        { action: { contains: query.search, mode: "insensitive" } },
        { entityType: { contains: query.search, mode: "insensitive" } },
        { entityId: { contains: query.search, mode: "insensitive" } },
        { message: { contains: query.search, mode: "insensitive" } },
        { actorName: { contains: query.search, mode: "insensitive" } },
      ];

      where.OR = [...(where.OR || []), ...searchFilter];
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
      skip,
      take: limit,
    });
  }

  private categoryWhere(category?: string): Prisma.AuditLogWhereInput[] {
    switch (category) {
      case "bulk-import":
        return [
          { action: { startsWith: "BULK_", mode: "insensitive" } },
          { entityType: { contains: "BulkImport", mode: "insensitive" } },
        ];
      case "templates":
        return [{ action: "BULK_TEMPLATE_DOWNLOADED" }];
      case "completed":
        return [
          { action: "BULK_IMPORT_COMPLETED" },
          { action: "BULK_IMPORT_PARTIALLY_COMPLETED" },
        ];
      case "failed":
        return [
          { action: "BULK_IMPORT_FAILED" },
          { action: "BULK_IMPORT_VALIDATION_FAILED" },
        ];
      case "media":
        return [
          { action: "MEDIA_IMPORT_FROM_EXCEL" },
          { action: "MEDIA_URL_INVALID" },
        ];
      case "translations":
        return [{ action: "BULK_TRANSLATION_JOB_CREATED" }];
      case "relations":
        return [
          { action: "BULK_DESTINATION_RELATION_CREATED" },
          { action: "BULK_DESTINATION_RELATION_WARNING" },
        ];
      default:
        return [];
    }
  }
}
