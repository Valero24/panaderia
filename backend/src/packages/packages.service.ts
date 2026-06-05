import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreatePackageDto } from "./dto/create-package.dto";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { AuditService } from "../common/audit.service";
import { normalizeTranslations } from "../common/translations";
import { ProductFeaturesService } from "../product-features/product-features.service";
import { BookingType } from "@prisma/client";

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
    private readonly productFeatures: ProductFeaturesService
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  private normalizeSlug(data: { title?: string; slug?: string | null }) {
    const raw = data.slug?.trim() || data.title?.trim();

    return raw ? this.generateSlug(raw) : null;
  }

  private async assertUniqueSlug(slug: string | null, id?: number) {
    if (!slug) return;

    const existing = await this.prisma.package.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== id) {
      throw new BadRequestException("Slug de paquete ya existe");
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

  async findAllPublic(features?: string) {
    const featureProductIds =
      await this.productFeatures.productIdsMatchingFeatures(
        BookingType.PACKAGE,
        features
      );

    return this.prisma.package.findMany({
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
      },
      orderBy: { createdAt: "desc" },
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

  async findOnePublic(id: number) {
    const item = await this.prisma.package.findFirst({
      where: {
        id,
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
      },
    });

    if (!item) {
      throw new NotFoundException("Paquete no encontrado");
    }

    return item;
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

    const slug = this.normalizeSlug({
      title: data.title,
      slug: data.slug,
    });

    await this.assertUniqueSlug(slug);

    const created = await this.prisma.package.create({
      data: {
        title: data.title.trim(),
        slug,
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        translations: normalizeTranslations(data.translations),
        duration: data.duration.trim(),
        location: data.location.trim(),
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
        active: data.active ?? true,
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

    return created;
  }

  async update(id: number, data: UpdatePackageDto, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);

    const slug =
      data.slug !== undefined || data.title !== undefined
        ? this.normalizeSlug({
            title: data.title,
            slug: data.slug,
          })
        : undefined;

    if (slug !== undefined) {
      await this.assertUniqueSlug(slug, id);
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
    ] as const) {
      if (data[key] !== undefined) {
        nextData[key] =
          typeof data[key] === "string" && data[key]
            ? data[key]?.trim()
            : data[key] || null;
      }
    }

    if (slug !== undefined) {
      nextData.slug = slug;
    }

    if (data.translations !== undefined) {
      nextData.translations = normalizeTranslations(data.translations);
    }

    if (data.maxGuests !== undefined) {
      if (!Number.isInteger(data.maxGuests) || data.maxGuests < 1) {
        throw new BadRequestException("Capacidad invalida");
      }

      nextData.maxGuests = Number(data.maxGuests);
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
