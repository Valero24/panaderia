import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type AdvisorPayload = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  isActive?: boolean;
};

const advisorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  deactivatedAt: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  _count: {
    select: {
      preReservationsAssigned: true,
      bookings: true,
    },
  },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  listAdvisors() {
    return this.prisma.user.findMany({
      where: {
        role: Role.ADVISOR,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: advisorSelect,
    });
  }

  async createAdvisor(data: AdvisorPayload, actor?: AuditActor) {
    if (!data.name?.trim()) {
      throw new BadRequestException("El nombre es requerido");
    }

    if (!data.email?.trim()) {
      throw new BadRequestException("El correo es requerido");
    }

    if (!data.password || data.password.length < 6) {
      throw new BadRequestException(
        "La contrasena temporal debe tener al menos 6 caracteres"
      );
    }

    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException("Ya existe un usuario con este correo");
    }

    const password = await bcrypt.hash(data.password, 10);

    const advisor = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password,
        phone: data.phone?.trim() || null,
        isActive: data.isActive ?? true,
        deactivatedAt: data.isActive === false ? new Date() : null,
        role: Role.ADVISOR,
      },
      select: advisorSelect,
    });

    await this.audit.record({
      actor,
      action: "ADVISOR_CREATED",
      entityType: "User",
      entityId: advisor.id,
      message: "Superadmin creo un asesor",
      newValue: {
        id: advisor.id,
        name: advisor.name,
        email: advisor.email,
        phone: advisor.phone,
        isActive: advisor.isActive,
        role: advisor.role,
      },
    });

    return advisor;
  }

  async updateAdvisor(id: number, data: AdvisorPayload, actor?: AuditActor) {
    const advisor = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!advisor || advisor.role !== Role.ADVISOR) {
      throw new NotFoundException("Asesor no encontrado");
    }

    if (advisor.deletedAt) {
      throw new NotFoundException("Asesor no encontrado");
    }

    const updates: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new BadRequestException("El nombre es requerido");
      }
      updates.name = data.name.trim();
    }

    if (data.email !== undefined) {
      if (!data.email.trim()) {
        throw new BadRequestException("El correo es requerido");
      }

      const email = data.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException("Ya existe un usuario con este correo");
      }

      updates.email = email;
    }

    if (data.phone !== undefined) {
      updates.phone = data.phone?.trim() || null;
    }

    if (data.password) {
      if (data.password.length < 6) {
        throw new BadRequestException(
          "La contrasena temporal debe tener al menos 6 caracteres"
        );
      }
      updates.password = await bcrypt.hash(data.password, 10);
    }

    if (data.isActive !== undefined) {
      updates.isActive = Boolean(data.isActive);
      updates.deactivatedAt = data.isActive ? null : new Date();
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updates,
      select: advisorSelect,
    });

    await this.audit.record({
      actor,
      action:
        data.isActive !== undefined
          ? data.isActive
            ? "ADVISOR_ACTIVATED"
            : "ADVISOR_DEACTIVATED"
          : "ADVISOR_UPDATED",
      entityType: "User",
      entityId: id,
      message:
        data.isActive !== undefined
          ? data.isActive
            ? "Superadmin activo un asesor"
            : "Superadmin desactivo un asesor"
          : "Superadmin actualizo un asesor",
      previousValue: {
        id: advisor.id,
        name: advisor.name,
        email: advisor.email,
        phone: advisor.phone,
        isActive: advisor.isActive,
        role: advisor.role,
      },
      newValue: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        isActive: updated.isActive,
        role: updated.role,
      },
    });

    return updated;
  }

  async setAdvisorStatus(id: number, isActive: boolean, actor?: AuditActor) {
    return this.updateAdvisor(id, { isActive }, actor);
  }

  async removeAdvisor(id: number, actor: AuditActor) {
    if (id === actor.userId) {
      throw new BadRequestException("No puedes eliminar tu propio usuario");
    }

    const advisor = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        deletedAt: true,
        _count: {
          select: {
            preReservationsAssigned: true,
            bookings: true,
          },
        },
      },
    });

    if (!advisor || advisor.role !== Role.ADVISOR) {
      throw new NotFoundException("Asesor no encontrado");
    }

    if (advisor.deletedAt) {
      return this.prisma.user.findUnique({
        where: { id },
        select: advisorSelect,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deletedAt: new Date(),
        deletedById: actor.userId,
      },
      select: advisorSelect,
    });

    await this.audit.record({
      actor,
      action: "ADVISOR_ARCHIVED",
      entityType: "User",
      entityId: updated.id,
      message: "Superadmin archivo un asesor",
      previousValue: {
        id: advisor.id,
        isActive: true,
        role: advisor.role,
      },
      newValue: {
        id: updated.id,
        isActive: updated.isActive,
        deletedAt: updated.deletedAt,
      },
    });

    return updated;
  }
}
