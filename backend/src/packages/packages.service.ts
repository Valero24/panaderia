import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreatePackageDto } from "./dto/create-package.dto";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { AuditService } from "../common/audit.service";
import { normalizeSeoSlug } from "../common/slug";
import { recordSlugAudit } from "../common/slug-audit";
import { normalizeTranslations } from "../common/translations";
import { normalizeFaq } from "../common/faq";
import { ProductFeaturesService } from "../product-features/product-features.service";
import { BookingType, TranslationEntityType } from "@prisma/client";
import { TranslationsService } from "../translations/translations.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly productFeatures: ProductFeaturesService,
    private readonly translations: TranslationsService
  ) {}

  private generateSlug(title: string): string {
    return normalizeSeoSlug(title);
  }

  private normalizeSlug(data: { title?: string; slug?: string | null }) {
    const raw = data.slug?.trim() || data.title?.trim();

    return raw ? this.generateSlug(raw) : null;
  }

  private async uniqueSlug(baseSlug: string | null, id?: number) {
    if (!baseSlug) {
      throw new BadRequestException("Slug de paquete requerido");
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.package.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === id) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private mapImages(images?: CreatePackageDto["images"]) {
    if (!Array.isArray(images) || images.length === 0) {
      return undefined;
    }

    return {
      create: images
        .filter((image) => image.url?.trim())
        .map((image, index) => ({
          url: image.url.trim(),
          mediaType: image.mediaType || "IMAGE",
          title: image.title?.trim() || null,
          description: image.description?.trim() || null,
          isPrimary: Boolean(image.isPrimary),
          active: image.active ?? true,
          sortOrder: image.sortOrder ?? index,
        })),
    };
  }

  private mapComponents(components?: CreatePackageDto["components"]) {
    if (!Array.isArray(components) || components.length === 0) {
      return undefined;
    }

    return {
      create: components
        .filter((component) => component.title?.trim())
        .map((component, index) => {
          const priceCop =
            component.priceCop !== undefined && component.priceCop !== null
              ? Number(component.priceCop)
              : null;

          if (priceCop !== null && (!Number.isFinite(priceCop) || priceCop < 0)) {
            throw new BadRequestException("Precio de componente invalido");
          }

          return {
            title: component.title.trim(),
            shortDescription: component.shortDescription?.trim() || null,
            description: component.description?.trim() || null,
            componentType: component.componentType?.trim() || null,
            day: component.day ?? null,
            translations: normalizeTranslations(component.translations),
            includes: component.includes?.trim() || null,
            excludes: component.excludes?.trim() || null,
            conditions: component.conditions?.trim() || null,
            duration: component.duration?.trim() || null,
            location: component.location?.trim() || null,
            recommendations: component.recommendations?.trim() || null,
            priceCop,
            baseCurrency: "COP",
            sortOrder: component.sortOrder ?? component.order ?? index,
            active: component.active ?? true,
          };
        }),
    };
  }

  private async attachPublicFeatures<T extends { id: number }>(packages: T[]) {
    const featuresByPackage =
      await this.productFeatures.getAssignedPublicFeatures(
        BookingType.PACKAGE,
        packages.map((item) => item.id)
      );

    return packages.map((item) => ({
      ...item,
      features: featuresByPackage.get(item.id) || [],
    }));
  }

  private async enqueueComponentTranslations(components: Array<Record<string, any>>) {
    for (const component of components || []) {
      this.translations.enqueueEntityTranslationInBackground({
        entityType: TranslationEntityType.PACKAGE_COMPONENT,
        entityId: Number(component.id),
        source: component,
        overwrite: false,
      });
    }
  }

  async findAllPublic(features?: string) {
    const featureProductIds =
      await this.productFeatures.productIdsMatchingFeatures(
        BookingType.PACKAGE,
        features
      );

    const packages = await this.prisma.package.findMany({
      where: {
        active: true,
        ...(featureProductIds ? { id: { in: featureProductIds } } : {}),
      },
      include: {
        images: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        components: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        destinations: {
          where: { destination: { isActive: true } },
          include: { destination: true },
          orderBy: [
            { isFeatured: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const withFeatures = await this.attachPublicFeatures(packages as any[]);

    return withFeatures.map((item: any) => {
      const { destinations, ...packageData } = item;

      return {
        ...packageData,
        destinations: Array.isArray(destinations)
          ? destinations.map((relation) => relation.destination)
          : [],
      };
    });
  }

  async findAllAdmin() {
    return this.prisma.package.findMany({
      include: {
        images: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        components: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOnePublic(identifier: string | number) {
    const value = String(identifier).trim();
    const numericId = /^\d+$/.test(value) ? Number(value) : null;
    const item = await this.prisma.package.findFirst({
      where: {
        ...(numericId ? { id: numericId } : { slug: value }),
        active: true,
      },
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        components: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        destinations: {
          where: { destination: { isActive: true } },
          include: { destination: true },
          orderBy: [
            { isFeatured: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Paquete no encontrado");
    }

    const { destinations, ...packageData } = item as any;
    const [withFeatures] = await this.attachPublicFeatures([packageData]);

    return {
      ...withFeatures,
      destinations: Array.isArray(destinations)
        ? destinations.map((relation) => relation.destination)
        : [],
    };
  }

  async findOneAdmin(id: number) {
    const item = await this.prisma.package.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        components: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Paquete no encontrado");
    }

    return item;
  }

  async create(data: CreatePackageDto, actor?: AuditActor) {
    if (!data.title?.trim()) {
      throw new BadRequestException("Titulo requerido");
    }

    if (!data.shortDescription?.trim()) {
      throw new BadRequestException("Descripcion corta requerida");
    }

    if (!data.description?.trim()) {
      throw new BadRequestException("Descripcion requerida");
    }

    if (!data.duration?.trim()) {
      throw new BadRequestException("Duracion requerida");
    }

    if (!data.location?.trim()) {
      throw new BadRequestException("Ubicacion requerida");
    }

    if (!Number.isInteger(data.maxGuests) || data.maxGuests < 1) {
      throw new BadRequestException("Capacidad invalida");
    }

    const priceCop = Number(data.priceCop ?? data.basePrice);

    if (!Number.isFinite(priceCop) || priceCop < 0) {
      throw new BadRequestException("Precio base invalido");
    }

    const slugWasAutoGenerated = !String(data.slug || "").trim();
    const baseSlug = this.normalizeSlug({
      title: data.title,
      slug: data.slug,
    });
    const slug = await this.uniqueSlug(baseSlug);
    const faq = normalizeFaq(data.faq);
    const translations = await this.translations.buildTranslationsForSave({
      source: {
        ...data,
        title: data.title.trim(),
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        duration: data.duration.trim(),
        location: data.location.trim(),
        includes: data.includes?.trim() || null,
        notIncludes: data.notIncludes?.trim() || null,
        itinerary: data.itinerary?.trim() || null,
        policies: data.policies?.trim() || null,
        recommendations: data.recommendations?.trim() || null,
        seoTitle: data.seoTitle?.trim() || null,
        seoDescription: data.seoDescription?.trim() || null,
        seoContent: data.seoContent?.trim() || null,
        faq,
      },
      manualTranslations: data.translations,
    });
    const translationsMeta = this.translations.buildTranslationsMetaForSave({
      manualTranslations: data.translations,
    });

    const created = await this.prisma.package.create({
      data: {
        title: data.title.trim(),
        slug,
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        translations,
        translationsMeta,
        duration: data.duration.trim(),
        location: data.location.trim(),
        minPeople: data.minPeople ?? null,
        maxGuests: Number(data.maxGuests),
        basePrice: priceCop,
        priceCop,
        baseCurrency: "COP",
        mainImage: data.mainImage?.trim() || null,
        category: data.category?.trim() || "Signature",
        includes: data.includes?.trim() || null,
        notIncludes: data.notIncludes?.trim() || null,
        itinerary: data.itinerary?.trim() || null,
        policies: data.policies?.trim() || null,
        recommendations: data.recommendations?.trim() || null,
        seoTitle: data.seoTitle?.trim() || null,
        seoDescription: data.seoDescription?.trim() || null,
        seoContent: data.seoContent?.trim() || null,
        faq,
        active: data.active ?? true,
        isFeatured: data.isFeatured ?? false,
        images: this.mapImages(data.images),
        components: this.mapComponents(data.components),
      },
      include: { images: true, components: true },
    });

    await this.audit.record({
      actor,
      action: "PACKAGE_CREATED",
      entityType: "Package",
      entityId: created.id,
      message: "Superadmin creo un paquete",
      newValue: {
        id: created.id,
        title: created.title,
        slug: created.slug,
        active: created.active,
        basePrice: created.basePrice,
      },
      metadata: {
        componentsCount: created.components.length,
      },
    });

    await recordSlugAudit({
      audit: this.audit,
      actor,
      entityType: "Package",
      entityId: created.id,
      operation: "create",
      baseSlug: baseSlug || "",
      finalSlug: created.slug,
      wasAutoGenerated: slugWasAutoGenerated,
      sourceField: "title",
    });

    this.translations.enqueueEntityTranslationInBackground({
      entityType: TranslationEntityType.PACKAGE,
      entityId: created.id,
      source: created as any,
      overwrite: false,
    });

    void this.enqueueComponentTranslations(created.components as any);

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.PACKAGE,
      entityId: created.id,
      manualTranslations: data.translations,
    });

    return created;
  }

  async update(id: number, data: UpdatePackageDto, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);

    const slugWasAutoGenerated =
      data.slug !== undefined || data.title !== undefined
        ? !String(data.slug || "").trim()
        : false;
    const slug =
      data.slug !== undefined || data.title !== undefined
        ? this.normalizeSlug({
            title: data.title,
            slug: data.slug,
          })
        : undefined;

    let nextSlug = slug;

    if (slug !== undefined) {
      nextSlug = await this.uniqueSlug(slug, id);
    }

    const nextData: any = {};

    for (const key of [
      "title",
      "shortDescription",
      "description",
      "duration",
      "location",
      "mainImage",
      "category",
      "includes",
      "notIncludes",
      "itinerary",
      "policies",
      "recommendations",
      "seoTitle",
      "seoDescription",
      "seoContent",
    ] as const) {
      if (data[key] !== undefined) {
        nextData[key] =
          typeof data[key] === "string" && data[key]
            ? data[key]?.trim()
            : data[key] || null;
      }
    }

    if (nextSlug !== undefined) {
      nextData.slug = nextSlug;
    }

    if (data.faq !== undefined) {
      nextData.faq = normalizeFaq(data.faq);
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

    if (data.maxGuests !== undefined) {
      if (!Number.isInteger(data.maxGuests) || data.maxGuests < 1) {
        throw new BadRequestException("Capacidad invalida");
      }

      nextData.maxGuests = Number(data.maxGuests);
    }

    if (data.minPeople !== undefined) {
      if (data.minPeople !== null && (!Number.isInteger(data.minPeople) || data.minPeople < 1)) {
        throw new BadRequestException("Minimo de personas invalido");
      }

      nextData.minPeople = data.minPeople;
    }

    if (data.isFeatured !== undefined) {
      nextData.isFeatured = Boolean(data.isFeatured);
    }

    if (data.basePrice !== undefined || data.priceCop !== undefined) {
      const priceCop = Number(data.priceCop ?? data.basePrice);

      if (
        !Number.isFinite(priceCop) ||
        priceCop < 0
      ) {
        throw new BadRequestException("Precio base invalido");
      }

      nextData.basePrice = priceCop;
      nextData.priceCop = priceCop;
      nextData.baseCurrency = "COP";
    }

    if (data.active !== undefined) {
      nextData.active = Boolean(data.active);
    }

    if (data.images !== undefined) {
      nextData.images = {
        deleteMany: {},
        ...this.mapImages(data.images),
      };
    }

    if (data.components !== undefined) {
      nextData.components = {
        deleteMany: {},
        ...this.mapComponents(data.components),
      };
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data: nextData,
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        components: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    await this.audit.record({
      actor,
      action:
        data.active !== undefined
          ? data.active
            ? "PACKAGE_ACTIVATED"
            : "PACKAGE_DEACTIVATED"
          : "PACKAGE_UPDATED",
      entityType: "Package",
      entityId: updated.id,
      message: "Superadmin actualizo un paquete",
      previousValue: {
        id: previous.id,
        title: previous.title,
        slug: previous.slug,
        active: previous.active,
        basePrice: previous.basePrice,
        componentsCount: previous.components.length,
      },
      newValue: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        active: updated.active,
        basePrice: updated.basePrice,
        componentsCount: updated.components.length,
      },
      metadata: {
        changedFields: Object.keys(nextData),
      },
    });

    if (nextData.slug !== undefined) {
      await recordSlugAudit({
        audit: this.audit,
        actor,
        entityType: "Package",
        entityId: updated.id,
        operation: "update",
        previousSlug: previous.slug,
        baseSlug: slug || "",
        finalSlug: updated.slug,
        wasAutoGenerated: slugWasAutoGenerated,
        sourceField: "title",
      });
    }

    if (changedTranslatableFields.length > 0) {
      this.translations.enqueueEntityTranslationInBackground({
        entityType: TranslationEntityType.PACKAGE,
        entityId: updated.id,
        source: updated as any,
        fields: changedTranslatableFields,
        overwrite: false,
      });
    }

    if (data.components !== undefined) {
      void this.enqueueComponentTranslations(updated.components as any);
    }

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.PACKAGE,
      entityId: updated.id,
      manualTranslations: data.translations,
    });

    return updated;
  }

  async remove(id: number, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);

    const updated = await this.prisma.package.update({
      where: { id },
      data: { active: false },
      include: { images: true, components: true },
    });

    await this.audit.record({
      actor,
      action: "PACKAGE_DEACTIVATED",
      entityType: "Package",
      entityId: updated.id,
      message: "Superadmin desactivo un paquete",
      previousValue: {
        id: previous.id,
        title: previous.title,
        active: previous.active,
      },
      newValue: {
        id: updated.id,
        title: updated.title,
        active: updated.active,
      },
    });

    return updated;
  }
}
