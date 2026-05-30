import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AvailabilityService } from "../availability/availability.service";

import {
  CreateBookingDto,
  BookingType,
} from "./dto/create-booking.dto";

import { BookingStatus, PreReservationStatus } from "@prisma/client";

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService
  ) {}

  async create(dto: CreateBookingDto, userId: number) {
    const { type, referenceId, checkIn, checkOut, guests } = dto;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // 🔥 VALIDAR FECHAS
    if (end <= start) {
      throw new BadRequestException("Fechas inválidas");
    }

    let item: any;
    let pricePerNight = 0;

    // ===============================
    // 🔥 RESOLVER ENTIDAD
    // ===============================
    if (type === BookingType.PROPERTY) {
      item = await this.prisma.property.findUnique({
        where: { id: referenceId },
      });

      if (!item) throw new NotFoundException("Propiedad no encontrada");

      if (guests > item.maxGuests) {
        throw new BadRequestException("Excede capacidad máxima");
      }

      const nights =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      if (nights < item.minimumNights) {
        throw new BadRequestException(
          `Mínimo ${item.minimumNights} noches`
        );
      }

      pricePerNight = item.pricePerNight;
    }

    // ===============================
    // 🔥 DISPONIBILIDAD
    // ===============================
    const availability =
      await this.availabilityService.checkAvailability({
        type,
        referenceId,
        checkIn: start,
        checkOut: end,
      });

    if (!availability.available) {
      throw new BadRequestException("No disponible");
    }

    // ===============================
    // 💰 PRECIO
    // ===============================
    const price = await this.availabilityService.calculatePrice({
      checkIn: start,
      checkOut: end,
      pricePerNight,
    });

    // ===============================
    // 🔥 CREAR BOOKING
    // ===============================
    return this.prisma.booking.create({
      data: {
        type,
        referenceId,
        userId,
        checkIn: start,
        checkOut: end,
        guests,
        totalPrice: price.total,
        status: BookingStatus.PENDING, // ✅ FIX
      },
    });
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateStatus(id: number, status: BookingStatus) {
    if (!Object.values(BookingStatus).includes(status)) {
      throw new BadRequestException("Estado de reserva invalido");
    }

    return this.prisma.booking.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        user: true,
      },
    });
  }

  async cancel(id: number, reason: string, superAdminId: number) {
    if (!reason?.trim()) {
      throw new BadRequestException("El motivo de cancelacion es requerido");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        preReservation: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }

    const cancelledAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilityBlock.deleteMany({
        where: {
          notes: `booking-${booking.id}`,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt,
          cancelledById: superAdminId,
        },
        include: {
          user: true,
        },
      });

      if (booking.preReservationId) {
        await tx.preReservation.update({
          where: { id: booking.preReservationId },
          data: {
            status: PreReservationStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt,
            cancelledById: superAdminId,
          },
        });
      }

      return updatedBooking;
    });
  }
}
