import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AvailabilitySource,
  BookingStatus,
  BookingType,
  PreReservationStatus,
} from "@prisma/client";

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // ===============================
  // 🔥 CHECK AVAILABILITY (PRO)
  // ===============================
  async checkAvailability(dto: {
    type: BookingType;
    referenceId: number;
    checkIn: Date;
    checkOut: Date;
  }) {
    const { type, referenceId, checkIn, checkOut } = dto;

    // 🔴 1. BLOQUEO REAL (BOOKINGS PAGADOS)
    const confirmed = await this.prisma.booking.findFirst({
      where: {
        type,
        referenceId,
        status: BookingStatus.CONFIRMED,
        AND: [
          { checkIn: { lt: checkOut } },
          { checkOut: { gt: checkIn } },
        ],
      },
    });

    // 🔴 2. BLOQUEO EXTERNO (AIRBNB / STRIPE / ADMIN)
    const blocked = await this.prisma.availabilityBlock.findFirst({
      where: {
        type,
        referenceId,
        AND: [
          { startDate: { lt: checkOut } },
          { endDate: { gt: checkIn } },
        ],
      },
    });

    // 🟡 3. ALERTA (PRE-RESERVAS)
    const warnings = await this.prisma.preReservationItem.findMany({
      where: {
        type,
        referenceId,
        preReservation: {
          status: {
            in: [
              PreReservationStatus.PENDING_ADVISOR,
              PreReservationStatus.ASSIGNED,
              PreReservationStatus.VALIDATING,
              PreReservationStatus.AVAILABLE,
              PreReservationStatus.PAYMENT_PENDING,
            ],
          },
        },
        AND: [
          {
            preReservation: {
              checkIn: { lt: checkOut },
            },
          },
          {
            preReservation: {
              checkOut: { gt: checkIn },
            },
          },
        ],
      },
      include: {
        preReservation: true,
      },
    });

    return {
      available: !confirmed && !blocked,
      warning: warnings.length > 0,
      conflicts: {
        booking: !!confirmed,
        block: !!blocked,
      },
    };
  }

  // ===============================
  // 💰 CALCULAR PRECIO
  // ===============================
  async calculatePrice(dto: {
    checkIn: Date | string;
    checkOut: Date | string;
    pricePerNight?: number;
  }) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    const nights =
      (checkOut.getTime() - checkIn.getTime()) /
      (1000 * 60 * 60 * 24);

    if (nights <= 0) {
      throw new Error("Fechas inválidas");
    }

    const pricePerNight = dto.pricePerNight ?? 300;

    return {
      nights,
      pricePerNight,
      total: nights * pricePerNight,
    };
  }

  async findBlocksByProperty(propertyId: number) {
    return this.prisma.availabilityBlock.findMany({
      where: {
        type: BookingType.PROPERTY,
        referenceId: propertyId,
      },
      orderBy: {
        startDate: "asc",
      },
    });
  }

  async createBlock(data: {
    propertyId: number;
    startDate: string | Date;
    endDate: string | Date;
    source?: AvailabilitySource;
    notes?: string;
  }) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (!data.propertyId || endDate <= startDate) {
      throw new BadRequestException("Bloqueo de fechas invalido");
    }

    const property = await this.prisma.property.findUnique({
      where: {
        id: data.propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException("Propiedad no encontrada");
    }

    return this.prisma.availabilityBlock.create({
      data: {
        type: BookingType.PROPERTY,
        referenceId: data.propertyId,
        propertyId: data.propertyId,
        startDate,
        endDate,
        source: data.source ?? AvailabilitySource.ADMIN,
        notes: data.notes || null,
      },
    });
  }

  async removeBlock(id: number) {
    await this.prisma.availabilityBlock.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
    };
  }
}
