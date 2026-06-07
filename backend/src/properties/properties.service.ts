import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma.service";

import {
  BookingType,
  MediaType,
  PropertyStatus,
} from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { normalizeSeoSlug } from "../common/slug";
import { normalizeTranslations } from "../common/translations";
import { ProductFeaturesService } from "../product-features/product-features.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly productFeatures: ProductFeaturesService
  ) {}

  // =====================================================
  // HELPERS
  // =====================================================

  private generateSlug(title: string): string {
    return normalizeSeoSlug(title);
  }

  private async uniqueSlug(baseSlug: string, id?: number): Promise<string> {
    if (!baseSlug) {
      throw new BadRequestException("Slug is required");
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.property.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === id) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private toNumber(
    value: any,
    fallback: number | null = null
  ): number | null {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return fallback;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      return fallback;
    }

    return parsed;
  }

  private mapImages(images?: any[]) {
    if (!Array.isArray(images) || images.length === 0) {
      return undefined;
    }

    return {
      create: images
        .filter((image) => image.url?.trim())
        .map((image, index) => ({
          url: image.url.trim(),
          mediaType:
            image.mediaType === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE,
          title: image.title?.trim() || null,
          description: image.description?.trim() || null,
          isPrimary: Boolean(image.isPrimary),
          active: image.active ?? true,
          sortOrder: image.sortOrder ?? index,
        })),
    };
  }

  private mergeFeatureLists(legacyFeatures: any[] = [], dynamicFeatures: any[] = []) {
    const seen = new Set<string>();

    return [...dynamicFeatures, ...legacyFeatures].filter((feature) => {
      const key = feature.slug ? `slug:${feature.slug}` : `id:${feature.id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private async attachPublicFeatures<T extends { id: number; features?: any[] }>(
    properties: T[]
  ) {
    const featuresByProperty =
      await this.productFeatures.getAssignedPublicFeatures(
        BookingType.PROPERTY,
        properties.map((property) => property.id)
      );

    return properties.map((property) => ({
      ...property,
      features: this.mergeFeatureLists(
        property.features,
        featuresByProperty.get(property.id) || []
      ),
    }));
  }

  // =====================================================
  // FIND ALL
  // =====================================================

  async findAll(features?: string) {
    const featureProductIds =
      await this.productFeatures.productIdsMatchingFeatures(
        BookingType.PROPERTY,
        features
      );

    const properties = await this.prisma.property.findMany({
      where: featureProductIds
        ? {
            id: { in: featureProductIds },
            status: { in: [PropertyStatus.ACTIVE, PropertyStatus.FEATURED] },
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        images: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        extras: true,
        features: true,
      },
    });

    return this.attachPublicFeatures(properties);
  }

  // =====================================================
  // FIND ONE
  // =====================================================

  async findOne(identifier: string | number) {
    const value = String(identifier).trim();
    const numericId = /^\d+$/.test(value) ? Number(value) : null;
    const property =
      await this.prisma.property.findFirst({
        where: {
          ...(numericId
            ? { id: numericId }
            : { slug: value }),
        },
        include: {
          images: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          extras: true,
          features: true,
        },
      });

    if (!property) {
      throw new NotFoundException(
        "Property not found"
      );
    }

    const [withFeatures] = await this.attachPublicFeatures([property]);

    return withFeatures;
  }

  // =====================================================
  // CREATE
  // =====================================================

  async create(data: any, actor?: AuditActor) {
    if (!data.title?.trim()) {
      throw new BadRequestException(
        "Title is required"
      );
    }

    if (!data.city?.trim()) {
      throw new BadRequestException(
        "City is required"
      );
    }

    if (!data.area?.trim()) {
      throw new BadRequestException(
        "Area is required"
      );
    }

    const pricePerNight = this.toNumber(
      data.priceCop,
      this.toNumber(data.pricePerNight)
    );

    if (!pricePerNight || pricePerNight <= 0) {
      throw new BadRequestException(
        "Invalid nightly price"
      );
    }

    const baseSlug = this.generateSlug(data.slug || data.title);
    const slug = await this.uniqueSlug(baseSlug);

    const created = await this.prisma.property.create({
      data: {
        // COMMERCIAL
        title: data.title.trim(),
        slug,
        description:
          data.description || "",
        translations: normalizeTranslations(data.translations),

        city: data.city.trim(),
        area: data.area.trim(),
        address:
          data.address || null,
        icalUrl:
          data.icalUrl || null,

        // PRICING
        pricePerNight,
        priceCop: pricePerNight,
        baseCurrency: "COP",

        cleaningFee:
          this.toNumber(
            data.cleaningFee,
            0
          ) ?? 0,

        serviceFee:
          this.toNumber(
            data.serviceFee,
            0
          ) ?? 0,

        taxes:
          this.toNumber(
            data.taxes,
            0
          ) ?? 0,

        // ADVANCED PRICING
        basePrice:
          this.toNumber(
            data.basePrice,
            pricePerNight
          ) ?? pricePerNight,

        twoGuestsIncrease:
          this.toNumber(
            data.twoGuestsIncrease,
            0
          ) ?? 0,

        extraGuestIncrease:
          this.toNumber(
            data.extraGuestIncrease,
            0
          ) ?? 0,

        highSeasonPrice:
          this.toNumber(
            data.highSeasonPrice
          ),

        lowSeasonPrice:
          this.toNumber(
            data.lowSeasonPrice
          ),

        // CAPACITY
        maxGuests:
          this.toNumber(
            data.maxGuests,
            1
          ) ?? 1,

        maxCapacity:
          this.toNumber(
            data.maxCapacity,
            1
          ) ?? 1,

        bedrooms:
          this.toNumber(
            data.bedrooms,
            1
          ) ?? 1,

        bathrooms:
          this.toNumber(
            data.bathrooms,
            1
          ) ?? 1,

        minimumNights:
          this.toNumber(
            data.minimumNights,
            1
          ) ?? 1,

        // RULES
        allowsPets:
          data.allowsPets ?? false,

        allowsSmoking:
          data.allowsSmoking ?? false,

        allowsEvents:
          data.allowsEvents ?? false,

        allowsChildren:
          data.allowsChildren ?? true,

        checkInTime:
          data.checkInTime || null,

        checkOutTime:
          data.checkOutTime || null,

        cancellationPolicy:
          data.cancellationPolicy || null,

        // STATUS
        status:
          data.status ||
          PropertyStatus.DRAFT,

        // SEO
        seoTitle:
          data.seoTitle || null,

        seoDescription:
          data.seoDescription || null,

        // INTERNAL
        internalNotes:
          data.internalNotes || null,

        // GEO
        latitude:
          this.toNumber(
            data.latitude
          ),

        longitude:
          this.toNumber(
            data.longitude
          ),

        images: this.mapImages(data.images),
      },

      include: {
        images: true,
        extras: true,
        features: true,
      },
    });

    await this.audit.record({
      actor,
      action: "PROPERTY_CREATED",
      entityType: "Property",
      entityId: created.id,
      message: "Superadmin creo un alojamiento",
      newValue: {
        id: created.id,
        title: created.title,
        slug: created.slug,
        status: created.status,
        pricePerNight: created.pricePerNight,
      },
    });

    return created;
  }

  // =====================================================
  // UPDATE
  // =====================================================

  async update(
    id: number,
    data: any,
    actor?: AuditActor
  ) {
    const current = await this.findOne(id);

    const payload: any = {};

    if (data.title !== undefined) {
      payload.title = String(
        data.title
      ).trim();
    }

    if (data.slug !== undefined) {
      const slug = this.generateSlug(String(data.slug));

      if (!slug) {
        throw new BadRequestException(
          "Slug is required"
        );
      }

      payload.slug = await this.uniqueSlug(slug, Number(id));
    }

    if (data.description !== undefined)
      payload.description =
        data.description;

    if (data.translations !== undefined) {
      payload.translations = normalizeTranslations(data.translations);
    }

    if (data.city !== undefined)
      payload.city = String(
        data.city
      ).trim();

    if (data.area !== undefined)
      payload.area = String(
        data.area
      ).trim();

    if (data.address !== undefined)
      payload.address = data.address;

    if (data.icalUrl !== undefined)
      payload.icalUrl = data.icalUrl || null;

    if (
      data.pricePerNight !== undefined ||
      data.priceCop !== undefined
    ) {
      const priceCop = Number(
        data.priceCop ?? data.pricePerNight
      );

      if (!Number.isFinite(priceCop) || priceCop <= 0) {
        throw new BadRequestException(
          "Invalid nightly price"
        );
      }

      payload.pricePerNight = priceCop;
      payload.priceCop = priceCop;
      payload.baseCurrency = "COP";
    }

    if (data.cleaningFee !== undefined)
      payload.cleaningFee = Number(
        data.cleaningFee
      );

    if (data.serviceFee !== undefined)
      payload.serviceFee = Number(
        data.serviceFee
      );

    if (data.taxes !== undefined)
      payload.taxes = Number(
        data.taxes
      );

    if (data.basePrice !== undefined)
      payload.basePrice = Number(
        data.basePrice
      );

    if (
      data.twoGuestsIncrease !==
      undefined
    )
      payload.twoGuestsIncrease =
        Number(
          data.twoGuestsIncrease
        );

    if (
      data.extraGuestIncrease !==
      undefined
    )
      payload.extraGuestIncrease =
        Number(
          data.extraGuestIncrease
        );

    if (
      data.highSeasonPrice !==
      undefined
    )
      payload.highSeasonPrice =
        data.highSeasonPrice;

    if (
      data.lowSeasonPrice !==
      undefined
    )
      payload.lowSeasonPrice =
        data.lowSeasonPrice;

    if (data.maxGuests !== undefined)
      payload.maxGuests = Number(
        data.maxGuests
      );

    if (
      data.maxCapacity !== undefined
    )
      payload.maxCapacity = Number(
        data.maxCapacity
      );

    if (data.bedrooms !== undefined)
      payload.bedrooms = Number(
        data.bedrooms
      );

    if (data.bathrooms !== undefined)
      payload.bathrooms = Number(
        data.bathrooms
      );

    if (
      data.minimumNights !== undefined
    )
      payload.minimumNights = Number(
        data.minimumNights
      );

    if (data.allowsPets !== undefined)
      payload.allowsPets =
        data.allowsPets;

    if (
      data.allowsSmoking !== undefined
    )
      payload.allowsSmoking =
        data.allowsSmoking;

    if (
      data.allowsEvents !== undefined
    )
      payload.allowsEvents =
        data.allowsEvents;

    if (
      data.allowsChildren !==
      undefined
    )
      payload.allowsChildren =
        data.allowsChildren;

    if (data.checkInTime !== undefined)
      payload.checkInTime =
        data.checkInTime;

    if (
      data.checkOutTime !== undefined
    )
      payload.checkOutTime =
        data.checkOutTime;

    if (
      data.cancellationPolicy !==
      undefined
    )
      payload.cancellationPolicy =
        data.cancellationPolicy;

    if (data.status !== undefined)
      payload.status = data.status;

    if (data.seoTitle !== undefined)
      payload.seoTitle =
        data.seoTitle;

    if (
      data.seoDescription !==
      undefined
    )
      payload.seoDescription =
        data.seoDescription;

    if (
      data.internalNotes !==
      undefined
    )
      payload.internalNotes =
        data.internalNotes;

    if (data.latitude !== undefined)
      payload.latitude =
        data.latitude;

    if (data.longitude !== undefined)
      payload.longitude =
        data.longitude;

    if (data.images !== undefined) {
      payload.images = {
        deleteMany: {},
        ...this.mapImages(data.images),
      };
    }

    const updated = await this.prisma.property.update({
      where: {
        id: Number(id),
      },
      data: payload,
      include: {
        images: true,
        extras: true,
        features: true,
      },
    });

    await this.audit.record({
      actor,
      action:
        data.status !== undefined
          ? data.status === PropertyStatus.ACTIVE ||
            data.status === PropertyStatus.FEATURED
            ? "PROPERTY_ACTIVATED"
            : "PROPERTY_UPDATED"
          : "PROPERTY_UPDATED",
      entityType: "Property",
      entityId: updated.id,
      message: "Superadmin actualizo un alojamiento",
      previousValue: {
        id: current.id,
        title: current.title,
        slug: current.slug,
        status: current.status,
        pricePerNight: current.pricePerNight,
      },
      newValue: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        pricePerNight: updated.pricePerNight,
      },
      metadata: {
        changedFields: Object.keys(payload),
      },
    });

    return updated;
  }

  // =====================================================
  // DELETE
  // =====================================================

  async remove(id: number, actor?: AuditActor) {
    const current = await this.findOne(id);

    // delete bookings tied to this property
    await this.prisma.booking.deleteMany({
      where: {
        type: BookingType.PROPERTY,
        referenceId: Number(id),
      },
    });

    // delete availability blocks
    await this.prisma.availabilityBlock.deleteMany({
      where: {
        propertyId: Number(id),
      },
    });

    // images / extras / features use CASCADE
    const deleted = await this.prisma.property.delete({
      where: {
        id: Number(id),
      },
    });

    await this.audit.record({
      actor,
      action: "PROPERTY_DELETED",
      entityType: "Property",
      entityId: deleted.id,
      message: "Superadmin elimino un alojamiento",
      previousValue: {
        id: current.id,
        title: current.title,
        slug: current.slug,
        status: current.status,
      },
    });

    return deleted;
  }
}
