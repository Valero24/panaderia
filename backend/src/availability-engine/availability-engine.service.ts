import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async cleanExpiredBlocks() {
    await this.prisma.availabilityBlock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async checkAvailability({
    type,
    referenceId,
    checkIn,
    checkOut,
  }: {
    type: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
    referenceId: number;
    checkIn?: Date;
    checkOut?: Date;
  }) {
    await this.cleanExpiredBlocks();

    if (type === "PROPERTY") {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      const conflict = await this.prisma.booking.findFirst({
        where: {
          type: "PROPERTY",
          referenceId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });

      if (conflict) {
        return {
          available: false,
          reason: "BOOKING_CONFLICT",
        };
      }

      const block = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: "PROPERTY",
          referenceId,
          AND: [
            { startDate: { lt: checkOut } },
            { endDate: { gt: checkIn } },
          ],
        },
      });

      if (block) {
        return {
          available: false,
          reason: "BLOCKED_DATES",
        };
      }

      return { available: true };
    }

    if (type === "EXPERIENCE") {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      const experience = await this.prisma.experience.findFirst({
        where: {
          id: referenceId,
          active: true,
        },
      });

      if (!experience) {
        throw new BadRequestException("Experiencia no encontrada");
      }

      const bookingConflict = await this.prisma.booking.findFirst({
        where: {
          type: "EXPERIENCE",
          referenceId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });

      if (bookingConflict) {
        return {
          available: false,
          reason: "BOOKING_CONFLICT",
        };
      }

      const block = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: "EXPERIENCE",
          referenceId,
          AND: [
            { startDate: { lt: checkOut } },
            { endDate: { gt: checkIn } },
          ],
        },
      });

      if (block) {
        return {
          available: false,
          reason: "BLOCKED_DATES",
        };
      }

      return {
        available: true,
        capacity: experience.maxGuests,
      };
    }

    if (type === "PACKAGE") {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      const packageItem = await this.prisma.package.findFirst({
        where: {
          id: referenceId,
          active: true,
        },
      });

      if (!packageItem) {
        throw new BadRequestException("Paquete no encontrado");
      }

      const bookingConflict = await this.prisma.booking.findFirst({
        where: {
          type: "PACKAGE",
          referenceId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });

      if (bookingConflict) {
        return {
          available: false,
          reason: "BOOKING_CONFLICT",
        };
      }

      const block = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: "PACKAGE",
          referenceId,
          AND: [
            { startDate: { lt: checkOut } },
            { endDate: { gt: checkIn } },
          ],
        },
      });

      if (block) {
        return {
          available: false,
          reason: "BLOCKED_DATES",
        };
      }

      return {
        available: true,
        capacity: packageItem.maxGuests,
      };
    }

    return { available: true };
  }

  async calculatePrice({
    type,
    item,
    checkIn,
    checkOut,
    guests,
  }: any) {
    let total = 0;

    if (type === "PROPERTY") {
      const nights =
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24);

      total = nights * (item.pricePerNight || 300);
    }

    if (type === "EXPERIENCE") {
      total = Number(item.basePrice || 0) * guests;
    }

    if (type === "PACKAGE") {
      total = item.basePrice || 500;
    }

    return { total };
  }
}
