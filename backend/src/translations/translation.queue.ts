import { Injectable } from "@nestjs/common";
import {
  Prisma,
  TranslationEntityType,
  TranslationJobStatus,
  TranslationStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export const DEFAULT_TRANSLATABLE_FIELDS = [
  "title",
  "name",
  "description",
  "shortDescription",
  "seoTitle",
  "seoDescription",
  "seoContent",
  "faq",
  "recommendations",
  "guestRecommendations",
  "itinerary",
  "included",
  "includes",
  "notIncluded",
  "notIncludes",
  "conditions",
  "policies",
  "location",
  "locationDescription",
  "nearbyAttractions",
  "meetingPoint",
  "durationDescription",
  "schedule",
  "experienceCategory",
  "excerpt",
  "content",
];

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasUsableValue(value: unknown) {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

function toJsonObject(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value || {})) as Prisma.InputJsonObject;
}

@Injectable()
export class TranslationQueue {
  constructor(private readonly prisma: PrismaService) {}

  getTranslatableFields(source: Record<string, unknown>, fields?: string[]) {
    return (fields?.length ? fields : DEFAULT_TRANSLATABLE_FIELDS).filter((field) =>
      hasUsableValue(source[field])
    );
  }

  async upsertPendingJob(input: {
    entityType: TranslationEntityType;
    entityId: number;
    source: Record<string, unknown>;
    fields: string[];
    sourceLanguage: string;
    targetLanguages: string[];
    overwrite?: boolean;
  }) {
    const existingJob = await this.prisma.translationJob.findFirst({
      where: {
        entityType: input.entityType,
        entityId: Number(input.entityId),
        status: {
          in: [TranslationJobStatus.PENDING, TranslationJobStatus.PROCESSING],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingJob) {
      const existingFields = Array.isArray(existingJob.fields)
        ? existingJob.fields.map(String)
        : [];
      const mergedFields = [...new Set([...existingFields, ...input.fields])];

      const job = await this.prisma.translationJob.update({
        where: { id: existingJob.id },
        data: {
          fields: mergedFields,
          sourceLanguage: input.sourceLanguage,
          targetLanguages: input.targetLanguages,
          sourceSnapshot: toJsonObject(input.source),
          overwrite: existingJob.overwrite || Boolean(input.overwrite),
          error: null,
        },
      });

      return { job, created: false };
    }

    const job = await this.prisma.translationJob.create({
      data: {
        entityType: input.entityType,
        entityId: Number(input.entityId),
        sourceLanguage: input.sourceLanguage,
        targetLanguages: input.targetLanguages,
        fields: input.fields,
        sourceSnapshot: toJsonObject(input.source),
        overwrite: Boolean(input.overwrite),
      },
    });

    return { job, created: true };
  }

  findJobs(status?: TranslationJobStatus, limit = 50) {
    return this.prisma.translationJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 50, 1), 100),
    });
  }

  findPendingJobs(limit = 5) {
    return this.prisma.translationJob.findMany({
      where: { status: TranslationJobStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: Math.min(Math.max(Number(limit) || 5, 1), 20),
    });
  }

  markProcessing(jobId: number) {
    return this.prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: TranslationJobStatus.PROCESSING,
        startedAt: new Date(),
        attempts: { increment: 1 },
        error: null,
      },
    });
  }

  markCompleted(jobId: number) {
    return this.prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: TranslationJobStatus.COMPLETED,
        completedAt: new Date(),
        finishedAt: new Date(),
        error: null,
      },
    });
  }

  markFailed(jobId: number, error: string) {
    return this.prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: TranslationJobStatus.FAILED,
        finishedAt: new Date(),
        error,
      },
    });
  }

  findEntity(entityType: TranslationEntityType, entityId: number) {
    if (entityType === TranslationEntityType.PROPERTY) {
      return this.prisma.property.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.EXPERIENCE) {
      return this.prisma.experience.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.PACKAGE) {
      return this.prisma.package.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.DESTINATION) {
      return this.prisma.destination.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.BLOG_POST) {
      return this.prisma.blogPost.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.BLOG) {
      return this.prisma.blogPost.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.EXTRA_SERVICE) {
      return this.prisma.extraService.findUnique({ where: { id: entityId } });
    }

    if (entityType === TranslationEntityType.PRODUCT_FEATURE) {
      return this.prisma.productFeature.findUnique({ where: { id: entityId } });
    }

    return this.prisma.packageComponent.findUnique({ where: { id: entityId } });
  }

  updateEntityTranslationStatus(
    entityType: TranslationEntityType,
    entityId: number,
    data: {
      translationStatus: TranslationStatus;
      translationError?: string | null;
      translationRequestedAt?: Date | null;
      translationCompletedAt?: Date | null;
    }
  ) {
    return this.updateEntityTranslations(entityType, entityId, data);
  }

  updateEntityTranslations(
    entityType: TranslationEntityType,
    entityId: number,
    data: {
      translations?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      translationsMeta?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      translationStatus?: TranslationStatus;
      translationError?: string | null;
      translationRequestedAt?: Date | null;
      translationCompletedAt?: Date | null;
    }
  ) {
    const updateData = data as any;

    if (entityType === TranslationEntityType.PROPERTY) {
      return this.prisma.property.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.EXPERIENCE) {
      return this.prisma.experience.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.PACKAGE) {
      return this.prisma.package.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.DESTINATION) {
      return this.prisma.destination.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.BLOG_POST) {
      return this.prisma.blogPost.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.BLOG) {
      return this.prisma.blogPost.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.EXTRA_SERVICE) {
      return this.prisma.extraService.update({ where: { id: entityId }, data: updateData });
    }

    if (entityType === TranslationEntityType.PRODUCT_FEATURE) {
      return this.prisma.productFeature.update({ where: { id: entityId }, data: updateData });
    }

    return this.prisma.packageComponent.update({ where: { id: entityId }, data: updateData });
  }
}
