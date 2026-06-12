import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PropertyStatus, TranslationEntityType } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { normalizeFaq } from "../common/faq";
import { normalizeSeoSlug } from "../common/slug";
import { recordSlugAudit } from "../common/slug-audit";
import { PrismaService } from "../prisma/prisma.service";
import { TranslationsService } from "../translations/translations.service";
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateProductDestinationsDto } from "./dto/update-product-destinations.dto";
import { UpdateDestinationRelationsDto } from "./dto/update-destination-relations.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type DestinationMediaItem = {
  type: "IMAGE" | "VIDEO";
  url: string;
  title?: string | null;
  description?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};

@Injectable()
export class DestinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly translations: TranslationsService
  ) {}

  private cleanText(value?: string | null) {
    return (value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  private normalizeGallery(value: unknown): DestinationMediaItem[] {
    if (typeof value === "string") {
      try {
        return this.normalizeGallery(JSON.parse(value));
      } catch {
        throw new BadRequestException("Galeria debe tener formato valido");
      }
    }

    if (value === undefined || value === null || value === "") return [];
    if (!Array.isArray(value)) {
      throw new BadRequestException("Galeria debe ser una lista de multimedia");
    }

    const media: DestinationMediaItem[] = [];

    value.forEach((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url) return;

        media.push({
          type: "IMAGE",
          url,
          title: null,
          description: null,
          isPrimary: index === 0,
          sortOrder: index + 1,
        });
        return;
      }

      if (!item || typeof item !== "object") return;

      const source = item as Record<string, unknown>;
      const type = String(source.type || "IMAGE").trim().toUpperCase();
      const url = this.cleanText(String(source.url || ""));

      if (!["IMAGE", "VIDEO"].includes(type)) {
        throw new BadRequestException("El tipo de multimedia debe ser IMAGE o VIDEO");
      }

      if (!url) return;

      media.push({
        type: type as "IMAGE" | "VIDEO",
        url,
        title: this.cleanText(String(source.title || "")) || null,
        description: this.cleanText(String(source.description || "")) || null,
        isPrimary: Boolean(source.isPrimary),
        sortOrder: Number(source.sortOrder || index + 1),
      });
    });

    media.forEach((item) => {
      try {
        const url = new URL(item.url);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        throw new BadRequestException(`URL de multimedia no valida: ${item.url}`);
      }
    });

    if (media.length && !media.some((item) => item.isPrimary)) {
      media[0].isPrimary = true;
    }

    let primaryAssigned = false;
    return media.map((item, index) => {
      const isPrimary = Boolean(item.isPrimary && !primaryAssigned);
      if (isPrimary) primaryAssigned = true;

      return {
        ...item,
        isPrimary,
        sortOrder: Number.isFinite(Number(item.sortOrder))
          ? Number(item.sortOrder)
          : index + 1,
      };
    });
  }

  private primaryImageFromGallery(gallery: DestinationMediaItem[]) {
    return (
      gallery.find((item) => item.type === "IMAGE" && item.isPrimary)?.url ||
      gallery.find((item) => item.type === "IMAGE")?.url ||
      null
    );
  }

  private normalizeSlug(data: { name?: string; slug?: string | null }) {
    const raw = data.slug?.trim() || data.name?.trim();
    return raw ? normalizeSeoSlug(raw) : "";
  }

  private async uniqueSlug(baseSlug: string, id?: number) {
    if (!baseSlug) {
      throw new BadRequestException("Slug de destino requerido");
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.destination.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === id) return slug;

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private relationOrderBy() {
    return [
      { isFeatured: "desc" as const },
      { sortOrder: "asc" as const },
      { createdAt: "desc" as const },
    ];
  }

  private normalizeRelationItems(
    items: { id: number; sortOrder?: number; isFeatured?: boolean }[] = [],
    label: string
  ) {
    const seen = new Set<number>();

    return items.map((item, index) => {
      const id = Number(item.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(`ID invalido en ${label}`);
      }

      if (seen.has(id)) {
        throw new BadRequestException(`Relacion duplicada en ${label}: ${id}`);
      }

      seen.add(id);

      return {
        id,
        sortOrder:
          Number.isInteger(Number(item.sortOrder)) && Number(item.sortOrder) >= 0
            ? Number(item.sortOrder)
            : index,
        isFeatured: Boolean(item.isFeatured),
      };
    });
  }

  private linkedActionForProduct(type: "PROPERTY" | "EXPERIENCE" | "PACKAGE") {
    if (type === "PROPERTY") return "DESTINATION_PROPERTY_LINKED";
    if (type === "EXPERIENCE") return "DESTINATION_EXPERIENCE_LINKED";
    return "DESTINATION_PACKAGE_LINKED";
  }

  private productLabel(type: "PROPERTY" | "EXPERIENCE" | "PACKAGE") {
    if (type === "PROPERTY") return "alojamiento";
    if (type === "EXPERIENCE") return "experiencia";
    return "paquete";
  }

  private async recordRelationLinked(input: {
    actor?: AuditActor;
    destinationId: number;
    destinationName?: string | null;
    productType: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
    productId: number;
    relation?: unknown;
  }) {
    await this.audit.record({
      actor: input.actor,
      action: this.linkedActionForProduct(input.productType),
      entityType: "Destination",
      entityId: input.destinationId,
      message: `Destino relacionado con ${this.productLabel(input.productType)}`,
      newValue: input.relation,
      metadata: {
        destinationId: input.destinationId,
        destinationName: input.destinationName || null,
        productType: input.productType,
        productId: input.productId,
      },
    });
  }

  private async recordRelationRemoved(input: {
    actor?: AuditActor;
    destinationId: number;
    destinationName?: string | null;
    productType: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
    productId: number;
    relation?: unknown;
  }) {
    await this.audit.record({
      actor: input.actor,
      action: "DESTINATION_RELATION_REMOVED",
      entityType: "Destination",
      entityId: input.destinationId,
      message: `Relacion de destino removida de ${this.productLabel(input.productType)}`,
      previousValue: input.relation,
      metadata: {
        destinationId: input.destinationId,
        destinationName: input.destinationName || null,
        productType: input.productType,
        productId: input.productId,
      },
    });
  }

  private async assertIdsExist(
    model: "property" | "experience" | "package",
    ids: number[],
    label: string
  ) {
    if (ids.length === 0) return;

    const count = await (this.prisma[model] as any).count({
      where: { id: { in: ids } },
    });

    if (count !== ids.length) {
      throw new BadRequestException(`Uno o mas ${label} no existen`);
    }
  }

  private normalizeProductType(type: string) {
    const normalized = String(type || "").trim().toUpperCase();

    if (!["PROPERTY", "EXPERIENCE", "PACKAGE"].includes(normalized)) {
      throw new BadRequestException("Tipo de producto invalido");
    }

    return normalized as "PROPERTY" | "EXPERIENCE" | "PACKAGE";
  }

  private async assertProductExists(
    type: "PROPERTY" | "EXPERIENCE" | "PACKAGE",
    productId: number
  ) {
    const model =
      type === "PROPERTY"
        ? "property"
        : type === "EXPERIENCE"
          ? "experience"
          : "package";

    await this.assertIdsExist(model, [productId], "productos");
  }

  private async activeDestinationsByIds(ids: number[]) {
    if (ids.length === 0) return [];

    return this.prisma.destination.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
  }

  async findAllPublic() {
    return this.prisma.destination.findMany({
      where: { isActive: true },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });
  }

  async findFeaturedPublic() {
    return this.prisma.destination.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findOnePublic(identifier: string) {
    const cleanIdentifier = String(identifier || "").trim();
    const numericId = /^\d+$/.test(cleanIdentifier) ? Number(cleanIdentifier) : null;
    const item = await this.prisma.destination.findFirst({
      where: numericId
        ? { id: numericId, isActive: true }
        : { slug: cleanIdentifier, isActive: true },
      include: {
        properties: {
          where: {
            property: {
              status: { in: [PropertyStatus.ACTIVE, PropertyStatus.FEATURED] },
            },
          },
          include: {
            property: {
              include: {
                images: {
                  where: { active: true },
                  orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                },
              },
            },
          },
          orderBy: this.relationOrderBy(),
        },
        experiences: {
          where: { experience: { active: true } },
          include: {
            experience: {
              include: {
                images: {
                  where: { active: true },
                  orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                },
              },
            },
          },
          orderBy: this.relationOrderBy(),
        },
        packages: {
          where: { package: { active: true } },
          include: {
            package: {
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
            },
          },
          orderBy: this.relationOrderBy(),
        },
      },
    });

    if (!item) throw new NotFoundException("Destino no encontrado");

    const { properties, experiences, packages, ...destination } = item;

    return {
      ...destination,
      properties: properties.map((relation) => relation.property),
      experiences: experiences.map((relation) => relation.experience),
      packages: packages.map((relation) => relation.package),
    };
  }

  async findAllAdmin() {
    return this.prisma.destination.findMany({
      orderBy: [
        { isActive: "desc" },
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });
  }

  async findOneAdmin(id: number) {
    const item = await this.prisma.destination.findUnique({ where: { id } });

    if (!item) throw new NotFoundException("Destino no encontrado");

    return item;
  }

  async findRelations(id: number) {
    await this.findOneAdmin(id);

    const [properties, experiences, packages] = await Promise.all([
      this.prisma.destinationProperty.findMany({
        where: { destinationId: id },
        include: { property: true },
        orderBy: this.relationOrderBy(),
      }),
      this.prisma.destinationExperience.findMany({
        where: { destinationId: id },
        include: { experience: true },
        orderBy: this.relationOrderBy(),
      }),
      this.prisma.destinationPackage.findMany({
        where: { destinationId: id },
        include: { package: true },
        orderBy: this.relationOrderBy(),
      }),
    ]);

    return {
      properties: properties.map(({ property, ...relation }) => ({
        ...relation,
        item: property,
      })),
      experiences: experiences.map(({ experience, ...relation }) => ({
        ...relation,
        item: experience,
      })),
      packages: packages.map(({ package: packageItem, ...relation }) => ({
        ...relation,
        item: packageItem,
      })),
    };
  }

  async updateRelations(
    id: number,
    data: UpdateDestinationRelationsDto,
    actor?: AuditActor
  ) {
    const destination = await this.findOneAdmin(id);
    const properties = this.normalizeRelationItems(data.properties, "alojamientos");
    const experiences = this.normalizeRelationItems(data.experiences, "experiencias");
    const packages = this.normalizeRelationItems(data.packages, "paquetes");
    const previous = await this.findRelations(id);

    await Promise.all([
      this.assertIdsExist(
        "property",
        properties.map((item) => item.id),
        "alojamientos"
      ),
      this.assertIdsExist(
        "experience",
        experiences.map((item) => item.id),
        "experiencias"
      ),
      this.assertIdsExist(
        "package",
        packages.map((item) => item.id),
        "paquetes"
      ),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.destinationProperty.deleteMany({ where: { destinationId: id } });
      await tx.destinationExperience.deleteMany({ where: { destinationId: id } });
      await tx.destinationPackage.deleteMany({ where: { destinationId: id } });

      if (properties.length > 0) {
        await tx.destinationProperty.createMany({
          data: properties.map((item) => ({
            destinationId: id,
            propertyId: item.id,
            sortOrder: item.sortOrder,
            isFeatured: item.isFeatured,
          })),
        });
      }

      if (experiences.length > 0) {
        await tx.destinationExperience.createMany({
          data: experiences.map((item) => ({
            destinationId: id,
            experienceId: item.id,
            sortOrder: item.sortOrder,
            isFeatured: item.isFeatured,
          })),
        });
      }

      if (packages.length > 0) {
        await tx.destinationPackage.createMany({
          data: packages.map((item) => ({
            destinationId: id,
            packageId: item.id,
            sortOrder: item.sortOrder,
            isFeatured: item.isFeatured,
          })),
        });
      }
    });

    const updated = await this.findRelations(id);

    await this.audit.record({
      actor,
      action: "DESTINATION_RELATIONS_UPDATED",
      entityType: "Destination",
      entityId: id,
      message: `Relaciones actualizadas para destino: ${destination.name}`,
      previousValue: previous,
      newValue: updated,
      metadata: {
        properties: properties.length,
        experiences: experiences.length,
        packages: packages.length,
      },
    });

    const relationGroups = [
      {
        type: "PROPERTY" as const,
        previous: previous.properties,
        updated: updated.properties,
        previousId: (relation: any) => Number(relation.propertyId),
        updatedId: (relation: any) => Number(relation.propertyId),
      },
      {
        type: "EXPERIENCE" as const,
        previous: previous.experiences,
        updated: updated.experiences,
        previousId: (relation: any) => Number(relation.experienceId),
        updatedId: (relation: any) => Number(relation.experienceId),
      },
      {
        type: "PACKAGE" as const,
        previous: previous.packages,
        updated: updated.packages,
        previousId: (relation: any) => Number(relation.packageId),
        updatedId: (relation: any) => Number(relation.packageId),
      },
    ];

    for (const group of relationGroups) {
      const previousById = new Map(
        group.previous.map((relation: any) => [
          group.previousId(relation),
          relation,
        ] as const)
      );
      const updatedById = new Map(
        group.updated.map((relation: any) => [
          group.updatedId(relation),
          relation,
        ] as const)
      );

      for (const [productId, relation] of updatedById) {
        if (!previousById.has(productId)) {
          await this.recordRelationLinked({
            actor,
            destinationId: id,
            destinationName: destination.name,
            productType: group.type,
            productId,
            relation,
          });
        }
      }

      for (const [productId, relation] of previousById) {
        if (!updatedById.has(productId)) {
          await this.recordRelationRemoved({
            actor,
            destinationId: id,
            destinationName: destination.name,
            productType: group.type,
            productId,
            relation,
          });
        }
      }
    }

    return updated;
  }

  async findProductDestinations(type: string, productId: number) {
    const productType = this.normalizeProductType(type);
    await this.assertProductExists(productType, productId);

    if (productType === "PROPERTY") {
      return this.prisma.destinationProperty.findMany({
        where: { propertyId: productId, destination: { isActive: true } },
        include: { destination: true },
        orderBy: this.relationOrderBy(),
      });
    }

    if (productType === "EXPERIENCE") {
      return this.prisma.destinationExperience.findMany({
        where: { experienceId: productId, destination: { isActive: true } },
        include: { destination: true },
        orderBy: this.relationOrderBy(),
      });
    }

    return this.prisma.destinationPackage.findMany({
      where: { packageId: productId, destination: { isActive: true } },
      include: { destination: true },
      orderBy: this.relationOrderBy(),
    });
  }

  async updateProductDestinations(
    type: string,
    productId: number,
    data: UpdateProductDestinationsDto,
    actor?: AuditActor
  ) {
    const productType = this.normalizeProductType(type);
    const destinationIds = [...new Set((data.destinationIds || []).map(Number))];

    await this.assertProductExists(productType, productId);

    const activeDestinations = await this.activeDestinationsByIds(destinationIds);
    if (activeDestinations.length !== destinationIds.length) {
      throw new BadRequestException("Uno o mas destinos no existen o no estan activos");
    }

    const previous = await this.findProductDestinations(productType, productId);
    const previousByDestination = new Map<
      number,
      { sortOrder: number; isFeatured: boolean }
    >(
      previous.map((relation: any) => [
        Number(relation.destinationId),
        {
          sortOrder: Number(relation.sortOrder || 0),
          isFeatured: Boolean(relation.isFeatured),
        },
      ] as const)
    );

    await this.prisma.$transaction(async (tx) => {
      if (productType === "PROPERTY") {
        await tx.destinationProperty.deleteMany({ where: { propertyId: productId } });
        if (destinationIds.length > 0) {
          await tx.destinationProperty.createMany({
            data: destinationIds.map((destinationId, index) => {
              const previousRelation = previousByDestination.get(destinationId);
              return {
                destinationId,
                propertyId: productId,
                sortOrder: previousRelation?.sortOrder ?? index,
                isFeatured: previousRelation?.isFeatured ?? false,
              };
            }),
          });
        }
        return;
      }

      if (productType === "EXPERIENCE") {
        await tx.destinationExperience.deleteMany({
          where: { experienceId: productId },
        });
        if (destinationIds.length > 0) {
          await tx.destinationExperience.createMany({
            data: destinationIds.map((destinationId, index) => {
              const previousRelation = previousByDestination.get(destinationId);
              return {
                destinationId,
                experienceId: productId,
                sortOrder: previousRelation?.sortOrder ?? index,
                isFeatured: previousRelation?.isFeatured ?? false,
              };
            }),
          });
        }
        return;
      }

      await tx.destinationPackage.deleteMany({ where: { packageId: productId } });
      if (destinationIds.length > 0) {
        await tx.destinationPackage.createMany({
          data: destinationIds.map((destinationId, index) => {
            const previousRelation = previousByDestination.get(destinationId);
            return {
              destinationId,
              packageId: productId,
              sortOrder: previousRelation?.sortOrder ?? index,
              isFeatured: previousRelation?.isFeatured ?? false,
            };
          }),
        });
      }
    });

    const updated = await this.findProductDestinations(productType, productId);

    await this.audit.record({
      actor,
      action: "DESTINATION_RELATIONS_UPDATED",
      entityType: productType,
      entityId: productId,
      message: "Destinos relacionados del producto actualizados",
      previousValue: previous,
      newValue: updated,
      metadata: {
        destinationIds,
      },
    });

    const previousRelationsByDestination = new Map(
      previous.map((relation: any) => [
        Number(relation.destinationId),
        relation,
      ] as const)
    );
    const updatedRelationsByDestination = new Map(
      updated.map((relation: any) => [
        Number(relation.destinationId),
        relation,
      ] as const)
    );

    for (const [destinationId, relation] of updatedRelationsByDestination) {
      if (!previousRelationsByDestination.has(destinationId)) {
        await this.recordRelationLinked({
          actor,
          destinationId,
          destinationName: (relation as any).destination?.name,
          productType,
          productId,
          relation,
        });
      }
    }

    for (const [destinationId, relation] of previousRelationsByDestination) {
      if (!updatedRelationsByDestination.has(destinationId)) {
        await this.recordRelationRemoved({
          actor,
          destinationId,
          destinationName: (relation as any).destination?.name,
          productType,
          productId,
          relation,
        });
      }
    }

    return updated;
  }

  async create(data: CreateDestinationDto, actor?: AuditActor) {
    const name = this.cleanText(data.name);

    if (!name) throw new BadRequestException("Nombre de destino requerido");

    const slugWasAutoGenerated = !String(data.slug || "").trim();
    const baseSlug = this.normalizeSlug({ name, slug: data.slug });
    const slug = await this.uniqueSlug(baseSlug);
    const faq = normalizeFaq(data.faq);
    const gallery = this.normalizeGallery(data.gallery);
    const heroImage =
      this.cleanText(data.heroImage) || this.primaryImageFromGallery(gallery);
    const translations = await this.translations.buildTranslationsForSave({
      source: {
        ...data,
        name,
        shortDescription: this.cleanText(data.shortDescription) || null,
        description: this.cleanText(data.description) || null,
        seoTitle: this.cleanText(data.seoTitle) || null,
        seoDescription: this.cleanText(data.seoDescription) || null,
        seoContent: this.cleanText(data.seoContent) || null,
        location: this.cleanText(data.location) || null,
        faq,
      },
      manualTranslations: data.translations,
    });
    const translationsMeta = this.translations.buildTranslationsMetaForSave({
      manualTranslations: data.translations,
    });

    const created = await this.prisma.destination.create({
      data: {
        name,
        slug,
        shortDescription: this.cleanText(data.shortDescription) || null,
        description: this.cleanText(data.description) || null,
        seoTitle: this.cleanText(data.seoTitle) || null,
        seoDescription: this.cleanText(data.seoDescription) || null,
        seoContent: this.cleanText(data.seoContent) || null,
        faq,
        heroImage,
        gallery: gallery.length ? (gallery as any) : undefined,
        location: this.cleanText(data.location) || null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        sortOrder: data.sortOrder ?? 0,
        translations,
        translationsMeta,
      },
    });

    await this.audit.record({
      actor,
      action: "DESTINATION_CREATED",
      entityType: "Destination",
      entityId: created.id,
      message: `Destino creado: ${created.name}`,
      newValue: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        isActive: created.isActive,
        isFeatured: created.isFeatured,
      },
    });

    await recordSlugAudit({
      audit: this.audit,
      actor,
      entityType: "Destination",
      entityId: created.id,
      operation: "create",
      baseSlug,
      finalSlug: created.slug,
      wasAutoGenerated: slugWasAutoGenerated,
      sourceField: "name",
    });

    this.translations.enqueueEntityTranslationInBackground({
      entityType: TranslationEntityType.DESTINATION,
      entityId: created.id,
      source: created as any,
      overwrite: false,
    });

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.DESTINATION,
      entityId: created.id,
      manualTranslations: data.translations,
    });

    return created;
  }

  async update(id: number, data: UpdateDestinationDto, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);
    const nextData: any = {};

    for (const key of [
      "name",
      "shortDescription",
      "description",
      "seoTitle",
      "seoDescription",
      "seoContent",
      "heroImage",
      "location",
    ] as const) {
      if (data[key] !== undefined) {
        nextData[key] = this.cleanText(data[key]) || null;
      }
    }

    let slugBase: string | undefined;
    let slugWasAutoGenerated = false;

    if (data.slug !== undefined || data.name !== undefined) {
      slugWasAutoGenerated = !String(data.slug || "").trim();
      slugBase = this.normalizeSlug({
        name: nextData.name || previous.name,
        slug: data.slug,
      });
      nextData.slug = await this.uniqueSlug(slugBase, id);
    }

    if (data.faq !== undefined) nextData.faq = normalizeFaq(data.faq);
    if (data.gallery !== undefined) {
      const gallery = this.normalizeGallery(data.gallery);
      nextData.gallery = gallery.length ? gallery : undefined;

      if (data.heroImage !== undefined && !nextData.heroImage) {
        nextData.heroImage = this.primaryImageFromGallery(gallery);
      }
    }
    if (data.isActive !== undefined) nextData.isActive = Boolean(data.isActive);
    if (data.isFeatured !== undefined) {
      nextData.isFeatured = Boolean(data.isFeatured);
    }
    if (data.sortOrder !== undefined) nextData.sortOrder = Number(data.sortOrder) || 0;

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

    const updated = await this.prisma.destination.update({
      where: { id },
      data: nextData,
    });

    await this.audit.record({
      actor,
      action:
        data.isActive !== undefined
          ? data.isActive
            ? "DESTINATION_ACTIVATED"
            : "DESTINATION_DEACTIVATED"
          : "DESTINATION_UPDATED",
      entityType: "Destination",
      entityId: updated.id,
      message: `Destino actualizado: ${updated.name}`,
      previousValue: {
        id: previous.id,
        name: previous.name,
        slug: previous.slug,
        isActive: previous.isActive,
        isFeatured: previous.isFeatured,
      },
      newValue: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
        isFeatured: updated.isFeatured,
      },
      metadata: { changedFields: Object.keys(nextData) },
    });

    if (nextData.slug !== undefined && slugBase) {
      await recordSlugAudit({
        audit: this.audit,
        actor,
        entityType: "Destination",
        entityId: updated.id,
        operation: "update",
        previousSlug: previous.slug,
        baseSlug: slugBase,
        finalSlug: updated.slug,
        wasAutoGenerated: slugWasAutoGenerated,
        sourceField: "name",
      });
    }

    if (changedTranslatableFields.length > 0) {
      this.translations.enqueueEntityTranslationInBackground({
        entityType: TranslationEntityType.DESTINATION,
        entityId: updated.id,
        source: updated as any,
        fields: changedTranslatableFields,
        overwrite: false,
      });
    }

    this.translations.recordManualOverrideInBackground({
      entityType: TranslationEntityType.DESTINATION,
      entityId: updated.id,
      manualTranslations: data.translations,
    });

    return updated;
  }

  async updateStatus(id: number, isActive: boolean, actor?: AuditActor) {
    return this.update(id, { isActive }, actor);
  }

  async remove(id: number, actor?: AuditActor) {
    const previous = await this.findOneAdmin(id);
    const updated = await this.prisma.destination.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.record({
      actor,
      action: "DESTINATION_DELETED",
      entityType: "Destination",
      entityId: updated.id,
      message: `Destino eliminado: ${updated.name}`,
      previousValue: {
        id: previous.id,
        name: previous.name,
        slug: previous.slug,
        isActive: previous.isActive,
        isFeatured: previous.isFeatured,
      },
      newValue: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
        isFeatured: updated.isFeatured,
      },
      metadata: { softDelete: true },
    });

    return updated;
  }
}
