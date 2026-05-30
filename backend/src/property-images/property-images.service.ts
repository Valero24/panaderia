import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PropertyImagesService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  private normalize(data: any) {
    return {
      url: String(data.url || "").trim(),
      mediaType:
        data.mediaType === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE,
      title: data.title?.trim() || null,
      description: data.description?.trim() || null,
      isPrimary: Boolean(data.isPrimary),
      active: data.active ?? true,
      sortOrder:
        data.sortOrder === undefined ||
        data.sortOrder === null ||
        data.sortOrder === ""
          ? null
          : Number(data.sortOrder),
      propertyId: Number(data.propertyId),
    };
  }

  async create(data: any) {
    const payload = this.normalize(data);

    const image = await this.prisma.propertyImage.create({
      data: payload,
    });

    if (image.isPrimary) {
      await this.setPrimary(image.id);
    }

    return image;
  }

  findByProperty(propertyId: number) {
    return this.prisma.propertyImage.findMany({
      where: {
        propertyId,
        active: true,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  async setPrimary(id: number) {
    const image =
      await this.prisma.propertyImage.findUnique({
        where: { id },
      });

    if (!image) return null;

    await this.prisma.propertyImage.updateMany({
      where: {
        propertyId: image.propertyId,
      },
      data: {
        isPrimary: false,
      },
    });

    return this.prisma.propertyImage.update({
      where: {
        id,
      },
      data: {
        isPrimary: true,
        active: true,
      },
    });
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.propertyImage.findUnique({
      where: { id },
    });

    if (!existing) return null;

    const payload: any = {};

    for (const key of ["url", "title", "description"] as const) {
      if (data[key] !== undefined) {
        payload[key] = data[key]?.trim() || null;
      }
    }

    if (data.mediaType !== undefined) {
      payload.mediaType =
        data.mediaType === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE;
    }

    if (data.isPrimary !== undefined) {
      payload.isPrimary = Boolean(data.isPrimary);
    }

    if (data.active !== undefined) {
      payload.active = Boolean(data.active);
    }

    if (data.sortOrder !== undefined) {
      payload.sortOrder =
        data.sortOrder === null || data.sortOrder === ""
          ? null
          : Number(data.sortOrder);
    }

    const image = await this.prisma.propertyImage.update({
      where: { id },
      data: payload,
    });

    if (image.isPrimary) {
      await this.setPrimary(image.id);
    }

    return image;
  }

  remove(id: number) {
    return this.prisma.propertyImage.update({
      where: {
        id,
      },
      data: {
        active: false,
        isPrimary: false,
      },
    });
  }
}
