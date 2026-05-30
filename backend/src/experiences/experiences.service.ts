import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateExperienceDto } from "./dto/create-experience.dto";
import { UpdateExperienceDto } from "./dto/update-experience.dto";

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAllPublic() {
    return this.prisma.experience.findMany({
      where: { active: true },
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

  async create(data: CreateExperienceDto) {
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

    if (!Number.isFinite(Number(data.basePrice)) || Number(data.basePrice) < 0) {
      throw new BadRequestException("Precio base invalido");
    }

    const slug = this.normalizeSlug({
      title: data.title,
      slug: data.slug,
    });

    await this.assertUniqueSlug(slug);

    return this.prisma.experience.create({
      data: {
        title: data.title.trim(),
        slug,
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        location: data.location.trim(),
        duration: data.duration.trim(),
        maxGuests: Number(data.maxGuests),
        basePrice: Number(data.basePrice),
        category: data.category?.trim() || "Concierge",
        mainImage: data.mainImage?.trim() || null,
        active: data.active ?? true,
        policies: data.policies?.trim() || null,
        recommendations: data.recommendations?.trim() || null,
        images: this.mapImages(data.images),
      },
      include: { images: true },
    });
  }

  async update(id: number, data: UpdateExperienceDto) {
    await this.findOneAdmin(id);

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

    if (data.maxGuests !== undefined) {
      if (!Number.isInteger(data.maxGuests) || data.maxGuests < 1) {
        throw new BadRequestException("Capacidad invalida");
      }

      nextData.maxGuests = Number(data.maxGuests);
    }

    if (data.basePrice !== undefined) {
      if (
        !Number.isFinite(Number(data.basePrice)) ||
        Number(data.basePrice) < 0
      ) {
        throw new BadRequestException("Precio base invalido");
      }

      nextData.basePrice = Number(data.basePrice);
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

    return this.prisma.experience.update({
      where: { id },
      data: nextData,
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOneAdmin(id);

    return this.prisma.experience.update({
      where: { id },
      data: { active: false },
      include: { images: true },
    });
  }
}
