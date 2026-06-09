import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  Prisma,
  TranslationEntityType,
  TranslationJob,
  TranslationJobStatus,
  TranslationStatus,
} from "@prisma/client";

import { normalizeFaq, FaqItem } from "../common/faq";
import { AuditService } from "../common/audit.service";
import {
  DynamicTranslationsMeta,
  DynamicTranslations,
  markManualTranslationLocales,
  normalizeTranslations,
  normalizeTranslationsMeta,
} from "../common/translations";
import {
  cleanTranslationText,
  TARGET_LOCALES,
  TargetLocale,
  TranslationProviders,
} from "./translation.providers";
import {
  DEFAULT_TRANSLATABLE_FIELDS,
  hasUsableValue,
  isPlainObject,
  TranslationQueue,
} from "./translation.queue";

type TranslationReportItem = {
  locale: TargetLocale;
  field: string;
  status: "translated" | "kept" | "skipped";
  reason?: string;
};

type TranslationJobResult = {
  id: number;
  status: "COMPLETED" | "FAILED";
  error?: string;
};

const SHORT_TEXT_LIMITS: Record<string, number> = {
  title: 90,
  name: 90,
  seoTitle: 70,
  seoDescription: 160,
  shortDescription: 180,
  experienceCategory: 90,
};

const LONG_TEXT_FIELDS = new Set([
  "description",
  "seoContent",
  "locationDescription",
  "recommendations",
  "guestRecommendations",
  "conditions",
  "policies",
  "itinerary",
  "included",
  "includes",
  "notIncluded",
  "notIncludes",
  "content",
]);

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    private readonly providers: TranslationProviders,
    private readonly queue: TranslationQueue,
    private readonly audit: AuditService
  ) {}

  getProvider() {
    return this.providers.getProvider();
  }

  isAutoTranslationEnabled() {
    return this.providers.isAutoTranslationEnabled();
  }

  getDefaultFields() {
    return DEFAULT_TRANSLATABLE_FIELDS;
  }

  getDefaultSourceLanguage() {
    return this.providers.getDefaultSourceLanguage();
  }

  hasTranslatableFields(source: Record<string, unknown>) {
    return DEFAULT_TRANSLATABLE_FIELDS.some((field) =>
      hasUsableValue(source[field])
    );
  }

  async buildTranslationsForSave(input: {
    source: Record<string, unknown>;
    existingTranslations?: Record<string, unknown>;
    manualTranslations?: unknown;
    fields?: string[];
    overwrite?: boolean;
  }) {
    if (input.manualTranslations !== undefined) {
      return normalizeTranslations(input.manualTranslations);
    }

    return input.existingTranslations === undefined
      ? undefined
      : normalizeTranslations(input.existingTranslations);
  }

  buildTranslationsMetaForSave(input: {
    manualTranslations?: unknown;
    existingMeta?: unknown;
  }) {
    if (input.manualTranslations !== undefined) {
      return markManualTranslationLocales(
        input.manualTranslations,
        input.existingMeta
      );
    }

    return input.existingMeta === undefined
      ? undefined
      : normalizeTranslationsMeta(input.existingMeta);
  }

  async enqueueEntityTranslation(input: {
    entityType: TranslationEntityType;
    entityId: number;
    source: Record<string, unknown>;
    fields?: string[];
    overwrite?: boolean;
  }) {
    if (!this.isAutoTranslationEnabled()) {
      return null;
    }

    if (this.getProvider() === "DISABLED") {
      throw new BadRequestException(
        "AUTO_TRANSLATION_ENABLED requiere TRANSLATION_PROVIDER configurado"
      );
    }

    const fields = this.queue.getTranslatableFields(input.source, input.fields);

    if (fields.length === 0) {
      return null;
    }

    const { job, created } = await this.queue.upsertPendingJob({
      entityType: input.entityType,
      entityId: input.entityId,
      source: input.source,
      fields,
      sourceLanguage: this.providers.getDefaultSourceLanguage(),
      targetLanguages: this.providers.getTargetLocales(),
      overwrite: input.overwrite,
    });

    if (created) {
      this.recordTranslationAudit("TRANSLATION_JOB_CREATED", {
        entityType: input.entityType,
        entityId: input.entityId,
        jobId: job.id,
        metadata: {
          fields,
          sourceLanguage: this.providers.getDefaultSourceLanguage(),
          targetLanguages: this.providers.getTargetLocales(),
        },
      });
    }

    await this.queue.updateEntityTranslationStatus(input.entityType, input.entityId, {
      translationStatus:
        job.status === TranslationJobStatus.PROCESSING
          ? TranslationStatus.TRANSLATING
          : TranslationStatus.PENDING_TRANSLATION,
      translationError: null,
      translationRequestedAt: new Date(),
      translationCompletedAt: null,
    });

    return job;
  }

  recordManualOverrideInBackground(input: {
    entityType: TranslationEntityType;
    entityId: number;
    manualTranslations?: unknown;
  }) {
    if (!hasUsableValue(input.manualTranslations)) return;

    this.recordTranslationAudit("TRANSLATION_MANUAL_OVERRIDE", {
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: {
        languages: this.manualLanguages(input.manualTranslations),
      },
    });
  }

  enqueueEntityTranslationInBackground(input: {
    entityType: TranslationEntityType;
    entityId: number;
    source: Record<string, unknown>;
    fields?: string[];
    overwrite?: boolean;
  }) {
    void this.enqueueEntityTranslation(input).catch((error: any) => {
      this.logger.warn(
        `No se pudo encolar traduccion ${input.entityType}#${input.entityId}: ${
          error?.message || "error desconocido"
        }`
      );
    });
  }

  async bulkEnqueueExistingEntities(input: {
    items: Array<{
      entityType: TranslationEntityType;
      entityId: number;
      fields?: string[];
    }>;
    overwrite?: boolean;
  }) {
    const summary = {
      requested: input.items.length,
      enqueued: 0,
      skipped: 0,
      failed: 0,
      results: [] as Array<{
        entityType: TranslationEntityType;
        entityId: number;
        status: "ENQUEUED" | "SKIPPED" | "FAILED";
        jobId?: number;
        reason?: string;
      }>,
    };

    for (const item of input.items) {
      try {
        const entity = await this.queue.findEntity(
          item.entityType,
          Number(item.entityId)
        );

        if (!entity) {
          summary.skipped += 1;
          summary.results.push({
            entityType: item.entityType,
            entityId: item.entityId,
            status: "SKIPPED",
            reason: "ENTITY_NOT_FOUND",
          });
          continue;
        }

        const job = await this.enqueueEntityTranslation({
          entityType: item.entityType,
          entityId: item.entityId,
          source: entity as Record<string, unknown>,
          fields: item.fields,
          overwrite: Boolean(input.overwrite),
        });

        if (!job) {
          summary.skipped += 1;
          summary.results.push({
            entityType: item.entityType,
            entityId: item.entityId,
            status: "SKIPPED",
            reason: "NO_TRANSLATABLE_FIELDS_OR_DISABLED",
          });
          continue;
        }

        summary.enqueued += 1;
        summary.results.push({
          entityType: item.entityType,
          entityId: item.entityId,
          status: "ENQUEUED",
          jobId: job.id,
        });
      } catch (error: any) {
        summary.failed += 1;
        summary.results.push({
          entityType: item.entityType,
          entityId: item.entityId,
          status: "FAILED",
          reason: error?.message || "UNKNOWN_ERROR",
        });
      }
    }

    return summary;
  }

  enqueueImportedSpanishContent(input: {
    items: Array<{
      entityType: TranslationEntityType;
      entityId: number;
      fields?: string[];
    }>;
  }) {
    return this.bulkEnqueueExistingEntities({
      items: input.items,
      overwrite: false,
    });
  }

  async regenerateEntityTranslations(input: {
    entityType: TranslationEntityType;
    entityId: number;
    fields?: string[];
    overwrite?: boolean;
  }) {
    const entity = await this.queue.findEntity(input.entityType, input.entityId);

    if (!entity) {
      throw new BadRequestException("Entidad no encontrada para traduccion");
    }

    const cleaned = this.removeAutomaticTranslationsForRegeneration(
      (entity as any).translations,
      (entity as any).translationsMeta
    );

    await this.queue.updateEntityTranslations(input.entityType, input.entityId, {
      translations: cleaned.translations,
      translationsMeta: cleaned.translationsMeta,
      translationStatus: TranslationStatus.PENDING_TRANSLATION,
      translationError: null,
      translationRequestedAt: new Date(),
      translationCompletedAt: null,
    });

    const job = await this.enqueueEntityTranslation({
      entityType: input.entityType,
      entityId: input.entityId,
      source: entity as Record<string, unknown>,
      fields: input.fields,
      overwrite: input.overwrite ?? true,
    });

    this.recordTranslationAudit("TRANSLATION_REGENERATED", {
      entityType: input.entityType,
      entityId: input.entityId,
      jobId: job?.id,
      metadata: {
        fields: input.fields,
        protectedManualLanguages: Object.keys(
          this.toTranslationsMetaObject((entity as any).translationsMeta)
        ).filter(
          (locale) =>
            this.toTranslationsMetaObject((entity as any).translationsMeta)[locale]
              ?.manual
        ),
      },
    });

    return job;
  }

  async findJobs(status?: TranslationJobStatus, limit = 50) {
    return this.queue.findJobs(status, limit);
  }

  async processPendingJobs(limit = 5) {
    const jobs = await this.queue.findPendingJobs(limit);

    const results: TranslationJobResult[] = [];

    for (const job of jobs) {
      results.push(await this.processJob(job));
    }

    return {
      totalFound: jobs.length,
      completed: results.filter((item) => item.status === "COMPLETED").length,
      failed: results.filter((item) => item.status === "FAILED").length,
      results,
    };
  }

  private async processJob(job: TranslationJob): Promise<TranslationJobResult> {
    await this.queue.markProcessing(job.id);

    this.recordTranslationAudit("TRANSLATION_STARTED", {
      entityType: job.entityType,
      entityId: job.entityId,
      jobId: job.id,
      metadata: {
        sourceLanguage: job.sourceLanguage,
        targetLanguages: job.targetLanguages,
      },
    });

    await this.queue.updateEntityTranslationStatus(job.entityType, job.entityId, {
      translationStatus: TranslationStatus.TRANSLATING,
      translationError: null,
    });

    try {
      const entity = await this.queue.findEntity(job.entityType, job.entityId);
      const fields = Array.isArray(job.fields)
        ? job.fields.map(String)
        : undefined;

      const result = await this.translateEntity({
        source: job.sourceSnapshot as Record<string, unknown>,
        existingTranslations: (entity as any)?.translations,
        existingTranslationsMeta: (entity as any)?.translationsMeta,
        fields,
        sourceLocale: job.sourceLanguage || this.providers.getDefaultSourceLanguage(),
        targetLocales: Array.isArray(job.targetLanguages)
          ? job.targetLanguages.map(String)
          : undefined,
        overwrite: job.overwrite,
      });

      await this.queue.updateEntityTranslations(job.entityType, job.entityId, {
        translations: result.translations,
        translationsMeta: result.translationsMeta,
        translationStatus: TranslationStatus.COMPLETED,
        translationError: null,
        translationCompletedAt: new Date(),
      });

      await this.queue.markCompleted(job.id);

      this.recordTranslationAudit("TRANSLATION_COMPLETED", {
        entityType: job.entityType,
        entityId: job.entityId,
        jobId: job.id,
        metadata: {
          translatedFields: Array.isArray(job.fields) ? job.fields : undefined,
          report: result.report,
        },
      });

      return { id: job.id, status: "COMPLETED" };
    } catch (error: any) {
      const message = error?.message || "Error procesando traduccion";

      await this.queue.updateEntityTranslationStatus(job.entityType, job.entityId, {
        translationStatus: TranslationStatus.ERROR,
        translationError: message,
      });

      await this.queue.markFailed(job.id, message);

      this.recordTranslationAudit("TRANSLATION_FAILED", {
        entityType: job.entityType,
        entityId: job.entityId,
        jobId: job.id,
        metadata: {
          error: message,
        },
      });

      return { id: job.id, status: "FAILED", error: message };
    }
  }

  getTargetLocales(locales?: string[]) {
    return this.providers.getTargetLocales(locales);
  }

  async translateText(
    text: string,
    targetLocale: TargetLocale,
    sourceLocale = this.providers.getDefaultSourceLanguage(),
    options: { preserveLineBreaks?: boolean } = {}
  ) {
    const sourceText = cleanTranslationText(text, options);

    if (!sourceText) {
      return {
        provider: this.getProvider(),
        translatedText: "",
        status: "skipped" as const,
        reason: "EMPTY_TEXT",
      };
    }

    const provider = this.getProvider();

    if (provider === "DISABLED") {
      return {
        provider,
        translatedText: "",
        status: "skipped" as const,
        reason: "TRANSLATION_PROVIDER_DISABLED",
      };
    }

    const translatedText = await this.providers.translate(
      sourceText,
      sourceLocale,
      targetLocale,
      options
    );

    return {
      provider,
      translatedText,
      status: translatedText ? ("translated" as const) : ("skipped" as const),
      reason: translatedText ? undefined : "EMPTY_TRANSLATION_RESPONSE",
    };
  }

  async translateFaq(
    faq: unknown,
    targetLocale: TargetLocale,
    sourceLocale = this.providers.getDefaultSourceLanguage()
  ) {
    const normalized = normalizeFaq(faq);

    if (!normalized || normalized.length === 0) {
      return {
        provider: this.getProvider(),
        faq: [],
        status: "skipped" as const,
        reason: "EMPTY_FAQ",
      };
    }

    const translatedItems: FaqItem[] = [];
    let translatedCount = 0;

    for (const item of normalized) {
      const [question, answer] = await Promise.all([
        this.translateText(item.question, targetLocale, sourceLocale),
        this.translateText(item.answer, targetLocale, sourceLocale),
      ]);

      if (question.translatedText && answer.translatedText) {
        translatedItems.push({
          question: question.translatedText,
          answer: answer.translatedText,
        });
        translatedCount += 1;
      }
    }

    return {
      provider: this.getProvider(),
      faq: translatedItems,
      status:
        translatedItems.length > 0 ? ("translated" as const) : ("skipped" as const),
      reason: translatedItems.length > 0 ? undefined : "NO_FAQ_ITEMS_TRANSLATED",
      translatedCount,
    };
  }

  async translateFaqToLocales(
    faq: unknown,
    targetLocales?: string[],
    sourceLocale = this.providers.getDefaultSourceLanguage()
  ) {
    const translations: Partial<Record<TargetLocale, FaqItem[]>> = {};

    for (const locale of this.getTargetLocales(targetLocales)) {
      const result = await this.translateFaq(faq, locale, sourceLocale);

      if (result.faq.length > 0) {
        translations[locale] = result.faq;
      }
    }

    return translations;
  }

  async translateEntity(input: {
    source: Record<string, unknown>;
    existingTranslations?: Record<string, unknown>;
    existingTranslationsMeta?: Record<string, unknown>;
    fields?: string[];
    targetLocales?: string[];
    sourceLocale?: string;
    overwrite?: boolean;
  }) {
    const fields = (input.fields?.length
      ? input.fields
      : DEFAULT_TRANSLATABLE_FIELDS
    ).filter((field) => hasUsableValue(input.source[field]));

    const locales = this.getTargetLocales(input.targetLocales);
    const sourceLocale = input.sourceLocale || this.providers.getDefaultSourceLanguage();
    const overwrite = Boolean(input.overwrite);
    const report: TranslationReportItem[] = [];
    const currentTranslations = this.toTranslationObject(
      input.existingTranslations || input.source.translations
    );
    const translationsMeta = this.toTranslationsMetaObject(
      input.existingTranslationsMeta || input.source.translationsMeta
    );

    for (const locale of locales) {
      currentTranslations[locale] = currentTranslations[locale] || {};

      if (translationsMeta[locale]?.manual) {
        report.push({
          locale,
          field: "*",
          status: "kept",
          reason: "MANUAL_TRANSLATION_PROTECTED",
        });
        continue;
      }

      for (const field of fields) {
        if (!overwrite && hasUsableValue(currentTranslations[locale][field])) {
          report.push({ locale, field, status: "kept" });
          continue;
        }

        const sourceValue = input.source[field];
        const translatedValue = await this.translateValue(
          sourceValue,
          locale,
          field,
          sourceLocale
        );

        if (translatedValue !== undefined && hasUsableValue(translatedValue)) {
          currentTranslations[locale][field] = translatedValue;
          translationsMeta[locale] = {
            ...(translationsMeta[locale] || {}),
            manual: false,
            updatedAt: new Date().toISOString(),
          };
          report.push({ locale, field, status: "translated" });
          continue;
        }

        report.push({
          locale,
          field,
          status: "skipped",
          reason:
            this.getProvider() === "DISABLED"
              ? "TRANSLATION_PROVIDER_DISABLED"
              : "NO_TRANSLATION",
        });
      }

      if (Object.keys(currentTranslations[locale]).length === 0) {
        delete currentTranslations[locale];
      }
    }

    return {
      provider: this.getProvider(),
      translations: normalizeTranslations(currentTranslations),
      translationsMeta: normalizeTranslationsMeta(translationsMeta),
      report,
    };
  }

  private async translateValue(
    value: unknown,
    targetLocale: TargetLocale,
    fieldName?: string,
    sourceLocale = this.providers.getDefaultSourceLanguage()
  ): Promise<Prisma.InputJsonValue | undefined> {
    if (typeof value === "string") {
      const result = await this.translateLongText(
        value,
        targetLocale,
        sourceLocale,
        LONG_TEXT_FIELDS.has(String(fieldName || ""))
      );
      return this.formatTranslatedField(fieldName, result) || undefined;
    }

    if (Array.isArray(value)) {
      const faq = normalizeFaq(value);

      if (faq?.length) {
        const result = await this.translateFaq(faq, targetLocale, sourceLocale);
        return result.faq.length ? result.faq : undefined;
      }

      const translatedItems: Prisma.InputJsonValue[] = [];

      for (const item of value) {
        const translatedItem = await this.translateValue(
          item,
          targetLocale,
          undefined,
          sourceLocale
        );
        if (translatedItem !== undefined) translatedItems.push(translatedItem);
      }

      return translatedItems.length ? translatedItems : undefined;
    }

    if (isPlainObject(value)) {
      const translatedObject: Record<string, Prisma.InputJsonValue> = {};

      for (const [key, nestedValue] of Object.entries(value)) {
        const translatedValue = await this.translateValue(
          nestedValue,
          targetLocale,
          undefined,
          sourceLocale
        );
        if (translatedValue !== undefined) translatedObject[key] = translatedValue;
      }

      return Object.keys(translatedObject).length ? translatedObject : undefined;
    }

    return undefined;
  }

  private async translateLongText(
    text: string,
    targetLocale: TargetLocale,
    sourceLocale = this.providers.getDefaultSourceLanguage(),
    preserveLineBreaks = false
  ) {
    const sourceText = cleanTranslationText(text, { preserveLineBreaks });
    if (!sourceText) return "";

    const chunks = this.chunkText(sourceText, 4500);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const result = await this.translateText(chunk, targetLocale, sourceLocale, {
        preserveLineBreaks,
      });

      if (!result.translatedText) {
        return "";
      }

      translatedChunks.push(result.translatedText);
    }

    return translatedChunks.join(preserveLineBreaks ? "\n\n" : " ").trim();
  }

  private chunkText(text: string, maxLength: number) {
    if (text.length <= maxLength) return [text];

    const paragraphs = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let current = "";

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxLength) {
        if (current) {
          chunks.push(current);
          current = "";
        }

        chunks.push(...this.chunkLongParagraph(paragraph, maxLength));
        continue;
      }

      const next = current ? `${current}\n\n${paragraph}` : paragraph;

      if (next.length <= maxLength) {
        current = next;
        continue;
      }

      if (current) chunks.push(current);
      current = paragraph;
    }

    if (current) chunks.push(current);

    return chunks;
  }

  private chunkLongParagraph(text: string, maxLength: number) {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+|\S[\s\S]*$/g) || [text];
    let current = "";

    for (const sentence of sentences) {
      const next = current ? `${current} ${sentence.trim()}` : sentence.trim();

      if (next.length <= maxLength) {
        current = next;
        continue;
      }

      if (current) {
        chunks.push(current);
        current = "";
      }

      if (sentence.length <= maxLength) {
        current = sentence.trim();
        continue;
      }

      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength).trim());
      }
    }

    if (current) chunks.push(current);

    return chunks.filter(Boolean);
  }

  private formatTranslatedField(fieldName: string | undefined, value: string) {
    const text = String(value || "").trim();

    if (!text) return "";

    if (fieldName && SHORT_TEXT_LIMITS[fieldName]) {
      return this.truncateText(text, SHORT_TEXT_LIMITS[fieldName]);
    }

    return text;
  }

  private truncateText(value: string, maxLength: number) {
    const text = cleanTranslationText(value);

    if (text.length <= maxLength) return text;

    const truncated = text.slice(0, maxLength + 1);
    const lastSpace = truncated.lastIndexOf(" ");
    const safe =
      lastSpace > 80 ? truncated.slice(0, lastSpace) : text.slice(0, maxLength);

    return safe.replace(/[.,;:\s]+$/g, "").trim();
  }

  private toTranslationObject(value: unknown): DynamicTranslations {
    if (!isPlainObject(value)) return {};

    const normalized: DynamicTranslations = {};

    for (const locale of TARGET_LOCALES) {
      const fields = value[locale];
      if (isPlainObject(fields)) {
        normalized[locale] = { ...(fields as Record<string, Prisma.InputJsonValue>) };
      }
    }

    return normalized;
  }

  private toTranslationsMetaObject(value: unknown): DynamicTranslationsMeta {
    if (!isPlainObject(value)) return {};

    const normalized: DynamicTranslationsMeta = {};

    for (const locale of TARGET_LOCALES) {
      const meta = value[locale];
      if (isPlainObject(meta)) {
        normalized[locale] = {
          manual: Boolean(meta.manual),
          updatedAt:
            typeof meta.updatedAt === "string" && meta.updatedAt.trim()
              ? meta.updatedAt.trim()
              : undefined,
        };
      }
    }

    return normalized;
  }

  private removeAutomaticTranslationsForRegeneration(
    translations: unknown,
    translationsMeta: unknown
  ) {
    const currentTranslations = this.toTranslationObject(translations);
    const currentMeta = this.toTranslationsMetaObject(translationsMeta);
    const preservedTranslations: DynamicTranslations = {};
    const preservedMeta: DynamicTranslationsMeta = {};

    for (const locale of TARGET_LOCALES) {
      if (currentMeta[locale]?.manual && currentTranslations[locale]) {
        preservedTranslations[locale] = currentTranslations[locale];
        preservedMeta[locale] = currentMeta[locale];
      }
    }

    return {
      translations: normalizeTranslations(preservedTranslations),
      translationsMeta: normalizeTranslationsMeta(preservedMeta),
    };
  }

  private recordTranslationAudit(
    action: string,
    input: {
      entityType: TranslationEntityType;
      entityId: number;
      jobId?: number | null;
      metadata?: Record<string, unknown>;
    }
  ) {
    void this.audit.record({
      action,
      entityType: "Translation",
      entityId: input.jobId || `${input.entityType}:${input.entityId}`,
      message: this.translationAuditMessage(action),
      metadata: {
        entityType: input.entityType,
        entityId: input.entityId,
        jobId: input.jobId || null,
        ...(input.metadata || {}),
      },
    });
  }

  private translationAuditMessage(action: string) {
    const labels: Record<string, string> = {
      TRANSLATION_JOB_CREATED: "Job de traduccion creado",
      TRANSLATION_STARTED: "Traduccion iniciada",
      TRANSLATION_COMPLETED: "Traduccion completada",
      TRANSLATION_FAILED: "Traduccion fallida",
      TRANSLATION_REGENERATED: "Traducciones regeneradas",
      TRANSLATION_MANUAL_OVERRIDE: "Traduccion manual protegida",
    };

    return labels[action] || action;
  }

  private manualLanguages(value: unknown) {
    if (!isPlainObject(value)) return [];

    return TARGET_LOCALES.filter((locale) => {
      const fields = value[locale];
      return isPlainObject(fields) && hasUsableValue(fields);
    });
  }
}
