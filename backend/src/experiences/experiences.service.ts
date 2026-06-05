import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateExperienceDto } from "./dto/create-experience.dto";
import { UpdateExperienceDto } from "./dto/update-experience.dto";
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
export class ExperiencesService {
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

    if (!raw) {
      return null;
    }

    return this.generateSlug(raw);
  }

  private async assertUniqueSlug(slug: string | null, id?: number) {
    if (!slug) return;

    const existing = await this.prisma.experience.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== id) {
      throw new BadRequestException("Slug de experiencia ya existe");
    }
  }

  private mapImages(images?: CreateExperienceDto["images"]) {
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

  async findAllPublic(features?: string) {
    const featureProductIds =
      await this.productFeatures.productIdsMatchingFeatures(
        BookingType.EXPERIENCE,
        features
      );

    return this.prisma.experience.findMany({
      where: {
        active: true,
        ...(featureProductIds ? { id: { in: featureProductIds } } : {}),
      },
      include: {
        images: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllAdmin() {
    return this.prisma.experience.findMany({
      include: {
        images: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOnePublic(id: number) {
    const experience = await this.prisma.experience.findFirst({
      where: {
        id,
        active: true,
      },
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!experience) {
      throw new NotFoundException("Experiencia no encontrada");
    }

    return experience;
  }

  async findOneAdmin(id: number) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!experience) {
      throw new NotFoundException("Experiencia no encontrada");
    }

    return experience;
  }

  async create(data: CreateExperienceDto, actor?: AuditActor) {
    if (!data.title?.trim()) {
      throw new BadRequestException("Titulo requerido");
    }

    if (!data.shortDescription?.trim()) {
      throw new BadRequestException("Descripcion corta requerida");
    }

    if (!data.description?.trim()) {
      throw new BadRequestException("Descripcion requerida");
    }

    if (!data.location?.trim()) {
      throw new BadRequestException("Ubicacion requerida");
    }

    if (!data.duration?.trim()) {
      throw new BadRequestException("Duracion requerida");
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

    const created = await this.prisma.experience.create({
      data: {
        title: data.title.trim(),
        slug,
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        translations: normalizeTranslations(data.translations),
        location: data.location.trim(),
        duration: data.duration.trim(),
        maxGuests: Number(data.maxGuests),
        basePrice: priceCop,
        priceCop,
        baseCurrency: "COP",
        category: data.category?.trim() || "Concierge",
        mainImage: data.mainImage?.trim() || null,
        active: data.active ?? true,
        policies: data.policies?.trim() || null,
        recommendations: data.recommendations?.trim() || null,
        images: this.mapImages(data.images),
      },
      include: { images: true },
    });

    await this.audit.record({
      actor,
      action: "EXPERIENCE_CREATED",
      entityType: "Experience",
      entityId: created.id,
      message: "Superadmin creo una experiencia",
      newValue: {
        id: created.id,
        title: created.title,
        slug: created.slug,
        active: created.active,
        basePrice: created.basePrice,
      },
    });

    return created;
  }

  async update(id: number, data: UpdateExperienceDto, actor?: AuditActor) {
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
      "location",
      "duration",
      "category",
      "mainImage",
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

    const updated = await this.prisma.experience.update({
      where: { id },
      data: nextData,
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    await this.audit.record({
      actor,
      action:
        data.active !== undefined
          ? data.active
            ? "EXPERIENCE_ACTIVATED"
            : "EXPERIENCE_DEACTIVATED"
          : "EXPERIENCE_UPDATED",
      entityType: "Experience",
      entityId: updated.id,
      message: "Superadmin actualizo una experiencia",
      previousValue: {
        id: previous.id,
        title: previous.title,
        slug: previous.slug,
        active: previous.active,
        basePrice: previous.basePrice,
      },
      newValue: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        active: updated.active,
        basePrice: updated.basePrice,
      },
      metadata: {
        changedFields: Object.keys(nextData),
      },
    });

    return updated;
  }

  async remove(id: number, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);

    const updated = await this.prisma.experience.update({
      where: { id },
      data: { active: false },
      include: { images: true },
    });

    await this.audit.record({
      actor,
      action: "EXPERIENCE_DEACTIVATED",
      entityType: "Experience",
      entityId: updated.id,
      message: "Superadmin desactivo una experiencia",
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
