import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingType,
  ProductFeatureAppliesTo,
  ProductFeatureCategory,
  PropertyStatus,
} from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { normalizeTranslations } from "../common/translations";
import { PrismaService } from "../prisma/prisma.service";
import {
  ProductFeatureActor,
  ProductFeatureAssignmentInput,
  ProductFeatureInput,
  ProductFeatureSetAssignmentsInput,
} from "./dto/product-feature.dto";

const appliesToValues = Object.values(ProductFeatureAppliesTo);
const categoryValues = Object.values(ProductFeatureCategory);
const productTypeValues = Object.values(BookingType);

@Injectable()
export class ProductFeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private cleanText(value?: string | null) {
    return (value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private slugify(value: string) {
    return this.cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private parseProductType(value?: string): BookingType {
    if (!value || !productTypeValues.includes(value as BookingType)) {
      throw new BadRequestException("Tipo de producto invalido");
    }

    return value as BookingType;
  }

  private parseAppliesTo(value?: string): ProductFeatureAppliesTo {
    if (!value || !appliesToValues.includes(value as ProductFeatureAppliesTo)) {
      throw new BadRequestException("Aplicabilidad invalida");
    }

    return value as ProductFeatureAppliesTo;
  }

  private parseCategory(value?: string): ProductFeatureCategory {
    if (!value) return ProductFeatureCategory.OTHER;

    if (!categoryValues.includes(value as ProductFeatureCategory)) {
      throw new BadRequestException("Categoria invalida");
    }

    return value as ProductFeatureCategory;
  }

  private assertFeatureMatchesProduct(
    appliesTo: ProductFeatureAppliesTo,
    productType: BookingType
  ) {
    if (appliesTo !== ProductFeatureAppliesTo.ALL && appliesTo !== productType) {
      throw new BadRequestException(
        `La caracteristica aplica a ${appliesTo} y no puede asignarse a ${productType}`
      );
    }
  }

  private async assertUniqueSlug(slug: string, id?: number) {
    const existing = await this.prisma.productFeature.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== id) {
      throw new BadRequestException("Slug de caracteristica ya existe");
    }
  }

  private async assertProductExists(productType: BookingType, productId: number) {
    if (!Number.isInteger(productId) || productId < 1) {
      throw new BadRequestException("Producto invalido");
    }

    if (productType === BookingType.PROPERTY) {
      const item = await this.prisma.property.findUnique({
        where: { id: productId },
      });

      if (!item) throw new NotFoundException("Alojamiento no encontrado");
      return item.title;
    }

    if (productType === BookingType.EXPERIENCE) {
      const item = await this.prisma.experience.findUnique({
        where: { id: productId },
      });

      if (!item) throw new NotFoundException("Experiencia no encontrada");
      return item.title;
    }

    const item = await this.prisma.package.findUnique({
      where: { id: productId },
    });

    if (!item) throw new NotFoundException("Paquete no encontrado");
    return item.title;
  }

  async findAllAdmin(appliesTo?: string) {
    const parsedAppliesTo = appliesTo
      ? this.parseAppliesTo(appliesTo)
      : undefined;

    return this.prisma.productFeature.findMany({
      where: parsedAppliesTo ? { appliesTo: parsedAppliesTo } : undefined,
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: [{ appliesTo: "asc" }, { category: "asc" }, { name: "asc" }],
    });
  }

  async findOneAdmin(id: number) {
    const feature = await this.prisma.productFeature.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!feature) {
      throw new NotFoundException("Caracteristica no encontrada");
    }

    return feature;
  }

  async create(data: ProductFeatureInput, actor?: ProductFeatureActor) {
    const name = this.cleanText(data.name);

    if (!name) {
      throw new BadRequestException("Nombre requerido");
    }

    const appliesTo = this.parseAppliesTo(data.appliesTo);
    const category = this.parseCategory(data.category);
    const slug = this.slugify(data.slug || name);

    if (!slug) {
      throw new BadRequestException("Slug invalido");
    }

    await this.assertUniqueSlug(slug);

    const created = await this.prisma.productFeature.create({
      data: {
        name,
        slug,
        description: this.cleanText(data.description) || null,
        translations: normalizeTranslations(data.translations),
        icon: this.cleanText(data.icon) || null,
        category,
        appliesTo,
        active: data.active ?? true,
      },
    });

    await this.audit.record({
      actor,
      action: "PRODUCT_FEATURE_CREATED",
      entityType: "ProductFeature",
      entityId: created.id,
      message: `Caracteristica creada: ${created.name}`,
      newValue: created,
    });

    return created;
  }

  async update(
    id: number,
    data: ProductFeatureInput,
    actor?: ProductFeatureActor
  ) {
    const previous = await this.findOneAdmin(id);
    const nextData: any = {};

    if (data.name !== undefined) {
      const name = this.cleanText(data.name);
      if (!name) throw new BadRequestException("Nombre requerido");
      nextData.name = name;
    }

    if (data.slug !== undefined || data.name !== undefined) {
      const slug = this.slugify(data.slug || nextData.name || previous.name);
      if (!slug) throw new BadRequestException("Slug invalido");
      await this.assertUniqueSlug(slug, id);
      nextData.slug = slug;
    }

    if (data.description !== undefined) {
      nextData.description = this.cleanText(data.description) || null;
    }

    if (data.translations !== undefined) {
      nextData.translations = normalizeTranslations(data.translations);
    }

    if (data.icon !== undefined) {
      nextData.icon = this.cleanText(data.icon) || null;
    }

    if (data.category !== undefined) {
      nextData.category = this.parseCategory(data.category);
    }

    if (data.appliesTo !== undefined) {
      const appliesTo = this.parseAppliesTo(data.appliesTo);
      const assignments = await this.prisma.productFeatureAssignment.findMany({
        where: { featureId: id },
      });

      for (const assignment of assignments) {
        this.assertFeatureMatchesProduct(appliesTo, assignment.productType);
      }

      nextData.appliesTo = appliesTo;
    }

    if (data.active !== undefined) {
      nextData.active = Boolean(data.active);
    }

    const updated = await this.prisma.productFeature.update({
      where: { id },
      data: nextData,
    });

    await this.audit.record({
      actor,
      action:
        data.active !== undefined
          ? data.active
            ? "PRODUCT_FEATURE_ACTIVATED"
            : "PRODUCT_FEATURE_DEACTIVATED"
          : "PRODUCT_FEATURE_UPDATED",
      entityType: "ProductFeature",
      entityId: updated.id,
      message:
        data.active !== undefined && !data.active
          ? `Caracteristica desactivada: ${updated.name}`
          : `Caracteristica actualizada: ${updated.name}`,
      previousValue: previous,
      newValue: updated,
      metadata: { changedFields: Object.keys(nextData) },
    });

    return updated;
  }

  async setStatus(id: number, active: boolean, actor?: ProductFeatureActor) {
    return this.update(id, { active }, actor);
  }

  async remove(id: number, actor?: ProductFeatureActor) {
    return this.update(id, { active: false }, actor);
  }

  async findAssignments(productTypeParam?: string, productIdParam?: string) {
    const productType = this.parseProductType(productTypeParam);
    const productId = Number(productIdParam);

    if (!Number.isInteger(productId) || productId < 1) {
      throw new BadRequestException("Producto invalido");
    }

    return this.prisma.productFeatureAssignment.findMany({
      where: { productType, productId },
      include: { feature: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async assign(
    data: ProductFeatureAssignmentInput,
    actor?: ProductFeatureActor
  ) {
    const featureId = Number(data.featureId);
    const productType = this.parseProductType(data.productType);
    const productId = Number(data.productId);

    if (!Number.isInteger(featureId) || featureId < 1) {
      throw new BadRequestException("Caracteristica invalida");
    }

    const feature = await this.prisma.productFeature.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      throw new NotFoundException("Caracteristica no encontrada");
    }

    this.assertFeatureMatchesProduct(feature.appliesTo, productType);
    const productName = await this.assertProductExists(productType, productId);

    const assignment = await this.prisma.productFeatureAssignment.upsert({
      where: {
        featureId_productType_productId: {
          featureId,
          productType,
          productId,
        },
      },
      update: {},
      create: {
        featureId,
        productType,
        productId,
      },
      include: { feature: true },
    });

    await this.audit.record({
      actor,
      action: "PRODUCT_FEATURE_ASSIGNED",
      entityType: "ProductFeatureAssignment",
      entityId: assignment.id,
      message: `Caracteristica asignada a ${this.productTypeLabel(productType)}: ${feature.name}`,
      newValue: {
        featureId,
        featureName: feature.name,
        productType,
        productId,
        productName,
      },
    });

    return assignment;
  }

  async unassign(
    data: ProductFeatureAssignmentInput,
    actor?: ProductFeatureActor
  ) {
    const featureId = Number(data.featureId);
    const productType = this.parseProductType(data.productType);
    const productId = Number(data.productId);

    const assignment = await this.prisma.productFeatureAssignment.findUnique({
      where: {
        featureId_productType_productId: {
          featureId,
          productType,
          productId,
        },
      },
      include: { feature: true },
    });

    if (!assignment) {
      throw new NotFoundException("Asignacion no encontrada");
    }

    const deleted = await this.prisma.productFeatureAssignment.delete({
      where: { id: assignment.id },
    });

    await this.audit.record({
      actor,
      action: "PRODUCT_FEATURE_UNASSIGNED",
      entityType: "ProductFeatureAssignment",
      entityId: deleted.id,
      message: `Caracteristica desasignada: ${assignment.feature.name}`,
      previousValue: assignment,
    });

    return deleted;
  }

  async setAssignments(
    data: ProductFeatureSetAssignmentsInput,
    actor?: ProductFeatureActor
  ) {
    const productType = this.parseProductType(data.productType);
    const productId = Number(data.productId);
    const featureIds = [...new Set((data.featureIds || []).map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0
    );

    await this.assertProductExists(productType, productId);

    const features = await this.prisma.productFeature.findMany({
      where: { id: { in: featureIds } },
    });

    if (features.length !== featureIds.length) {
      throw new BadRequestException("Una o mas caracteristicas no existen");
    }

    for (const feature of features) {
      this.assertFeatureMatchesProduct(feature.appliesTo, productType);
    }

    const previous = await this.prisma.productFeatureAssignment.findMany({
      where: { productType, productId },
      include: { feature: true },
    });
    const previousIds = new Set(previous.map((item) => item.featureId));
    const nextIds = new Set(featureIds);
    const toDelete = previous.filter((item) => !nextIds.has(item.featureId));
    const toCreate = features.filter((feature) => !previousIds.has(feature.id));

    await this.prisma.$transaction([
      ...toDelete.map((item) =>
        this.prisma.productFeatureAssignment.delete({ where: { id: item.id } })
      ),
      ...toCreate.map((feature) =>
        this.prisma.productFeatureAssignment.create({
          data: { featureId: feature.id, productType, productId },
        })
      ),
    ]);

    for (const feature of toCreate) {
      await this.audit.record({
        actor,
        action: "PRODUCT_FEATURE_ASSIGNED",
        entityType: "ProductFeatureAssignment",
        entityId: `${productType}:${productId}:${feature.id}`,
        message: `Caracteristica asignada a ${this.productTypeLabel(productType)}: ${feature.name}`,
        newValue: { featureId: feature.id, productType, productId },
      });
    }

    for (const item of toDelete) {
      await this.audit.record({
        actor,
        action: "PRODUCT_FEATURE_UNASSIGNED",
        entityType: "ProductFeatureAssignment",
        entityId: item.id,
        message: `Caracteristica desasignada: ${item.feature.name}`,
        previousValue: item,
      });
    }

    return this.findAssignments(productType, String(productId));
  }

  async getPublicFilters(productTypeParam?: string) {
    const productType = this.parseProductType(productTypeParam);
    const activeProductIds = await this.getActiveProductIds(productType);

    if (activeProductIds.length === 0) {
      return [];
    }

    const assignments = await this.prisma.productFeatureAssignment.findMany({
      where: {
        productType,
        productId: { in: activeProductIds },
        feature: {
          active: true,
          OR: [
            { appliesTo: productType as unknown as ProductFeatureAppliesTo },
            { appliesTo: ProductFeatureAppliesTo.ALL },
          ],
        },
      },
      include: { feature: true },
    });

    const counts = new Map<number, number>();

    for (const assignment of assignments) {
      counts.set(assignment.featureId, (counts.get(assignment.featureId) || 0) + 1);
    }

    const featuresById = new Map(
      assignments.map((assignment) => [assignment.featureId, assignment.feature])
    );

    return [...counts.entries()]
      .map(([featureId, count]) => {
        const feature = featuresById.get(featureId)!;

        return {
          id: feature.id,
          name: feature.name,
          slug: feature.slug,
          description: feature.description,
          translations: feature.translations,
          icon: feature.icon,
          category: feature.category,
          appliesTo: feature.appliesTo,
          count,
        };
      })
      .sort((a, b) =>
        a.category === b.category
          ? a.name.localeCompare(b.name)
          : a.category.localeCompare(b.category)
      );
  }

  async productIdsMatchingFeatures(
    productType: BookingType,
    featuresParam?: string | string[]
  ) {
    const slugs = this.parseFeatureSlugs(featuresParam);

    if (slugs.length === 0) {
      return undefined;
    }

    const assignments = await this.prisma.productFeatureAssignment.findMany({
      where: {
        productType,
        feature: {
          active: true,
          slug: { in: slugs },
          OR: [
            { appliesTo: productType as unknown as ProductFeatureAppliesTo },
            { appliesTo: ProductFeatureAppliesTo.ALL },
          ],
        },
      },
      select: {
        productId: true,
        feature: { select: { slug: true } },
      },
    });

    const byProduct = new Map<number, Set<string>>();

    for (const assignment of assignments) {
      if (!byProduct.has(assignment.productId)) {
        byProduct.set(assignment.productId, new Set());
      }

      byProduct.get(assignment.productId)!.add(assignment.feature.slug);
    }

    return [...byProduct.entries()]
      .filter(([, featureSlugs]) => slugs.every((slug) => featureSlugs.has(slug)))
      .map(([productId]) => productId);
  }

  async getAssignedPublicFeatures(
    productType: BookingType,
    productIds: number[]
  ) {
    const ids = [...new Set(productIds)]
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) {
      return new Map<number, any[]>();
    }

    const assignments = await this.prisma.productFeatureAssignment.findMany({
      where: {
        productType,
        productId: { in: ids },
        feature: {
          active: true,
          OR: [
            { appliesTo: productType as unknown as ProductFeatureAppliesTo },
            { appliesTo: ProductFeatureAppliesTo.ALL },
          ],
        },
      },
      include: { feature: true },
      orderBy: { createdAt: "asc" },
    });

    const byProductId = new Map<number, any[]>();

    for (const assignment of assignments) {
      if (!byProductId.has(assignment.productId)) {
        byProductId.set(assignment.productId, []);
      }

      byProductId.get(assignment.productId)!.push({
        id: assignment.feature.id,
        name: assignment.feature.name,
        slug: assignment.feature.slug,
        description: assignment.feature.description,
        translations: assignment.feature.translations,
        icon: assignment.feature.icon,
        category: assignment.feature.category,
        appliesTo: assignment.feature.appliesTo,
      });
    }

    for (const features of byProductId.values()) {
      features.sort((a, b) =>
        a.category === b.category
          ? a.name.localeCompare(b.name)
          : a.category.localeCompare(b.category)
      );
    }

    return byProductId;
  }

  private parseFeatureSlugs(featuresParam?: string | string[]) {
    const raw = Array.isArray(featuresParam)
      ? featuresParam.join(",")
      : featuresParam || "";

    return [
      ...new Set(
        raw
          .split(",")
          .map((slug) => this.slugify(slug))
          .filter(Boolean)
      ),
    ];
  }

  private async getActiveProductIds(productType: BookingType) {
    if (productType === BookingType.PROPERTY) {
      const items = await this.prisma.property.findMany({
        where: {
          status: { in: [PropertyStatus.ACTIVE, PropertyStatus.FEATURED] },
        },
        select: { id: true },
      });

      return items.map((item) => item.id);
    }

    if (productType === BookingType.EXPERIENCE) {
      const items = await this.prisma.experience.findMany({
        where: { active: true },
        select: { id: true },
      });

      return items.map((item) => item.id);
    }

    const items = await this.prisma.package.findMany({
      where: { active: true },
      select: { id: true },
    });

    return items.map((item) => item.id);
  }

  private productTypeLabel(productType: BookingType) {
    if (productType === BookingType.PROPERTY) return "alojamiento";
    if (productType === BookingType.EXPERIENCE) return "experiencia";
    return "paquete";
  }
}
