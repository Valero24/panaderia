import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, TranslationEntityType } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { normalizeSeoSlug } from "../common/slug";
import { recordSlugAudit } from "../common/slug-audit";
import { PrismaService } from "../prisma/prisma.service";
import { TranslationsService } from "../translations/translations.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly translations: TranslationsService
  ) {}

  private cleanText(value?: string | null) {
    return String(value || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private cleanLongText(value?: string | null) {
    return String(value || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .trim();
  }

  private normalizeSlug(data: { title?: string; slug?: string | null }) {
    const raw = data.slug?.trim() || data.title?.trim();
    return raw ? normalizeSeoSlug(raw) : "";
  }

  private async uniqueSlug(baseSlug: string, id?: number) {
    if (!baseSlug) {
      throw new BadRequestException("Slug del articulo requerido");
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === id) return slug;

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private normalizeJsonList(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === "") return Prisma.JsonNull;

    if (typeof value === "string") {
      const items = value
        .split(",")
        .map((item) => this.cleanText(item))
        .filter(Boolean);

      return items.length ? items : Prisma.JsonNull;
    }

    if (Array.isArray(value)) {
      const items = value
        .map((item) => this.cleanText(String(item || "")))
        .filter(Boolean);

      return items.length ? items : Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private assertPublishable(data: { title?: string | null; content?: string | null }) {
    if (!this.cleanText(data.title)) {
      throw new BadRequestException("Titulo requerido para publicar");
    }

    if (!this.cleanLongText(data.content)) {
      throw new BadRequestException("Contenido requerido para publicar");
    }
  }

  private hasPublicContent(item: { title?: string | null; content?: string | null }) {
    return Boolean(this.cleanText(item.title) && this.cleanLongText(item.content));
  }

  async findAllPublic() {
    const posts = await this.prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [
        { isFeatured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return posts.filter((item) => this.hasPublicContent(item));
  }

  async findFeaturedPublic() {
    const posts = await this.prisma.blogPost.findMany({
      where: { isPublished: true, isFeatured: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    });

    return posts.filter((item) => this.hasPublicContent(item));
  }

  async findOnePublic(identifier: string) {
    const cleanIdentifier = String(identifier || "").trim();
    const numericId = /^\d+$/.test(cleanIdentifier) ? Number(cleanIdentifier) : null;
    const item = await this.prisma.blogPost.findFirst({
      where: {
        ...(numericId ? { id: numericId } : { slug: cleanIdentifier }),
        isPublished: true,
      },
    });

    if (!item || !this.hasPublicContent(item)) {
      throw new NotFoundException("Articulo no encontrado");
    }

    return item;
  }

  async findAllAdmin() {
    return this.prisma.blogPost.findMany({
      orderBy: [
        { isPublished: "desc" },
        { isFeatured: "desc" },
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
    });
  }

  async findOneAdmin(id: number) {
    const item = await this.prisma.blogPost.findUnique({ where: { id } });

    if (!item) throw new NotFoundException("Articulo no encontrado");

    return item;
  }

  async create(data: CreateBlogPostDto, actor?: AuditActor) {
    const title = this.cleanText(data.title);

    if (!title) throw new BadRequestException("Titulo del articulo requerido");

    const content = this.cleanLongText(data.content);
    if (data.isPublished) this.assertPublishable({ title, content });
    const translations = await this.translations.buildTranslationsForSave({
      source: {
        ...data,
        title,
        excerpt: this.cleanText(data.excerpt) || null,
        content,
        seoTitle: this.cleanText(data.seoTitle) || null,
        seoDescription: this.cleanText(data.seoDescription) || null,
      },
      manualTranslations: data.translations,
    });
    const translationsMeta = this.translations.buildTranslationsMetaForSave({
      manualTranslations: data.translations,
    });

    const slugWasAutoGenerated = !String(data.slug || "").trim();
    const baseSlug = this.normalizeSlug({ title, slug: data.slug });
    const slug = await this.uniqueSlug(baseSlug);

    const created = await this.prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: this.cleanText(data.excerpt) || null,
        content,
        coverImage: this.cleanText(data.coverImage) || null,
        category: this.cleanText(data.category) || null,
        tags: this.normalizeJsonList(data.tags),
        seoTitle: this.cleanText(data.seoTitle) || null,
        seoDescription: this.cleanText(data.seoDescription) || null,
        seoKeywords: this.normalizeJsonList(data.seoKeywords),
        authorName: this.cleanText(data.authorName) || null,
        isPublished: Boolean(data.isPublished),
        publishedAt: data.isPublished ? new Date() : null,
        isFeatured: Boolean(data.isFeatured),
        translations,
        translationsMeta,
      },
    });

    await this.audit.record({
      actor,
      action: created.isPublished ? "BLOG_POST_PUBLISHED" : "BLOG_POST_CREATED",
      entityType: "BlogPost",
      entityId: created.id,
      message: `Articulo de blog creado: ${created.title}`,
      newValue: {
        id: created.id,
        title: created.title,
        slug: created.slug,
        isPublished: created.isPublished,
      },
    });

    await recordSlugAudit({
      audit: this.audit,
      actor,
      entityType: "BlogPost",
      entityId: created.id,
      operation: "create",
      baseSlug,
      finalSlug: created.slug,
      wasAutoGenerated: slugWasAutoGenerated,
      sourceField: "title",
    });

    this.translations.enqueueEntityTranslationInBackground({
      entityType: TranslationEntityType.BLOG_POST,
      entityId: created.id,
      source: created as any,
      overwrite: false,
    });

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.BLOG_POST,
      entityId: created.id,
      manualTranslations: data.translations,
    });

    return created;
  }

  async update(id: number, data: UpdateBlogPostDto, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);
    const nextData: any = {};

    for (const key of [
      "title",
      "excerpt",
      "coverImage",
      "category",
      "seoTitle",
      "seoDescription",
      "authorName",
    ] as const) {
      if (data[key] !== undefined) {
        nextData[key] = this.cleanText(data[key]) || null;
      }
    }

    if (data.content !== undefined) {
      nextData.content = this.cleanLongText(data.content);
    }

    let slugBase: string | undefined;
    let slugWasAutoGenerated = false;

    if (data.slug !== undefined || data.title !== undefined) {
      slugWasAutoGenerated = !String(data.slug || "").trim();
      slugBase = this.normalizeSlug({
        title: nextData.title || previous.title,
        slug: data.slug,
      });
      nextData.slug = await this.uniqueSlug(slugBase, id);
    }

    if (data.tags !== undefined) nextData.tags = this.normalizeJsonList(data.tags);
    if (data.seoKeywords !== undefined) {
      nextData.seoKeywords = this.normalizeJsonList(data.seoKeywords);
    }
    if (data.isFeatured !== undefined) {
      nextData.isFeatured = Boolean(data.isFeatured);
    }

    const changedTranslatableFields = Object.keys(nextData).filter((field) =>
      this.translations.getDefaultFields().includes(field)
    );

    if (data.translations !== undefined) {
      const translations = await this.translations.buildTranslationsForSave({
        source: {
          ...(previous as any),
          ...nextData,
        },
        existingTranslations: (previous as any).translations,
        manualTranslations: data.translations,
      });

      if (translations !== undefined) {
        nextData.translations = translations;
      }

      const translationsMeta = this.translations.buildTranslationsMetaForSave({
        manualTranslations: data.translations,
        existingMeta: (previous as any).translationsMeta,
      });

      if (translationsMeta !== undefined) {
        nextData.translationsMeta = translationsMeta;
      }
    }

    if (data.isPublished !== undefined) {
      const nextPublished = Boolean(data.isPublished);
      if (nextPublished) {
        this.assertPublishable({
          title: nextData.title ?? previous.title,
          content: nextData.content ?? previous.content,
        });
      }

      nextData.isPublished = nextPublished;
      if (nextPublished && !previous.publishedAt) {
        nextData.publishedAt = new Date();
      }
      if (!nextPublished) {
        nextData.publishedAt = null;
      }
    }

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: nextData,
    });

    await this.audit.record({
      actor,
      action:
        data.isPublished !== undefined
          ? data.isPublished
            ? "BLOG_POST_PUBLISHED"
            : "BLOG_POST_UNPUBLISHED"
          : "BLOG_POST_UPDATED",
      entityType: "BlogPost",
      entityId: updated.id,
      message: `Articulo de blog actualizado: ${updated.title}`,
      previousValue: {
        id: previous.id,
        title: previous.title,
        slug: previous.slug,
        isPublished: previous.isPublished,
      },
      newValue: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        isPublished: updated.isPublished,
      },
      metadata: { changedFields: Object.keys(nextData) },
    });

    if (nextData.slug !== undefined && slugBase) {
      await recordSlugAudit({
        audit: this.audit,
        actor,
        entityType: "BlogPost",
        entityId: updated.id,
        operation: "update",
        previousSlug: previous.slug,
        baseSlug: slugBase,
        finalSlug: updated.slug,
        wasAutoGenerated: slugWasAutoGenerated,
        sourceField: "title",
      });
    }

    if (changedTranslatableFields.length > 0) {
      this.translations.enqueueEntityTranslationInBackground({
        entityType: TranslationEntityType.BLOG_POST,
        entityId: updated.id,
        source: updated as any,
        fields: changedTranslatableFields,
        overwrite: false,
      });
    }

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.BLOG_POST,
      entityId: updated.id,
      manualTranslations: data.translations,
    });

    return updated;
  }

  async updateStatus(id: number, isPublished: boolean, actor?: AuditActor) {
    return this.update(id, { isPublished }, actor);
  }

  async remove(id: number, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);
    const removed = await this.prisma.blogPost.delete({ where: { id } });

    await this.audit.record({
      actor,
      action: "BLOG_POST_DELETED",
      entityType: "BlogPost",
      entityId: id,
      message: `Articulo de blog eliminado: ${previous.title}`,
      previousValue: {
        id: previous.id,
        title: previous.title,
        slug: previous.slug,
      },
    });

    return removed;
  }
}
