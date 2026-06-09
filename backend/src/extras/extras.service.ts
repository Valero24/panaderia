import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";
import { normalizeTranslations } from "../common/translations";
import { TranslationEntityType } from "@prisma/client";
import { TranslationsService } from "../translations/translations.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type ExtraServiceInput = {
  name: string;
  description?: string;
  translations?: Record<string, Record<string, string>>;
  price?: number;
  priceCop?: number;
  baseCurrency?: string;
  propertyId?: number | null;
  experienceId?: number | null;
  packageId?: number | null;
  active?: boolean;
};

@Injectable()
export class ExtrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly translations: TranslationsService
  ) {}

  private async validateProductTarget(data: ExtraServiceInput) {
    const propertyId = data.propertyId ? Number(data.propertyId) : null;
    const experienceId = data.experienceId ? Number(data.experienceId) : null;
    const packageId = data.packageId ? Number(data.packageId) : null;
    const targetCount = [propertyId, experienceId, packageId].filter(Boolean)
      .length;

    if (targetCount > 1) {
      throw new BadRequestException(
        "El servicio premium debe pertenecer a un solo producto"
      );
    }

    if (targetCount === 0) {
      throw new BadRequestException(
        "Debe indicar propertyId, experienceId o packageId"
      );
    }

    if (propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new NotFoundException("Propiedad no encontrada");
      }
    }

    if (experienceId) {
      const experience = await this.prisma.experience.findUnique({
        where: { id: experienceId },
      });

      if (!experience) {
        throw new NotFoundException("Experiencia no encontrada");
      }
    }

    if (packageId) {
      const packageItem = await this.prisma.package.findUnique({
        where: { id: packageId },
      });

      if (!packageItem) {
        throw new NotFoundException("Paquete no encontrado");
      }
    }

    return { propertyId, experienceId, packageId };
  }

  async create(data: ExtraServiceInput, actor?: AuditActor) {
    if (!data.name?.trim()) {
      throw new BadRequestException("Nombre requerido");
    }

    const price = Number(data.priceCop ?? data.price);

    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException("Precio invalido");
    }

    const target = await this.validateProductTarget(data);

    const created = await this.prisma.extraService.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        translations: normalizeTranslations(data.translations),
        price,
        priceCop: price,
        baseCurrency: "COP",
        active: data.active ?? true,
        propertyId: target.propertyId,
        experienceId: target.experienceId,
        packageId: target.packageId,
      },
      include: {
        property: true,
        experience: true,
        package: true,
      },
    });

    await this.audit.record({
      actor,
      action: "EXTRA_SERVICE_CREATED",
      entityType: "ExtraService",
      entityId: created.id,
      message: "Superadmin creo un servicio premium",
      newValue: {
        id: created.id,
        name: created.name,
        price: created.price,
        active: created.active,
        propertyId: created.propertyId,
        experienceId: created.experienceId,
        packageId: created.packageId,
      },
    });

    await this.translations.enqueueEntityTranslation({
      entityType: TranslationEntityType.EXTRA_SERVICE,
      entityId: created.id,
      source: created as any,
      overwrite: false,
    });

    return created;
  }

  findAll() {
    return this.prisma.extraService.findMany({
      include: {
        property: true,
        experience: true,
        package: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findByProperty(propertyId: number) {
    return this.prisma.extraService.findMany({
      where: {
        propertyId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findByExperience(experienceId: number) {
    return this.prisma.extraService.findMany({
      where: {
        experienceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findByPackage(packageId: number) {
    return this.prisma.extraService.findMany({
      where: {
        packageId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findOne(id: number) {
    return this.prisma.extraService.findUnique({
      where: {
        id,
      },
      include: {
        property: true,
        experience: true,
        package: true,
      },
    });
  }

  async update(
    id: number,
    data: ExtraServiceInput,
    actor?: AuditActor
  ) {
    const existing = await this.prisma.extraService.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Servicio premium no encontrado");
    }

    const target =
      data.propertyId !== undefined ||
      data.experienceId !== undefined ||
      data.packageId !== undefined
        ? await this.validateProductTarget({
            ...data,
            propertyId: data.propertyId ?? null,
            experienceId: data.experienceId ?? null,
            packageId: data.packageId ?? null,
          })
        : undefined;

    const nextData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new BadRequestException("Nombre requerido");
      }

      nextData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      nextData.description = data.description?.trim() || null;
    }

    if (data.translations !== undefined) {
      nextData.translations = normalizeTranslations(data.translations);
    }

    if (data.price !== undefined || data.priceCop !== undefined) {
      const price = Number(data.priceCop ?? data.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException("Precio invalido");
      }

      nextData.price = price;
      nextData.priceCop = price;
      nextData.baseCurrency = "COP";
    }

    if (data.active !== undefined) {
      nextData.active = Boolean(data.active);
    }

    if (target) {
      nextData.propertyId = target.propertyId;
      nextData.experienceId = target.experienceId;
      nextData.packageId = target.packageId;
    }

    const updated = await this.prisma.extraService.update({
      where: {
        id,
      },
      data: nextData,
      include: {
        property: true,
        experience: true,
        package: true,
      },
    });

    await this.audit.record({
      actor,
      action:
        data.active !== undefined
          ? data.active
            ? "EXTRA_SERVICE_ACTIVATED"
            : "EXTRA_SERVICE_DEACTIVATED"
          : "EXTRA_SERVICE_UPDATED",
      entityType: "ExtraService",
      entityId: updated.id,
      message: "Superadmin actualizo un servicio premium",
      previousValue: existing,
      newValue: {
        id: updated.id,
        name: updated.name,
        price: updated.price,
        active: updated.active,
        propertyId: updated.propertyId,
        experienceId: updated.experienceId,
        packageId: updated.packageId,
      },
      metadata: {
        changedFields: Object.keys(nextData),
      },
    });

    const changedTranslatableFields = Object.keys(nextData).filter((field) =>
      this.translations.getDefaultFields().includes(field)
    );

    if (changedTranslatableFields.length > 0) {
      await this.translations.enqueueEntityTranslation({
        entityType: TranslationEntityType.EXTRA_SERVICE,
        entityId: updated.id,
        source: updated as any,
        fields: changedTranslatableFields,
        overwrite: false,
      });
    }

    return updated;
  }

  async remove(id: number, actor?: AuditActor) {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException("Servicio premium no encontrado");
    }

    const deleted = await this.prisma.extraService.delete({
      where: {
        id,
      },
    });

    await this.audit.record({
      actor,
      action: "EXTRA_SERVICE_DELETED",
      entityType: "ExtraService",
      entityId: deleted.id,
      message: "Superadmin elimino un servicio premium",
      previousValue: {
        id: existing.id,
        name: existing.name,
        price: existing.price,
        active: existing.active,
        propertyId: existing.propertyId,
        experienceId: existing.experienceId,
        packageId: existing.packageId,
      },
    });

    return deleted;
  }
}
