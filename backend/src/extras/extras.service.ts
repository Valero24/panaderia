import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type ExtraServiceInput = {
  name: string;
  description?: string;
  price: number;
  propertyId?: number | null;
  experienceId?: number | null;
  packageId?: number | null;
  active?: boolean;
};

@Injectable()
export class ExtrasService {
  constructor(
    private readonly prisma: PrismaService
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

  async create(data: ExtraServiceInput) {
    if (!data.name?.trim()) {
      throw new BadRequestException("Nombre requerido");
    }

    const price = Number(data.price);

    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException("Precio invalido");
    }

    const target = await this.validateProductTarget(data);

    return this.prisma.extraService.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price,
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
    data: ExtraServiceInput
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

    if (data.price !== undefined) {
      const price = Number(data.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException("Precio invalido");
      }

      nextData.price = price;
    }

    if (data.active !== undefined) {
      nextData.active = Boolean(data.active);
    }

    if (target) {
      nextData.propertyId = target.propertyId;
      nextData.experienceId = target.experienceId;
      nextData.packageId = target.packageId;
    }

    return this.prisma.extraService.update({
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
  }

  remove(id: number) {
    return this.prisma.extraService.delete({
      where: {
        id,
      },
    });
  }
}
