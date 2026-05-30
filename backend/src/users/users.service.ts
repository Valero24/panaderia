import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

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
  constructor(private readonly prisma: PrismaService) {}

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

  async createAdvisor(data: AdvisorPayload) {
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

    return this.prisma.user.create({
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
  }

  async updateAdvisor(id: number, data: AdvisorPayload) {
    const advisor = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, deletedAt: true },
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

    return this.prisma.user.update({
      where: { id },
      data: updates,
      select: advisorSelect,
    });
  }

  async setAdvisorStatus(id: number, isActive: boolean) {
    return this.updateAdvisor(id, { isActive });
  }

  async removeAdvisor(id: number, actorId: number) {
    if (id === actorId) {
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

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deletedAt: new Date(),
        deletedById: actorId,
      },
      select: advisorSelect,
    });
  }
}
