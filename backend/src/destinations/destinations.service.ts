import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PropertyStatus } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { normalizeFaq } from "../common/faq";
import { normalizeSeoSlug } from "../common/slug";
import { normalizeTranslations } from "../common/translations";
import { PrismaService } from "../prisma/prisma.service";
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

@Injectable()
export class DestinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private cleanText(value?: string | null) {
    return (value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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

  async findOnePublic(slug: string) {
    const item = await this.prisma.destination.findFirst({
      where: { slug: String(slug || "").trim(), isActive: true },
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

    return updated;
  }

  async create(data: CreateDestinationDto, actor?: AuditActor) {
    const name = this.cleanText(data.name);

    if (!name) throw new BadRequestException("Nombre de destino requerido");

    const slug = await this.uniqueSlug(
      this.normalizeSlug({ name, slug: data.slug })
    );

    const created = await this.prisma.destination.create({
      data: {
        name,
        slug,
        shortDescription: this.cleanText(data.shortDescription) || null,
        description: this.cleanText(data.description) || null,
        seoTitle: this.cleanText(data.seoTitle) || null,
        seoDescription: this.cleanText(data.seoDescription) || null,
        seoContent: this.cleanText(data.seoContent) || null,
        faq: normalizeFaq(data.faq),
        heroImage: this.cleanText(data.heroImage) || null,
        gallery: data.gallery || undefined,
        location: this.cleanText(data.location) || null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        sortOrder: data.sortOrder ?? 0,
        translations: normalizeTranslations(data.translations),
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

    if (data.slug !== undefined || data.name !== undefined) {
      nextData.slug = await this.uniqueSlug(
        this.normalizeSlug({
          name: nextData.name || previous.name,
          slug: data.slug,
        }),
        id
      );
    }

    if (data.faq !== undefined) nextData.faq = normalizeFaq(data.faq);
    if (data.gallery !== undefined) nextData.gallery = data.gallery || undefined;
    if (data.translations !== undefined) {
      nextData.translations = normalizeTranslations(data.translations);
    }
    if (data.isActive !== undefined) nextData.isActive = Boolean(data.isActive);
    if (data.isFeatured !== undefined) {
      nextData.isFeatured = Boolean(data.isFeatured);
    }
    if (data.sortOrder !== undefined) nextData.sortOrder = Number(data.sortOrder) || 0;

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

    return updated;
  }

  async updateStatus(id: number, isActive: boolean, actor?: AuditActor) {
    return this.update(id, { isActive }, actor);
  }

  async remove(id: number, actor?: AuditActor) {
    return this.update(id, { isActive: false }, actor);
  }
}
