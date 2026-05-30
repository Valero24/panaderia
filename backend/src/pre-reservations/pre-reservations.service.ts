import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AvailabilityService } from "../availability-engine/availability-engine.service";
import { CalendarService } from "../calendar/calendar.service";
import { AuditService } from "../common/audit.service";
import { InvoiceService } from "../invoice/invoice.service";
import { NotificationsService } from "../notifications/notifications.service";

import {
  BookingType,
  AvailabilitySource,
  Booking,
  BookingStatus,
  PreReservationStatus,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";

type ReservationActor = {
  userId: number;
  role: string;
};

type SelectedExtraInput = {
  id: number;
  quantity?: number;
};

type AssistedQuoteUpdateInput = {
  type?: BookingType;
  referenceId?: number;
  propertyId?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  adults?: number;
  children?: number;
  infants?: number;
  selectedExtras?: SelectedExtraInput[];
  discountAmount?: number;
  taxesAmount?: number;
  manualAdjustmentAmount?: number;
  advisorNotes?: string;
  internalNotes?: string;
};

@Injectable()
export class PreReservationsService {
  private readonly logger = new Logger(PreReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private calendarService: CalendarService,
    private audit: AuditService,
    private invoiceService: InvoiceService,
    private notificationsService: NotificationsService
  ) { }

  private isSuperAdmin(actor: ReservationActor) {
    return actor.role === "SUPERADMIN";
  }

  private isRealAvailabilityEnabled() {
    return process.env.ENABLE_REAL_AVAILABILITY === "true";
  }

  private async getManagedReservation(
    id: string,
    actor: ReservationActor
  ) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: { items: true, assignedTo: true },
    });

    if (!pre) {
      throw new NotFoundException("Pre-reserva no encontrada");
    }

    if (this.isSuperAdmin(actor)) {
      return pre;
    }

    if (
      actor.role === "ADVISOR" &&
      pre.assignedToId === actor.userId
    ) {
      return pre;
    }

    throw new ForbiddenException(
      "Solo el asesor asignado o el superadmin pueden modificar esta reserva"
    );
  }

  private assertTransition(
    current: PreReservationStatus,
    allowed: PreReservationStatus[],
    target: PreReservationStatus
  ) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `No se puede pasar de ${current} a ${target}`
      );
    }
  }

  private logTransitionAttempt(
    id: string,
    actor: ReservationActor,
    current: PreReservationStatus,
    target: PreReservationStatus
  ) {
    this.logger.log(
      `Transition ${id}: ${current} -> ${target} by ${actor.role}:${actor.userId}`
    );
  }

  private toMoney(value: unknown, fallback = 0) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.round(parsed * 100) / 100;
  }

  private getNights(checkIn: Date, checkOut: Date) {
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  private getExtrasSnapshot(extras: any) {
    return Array.isArray(extras) ? extras : [];
  }

  private async ensureCustomerUser(pre: {
    id: string;
    email: string;
    customerName: string;
  }) {
    const password = await bcrypt.hash(
      `manual-${pre.id}-${pre.email}`,
      10
    );

    return this.prisma.user.upsert({
      where: { email: pre.email },
      update: {},
      create: {
        name: pre.customerName,
        email: pre.email,
        password,
        role: Role.USER,
      },
    });
  }

  private async createReservationCode(tx: any) {
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = await tx.booking.count({
        where: {
          reservationCode: {
            startsWith: `RES-${year}-`,
          },
        },
      });
      const code = `RES-${year}-${String(count + attempt + 1).padStart(6, "0")}`;
      const existing = await tx.booking.findUnique({
        where: { reservationCode: code },
      });

      if (!existing) {
        return code;
      }
    }

    return `RES-${year}-${Date.now().toString().slice(-6)}`;
  }

  private async ensureManualInvoice(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        preReservation: {
          include: {
            assignedTo: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking no encontrado");
    }

    if (booking.invoicePath) {
      return booking.invoicePath;
    }

    const companySettings =
      await this.prisma.companySettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          companyName: "Cartagena Tailored Travel",
        },
      });

    const taxesAmount = this.toMoney(booking.taxesAmount);
    const discountAmount = this.toMoney(booking.discountAmount);
    const finalTotal = this.toMoney(booking.totalPrice);
    const subtotal = Math.max(finalTotal - taxesAmount + discountAmount, 0);

    const invoicePath =
      await this.invoiceService.generateBookingInvoice({
        bookingId: booking.id,
        preReservationId: booking.preReservationId || "",
        reservationCode: booking.reservationCode,
        companyName: companySettings.companyName,
        companyLegalId:
          companySettings.legalId ||
          companySettings.legalInfo ||
          undefined,
        companyAddress: companySettings.address,
        companyPhones: companySettings.phones,
        companyEmail: companySettings.email,
        companyLegalInfo: companySettings.legalInfo,
        companyPolicies: companySettings.policies,
        invoiceFooter: companySettings.invoiceFooter,
        customerName: booking.customerName || "Cliente",
        customerEmail: booking.customerEmail || "",
        customerPhone: booking.customerPhone,
        productName: booking.productName || `Producto #${booking.referenceId}`,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        extras: this.getExtrasSnapshot(booking.selectedExtras),
        subtotal,
        taxesAmount,
        discountAmount,
        total: finalTotal,
        currency: "COP",
        paymentMethod: booking.paymentMethod || "Manual concierge",
        advisorName:
          booking.advisorName ||
          booking.preReservation?.assignedTo?.name,
        advisorEmail: booking.preReservation?.assignedTo?.email,
        paymentStatus: "CONFIRMADA",
      });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { invoicePath },
    });

    return invoicePath;
  }

  async getInvoiceFile(id: string, actor: ReservationActor) {
    await this.getManagedReservation(id, actor);

    const booking = await this.prisma.booking.findUnique({
      where: { preReservationId: id },
    });

    if (!booking) {
      throw new NotFoundException("La reserva confirmada no existe");
    }

    const invoicePath = booking.invoicePath
      ? booking.invoicePath
      : await this.ensureManualInvoice(booking.id);
    const resolvedPath = path.resolve(invoicePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException("El PDF de la factura no existe");
    }

    return {
      path: resolvedPath,
      filename: `${booking.reservationCode || `booking-${booking.id}`}.pdf`,
    };
  }

  private async getConfirmedBookingForNotification(
    id: string,
    actor: ReservationActor
  ) {
    await this.getManagedReservation(id, actor);

    const booking = await this.prisma.booking.findUnique({
      where: { preReservationId: id },
    });

    if (!booking) {
      throw new NotFoundException("La reserva confirmada no existe");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        "Solo se puede notificar una reserva confirmada"
      );
    }

    if (!booking.invoicePath) {
      await this.ensureManualInvoice(booking.id);
    }

    return booking;
  }

  async sendManualBookingEmail(id: string, actor: ReservationActor) {
    const booking = await this.getConfirmedBookingForNotification(
      id,
      actor
    );

    const result =
      await this.notificationsService.sendManualBookingEmail(booking.id);
    const updated = await this.findOne(id, actor);

    await this.audit.record({
      actor,
      action: "MANUAL_BOOKING_EMAIL_NOTIFICATION",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        bookingId: booking.id,
        reservationCode: booking.reservationCode,
        result,
      },
    });

    return {
      ...result,
      booking: (updated as any).booking,
    };
  }

  async sendManualBookingWhatsapp(id: string, actor: ReservationActor) {
    const booking = await this.getConfirmedBookingForNotification(
      id,
      actor
    );

    const result =
      await this.notificationsService.sendManualBookingWhatsapp(booking.id);
    const updated = await this.findOne(id, actor);

    await this.audit.record({
      actor,
      action: "MANUAL_BOOKING_WHATSAPP_NOTIFICATION",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        bookingId: booking.id,
        reservationCode: booking.reservationCode,
        result,
      },
    });

    return {
      ...result,
      booking: (updated as any).booking,
    };
  }

  private resolveGuestCount(data: {
    guests?: number;
    adults?: number;
    children?: number;
    infants?: number;
    fallback?: number;
  }) {
    if (data.guests !== undefined) {
      return Number(data.guests);
    }

    const hasGuestBreakdown =
      data.adults !== undefined ||
      data.children !== undefined ||
      data.infants !== undefined;

    if (!hasGuestBreakdown) {
      return Number(data.fallback ?? 1);
    }

    return (
      Number(data.adults || 0) +
      Number(data.children || 0) +
      Number(data.infants || 0)
    );
  }

  private validateMoneyField(label: string, value: number) {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${label} invalido`);
    }
  }

  private async buildPropertyQuote(data: {
    referenceId: number;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    selectedExtras?: SelectedExtraInput[];
    taxesAmount?: number;
    discountAmount?: number;
    manualAdjustmentAmount?: number;
  }) {
    if (data.checkOut <= data.checkIn) {
      throw new BadRequestException("Fechas invalidas");
    }

    if (!data.guests || data.guests < 1) {
      throw new BadRequestException("Debe haber al menos 1 huesped");
    }

    const property = await this.prisma.property.findUnique({
      where: { id: data.referenceId },
      include: { extras: true },
    });

    if (!property) {
      throw new NotFoundException("Propiedad no encontrada");
    }

    const maxAllowedGuests = Math.min(
      property.maxGuests,
      property.maxCapacity
    );

    if (data.guests > maxAllowedGuests) {
      throw new BadRequestException("Excede la capacidad del alojamiento");
    }

    const nights = this.getNights(data.checkIn, data.checkOut);

    if (nights < property.minimumNights) {
      throw new BadRequestException(
        `Estadia minima: ${property.minimumNights} noches`
      );
    }

    const requestedExtras = Array.isArray(data.selectedExtras)
      ? data.selectedExtras
      : [];

    const selectedExtrasSnapshot = requestedExtras.map((requested) => {
      const extra = property.extras.find(
        (item) => item.id === Number(requested.id) && item.active
      );

      if (!extra) {
        throw new BadRequestException(
          `Servicio premium invalido: ${requested.id}`
        );
      }

      const quantity = Math.max(Number(requested.quantity || 1), 1);
      const unitPrice = this.toMoney(extra.price);

      return {
        id: extra.id,
        name: extra.name,
        description: extra.description,
        unitPrice,
        quantity,
        totalPrice: this.toMoney(unitPrice * quantity),
      };
    });

    const extrasTotal = selectedExtrasSnapshot.reduce(
      (acc, extra) => acc + Number(extra.totalPrice || 0),
      0
    );

    const stayTotal = this.toMoney(
      nights * Number(property.pricePerNight || 0)
    );
    const baseSubtotal = this.toMoney(
      stayTotal +
        Number(property.cleaningFee || 0) +
        Number(property.serviceFee || 0)
    );
    const subtotal = this.toMoney(baseSubtotal + extrasTotal);
    const taxesAmount =
      data.taxesAmount !== undefined
        ? this.toMoney(data.taxesAmount)
        : this.toMoney(property.taxes || 0);
    const discountAmount = this.toMoney(data.discountAmount || 0);
    const manualAdjustmentAmount = this.toMoney(
      data.manualAdjustmentAmount || 0
    );

    this.validateMoneyField("Impuestos", taxesAmount);
    this.validateMoneyField("Descuento", discountAmount);
    this.validateMoneyField("Ajuste manual", manualAdjustmentAmount);

    if (discountAmount < 0 || taxesAmount < 0) {
      throw new BadRequestException(
        "Descuentos e impuestos no pueden ser negativos"
      );
    }

    const finalTotal = this.toMoney(
      subtotal + taxesAmount - discountAmount + manualAdjustmentAmount
    );

    if (finalTotal < 0) {
      throw new BadRequestException("El total final no puede ser negativo");
    }

    return {
      property,
      nights,
      selectedExtrasSnapshot,
      baseSubtotal,
      subtotal,
      taxesAmount,
      discountAmount,
      manualAdjustmentAmount,
      finalTotal,
    };
  }

  private async buildExperienceQuote(data: {
    referenceId: number;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    selectedExtras?: SelectedExtraInput[];
    taxesAmount?: number;
    discountAmount?: number;
    manualAdjustmentAmount?: number;
  }) {
    if (data.checkOut <= data.checkIn) {
      throw new BadRequestException("Fechas invalidas");
    }

    if (!data.guests || data.guests < 1) {
      throw new BadRequestException("Debe haber al menos 1 huesped");
    }

    const experience = await this.prisma.experience.findFirst({
      where: {
        id: data.referenceId,
        active: true,
      },
    });

    if (!experience) {
      throw new NotFoundException("Experiencia no encontrada");
    }

    if (data.guests > experience.maxGuests) {
      throw new BadRequestException("Excede la capacidad de la experiencia");
    }

    const requestedExtras = Array.isArray(data.selectedExtras)
      ? data.selectedExtras
      : [];

    const experienceExtras =
      requestedExtras.length > 0
        ? await this.prisma.extraService.findMany({
            where: {
              experienceId: data.referenceId,
              active: true,
              id: {
                in: requestedExtras.map((item) => Number(item.id)),
              },
            },
          })
        : [];

    const selectedExtrasSnapshot = requestedExtras.map((requested) => {
      const extra = experienceExtras.find(
        (item) => item.id === Number(requested.id)
      );

      if (!extra) {
        throw new BadRequestException(
          `Servicio premium invalido: ${requested.id}`
        );
      }

      const quantity = Math.max(Number(requested.quantity || 1), 1);
      const unitPrice = this.toMoney(extra.price);

      return {
        id: extra.id,
        name: extra.name,
        description: extra.description,
        unitPrice,
        quantity,
        totalPrice: this.toMoney(unitPrice * quantity),
      };
    });

    const extrasTotal = selectedExtrasSnapshot.reduce(
      (acc, extra) => acc + Number(extra.totalPrice || 0),
      0
    );

    const baseSubtotal = this.toMoney(
      Number(experience.basePrice || 0) * data.guests
    );
    const subtotal = this.toMoney(baseSubtotal + extrasTotal);
    const taxesAmount = this.toMoney(data.taxesAmount || 0);
    const discountAmount = this.toMoney(data.discountAmount || 0);
    const manualAdjustmentAmount = this.toMoney(
      data.manualAdjustmentAmount || 0
    );

    this.validateMoneyField("Impuestos", taxesAmount);
    this.validateMoneyField("Descuento", discountAmount);
    this.validateMoneyField("Ajuste manual", manualAdjustmentAmount);

    if (discountAmount < 0 || taxesAmount < 0) {
      throw new BadRequestException(
        "Descuentos e impuestos no pueden ser negativos"
      );
    }

    const finalTotal = this.toMoney(
      subtotal + taxesAmount - discountAmount + manualAdjustmentAmount
    );

    if (finalTotal < 0) {
      throw new BadRequestException("El total final no puede ser negativo");
    }

    return {
      experience,
      selectedExtrasSnapshot,
      baseSubtotal,
      subtotal,
      taxesAmount,
      discountAmount,
      manualAdjustmentAmount,
      finalTotal,
    };
  }

  private async buildPackageQuote(data: {
    referenceId: number;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    selectedExtras?: SelectedExtraInput[];
    taxesAmount?: number;
    discountAmount?: number;
    manualAdjustmentAmount?: number;
  }) {
    if (data.checkOut <= data.checkIn) {
      throw new BadRequestException("Fechas invalidas");
    }

    if (!data.guests || data.guests < 1) {
      throw new BadRequestException("Debe haber al menos 1 huesped");
    }

    const packageItem = await this.prisma.package.findFirst({
      where: {
        id: data.referenceId,
        active: true,
      },
    });

    if (!packageItem) {
      throw new NotFoundException("Paquete no encontrado");
    }

    if (data.guests > packageItem.maxGuests) {
      throw new BadRequestException("Excede la capacidad del paquete");
    }

    const requestedExtras = Array.isArray(data.selectedExtras)
      ? data.selectedExtras
      : [];

    const packageExtras =
      requestedExtras.length > 0
        ? await this.prisma.extraService.findMany({
            where: {
              packageId: data.referenceId,
              active: true,
              id: {
                in: requestedExtras.map((item) => Number(item.id)),
              },
            },
          })
        : [];

    const selectedExtrasSnapshot = requestedExtras.map((requested) => {
      const extra = packageExtras.find(
        (item) => item.id === Number(requested.id)
      );

      if (!extra) {
        throw new BadRequestException(
          `Servicio premium invalido: ${requested.id}`
        );
      }

      const quantity = Math.max(Number(requested.quantity || 1), 1);
      const unitPrice = this.toMoney(extra.price);

      return {
        id: extra.id,
        name: extra.name,
        description: extra.description,
        unitPrice,
        quantity,
        totalPrice: this.toMoney(unitPrice * quantity),
      };
    });

    const extrasTotal = selectedExtrasSnapshot.reduce(
      (acc, extra) => acc + Number(extra.totalPrice || 0),
      0
    );

    const baseSubtotal = this.toMoney(Number(packageItem.basePrice || 0));
    const subtotal = this.toMoney(baseSubtotal + extrasTotal);
    const taxesAmount = this.toMoney(data.taxesAmount || 0);
    const discountAmount = this.toMoney(data.discountAmount || 0);
    const manualAdjustmentAmount = this.toMoney(
      data.manualAdjustmentAmount || 0
    );

    this.validateMoneyField("Impuestos", taxesAmount);
    this.validateMoneyField("Descuento", discountAmount);
    this.validateMoneyField("Ajuste manual", manualAdjustmentAmount);

    if (discountAmount < 0 || taxesAmount < 0) {
      throw new BadRequestException(
        "Descuentos e impuestos no pueden ser negativos"
      );
    }

    const finalTotal = this.toMoney(
      subtotal + taxesAmount - discountAmount + manualAdjustmentAmount
    );

    if (finalTotal < 0) {
      throw new BadRequestException("El total final no puede ser negativo");
    }

    return {
      packageItem,
      selectedExtrasSnapshot,
      baseSubtotal,
      subtotal,
      taxesAmount,
      discountAmount,
      manualAdjustmentAmount,
      finalTotal,
    };
  }

  // ===============================
  // CREATE
  // ===============================
  async create(data: {
    customerName: string;
    email: string;
    customerPhone?: string;
    customerCountry?: string;
    paymentMethodPreferred?: string;
    specialRequests?: string;
    checkIn?: string;
    checkOut?: string;
    type?: BookingType;
    referenceId?: number;
    propertyId?: number;
    guests?: number;
    adults?: number;
    children?: number;
    infants?: number;
    selectedExtras?: {
      id: number;
      quantity?: number;
    }[];
    extraIds?: number[];
  }) {
    const type = data.type ?? BookingType.PROPERTY;
    const referenceId = Number(data.referenceId ?? data.propertyId);
    const guests = Number(data.guests ?? 1);
    const checkIn = data.checkIn ? new Date(data.checkIn) : undefined;
    const checkOut = data.checkOut ? new Date(data.checkOut) : undefined;

    if (!referenceId || Number.isNaN(referenceId)) {
      throw new BadRequestException("Producto requerido");
    }

    if (
      type !== BookingType.PROPERTY &&
      type !== BookingType.EXPERIENCE &&
      type !== BookingType.PACKAGE
    ) {
      throw new BadRequestException(
        "Tipo de producto no habilitado para solicitud asistida"
      );
    }

    let selectedExtrasSnapshot: any[] = [];
    let totalEstimate = 0;
    let taxesAmount = 0;
    let itemName: string | undefined;

    if (type === BookingType.PROPERTY) {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      if (
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime())
      ) {
        throw new BadRequestException("Fechas invalidas");
      }

      if (checkOut <= checkIn) {
        throw new BadRequestException("Fechas invalidas");
      }

      if (!guests || guests < 1) {
        throw new BadRequestException("Debe haber al menos 1 huesped");
      }

      const property = await this.prisma.property.findUnique({
        where: { id: referenceId },
        include: { extras: true },
      });

      if (!property) {
        throw new NotFoundException("Propiedad no encontrada");
      }

      const maxAllowedGuests = Math.min(
        property.maxGuests,
        property.maxCapacity
      );

      if (guests > maxAllowedGuests) {
        throw new BadRequestException("Excede la capacidad del alojamiento");
      }

      const nights =
        (checkOut.getTime() - checkIn.getTime()) /
        (1000 * 60 * 60 * 24);

      if (nights < property.minimumNights) {
        throw new BadRequestException(
          `Estadia minima: ${property.minimumNights} noches`
        );
      }

      const requestedExtras =
        Array.isArray(data.selectedExtras) && data.selectedExtras.length > 0
          ? data.selectedExtras
          : (data.extraIds || []).map((id) => ({ id, quantity: 1 }));

      selectedExtrasSnapshot = requestedExtras
        .map((requested) => {
          const extra = property.extras.find(
            (item) => item.id === Number(requested.id) && item.active
          );

          if (!extra) return null;

          const quantity = Math.max(Number(requested.quantity || 1), 1);
          const unitPrice = Number(extra.price || 0);

          return {
            id: extra.id,
            name: extra.name,
            description: extra.description,
            unitPrice,
            quantity,
            totalPrice: unitPrice * quantity,
          };
        })
        .filter(Boolean) as any[];

      const extrasTotal = selectedExtrasSnapshot.reduce(
        (acc, extra) => acc + Number(extra.totalPrice || 0),
        0
      );

      const stayTotal = nights * Number(property.pricePerNight || 0);
      const cleaningFee = Number(property.cleaningFee || 0);
      const serviceFee = Number(property.serviceFee || 0);
      taxesAmount = Number(property.taxes || 0);

      totalEstimate =
        stayTotal +
        cleaningFee +
        serviceFee +
        taxesAmount +
        extrasTotal;

      itemName = property.title;
    }

    if (type === BookingType.EXPERIENCE) {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      if (
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime())
      ) {
        throw new BadRequestException("Fechas invalidas");
      }

      const quote = await this.buildExperienceQuote({
        referenceId,
        checkIn,
        checkOut,
        guests,
        selectedExtras:
          Array.isArray(data.selectedExtras) && data.selectedExtras.length > 0
            ? data.selectedExtras
            : (data.extraIds || []).map((id) => ({ id, quantity: 1 })),
      });

      selectedExtrasSnapshot = quote.selectedExtrasSnapshot;
      totalEstimate = quote.finalTotal;
      taxesAmount = quote.taxesAmount;
      itemName = quote.experience.title;
    }

    if (type === BookingType.PACKAGE) {
      if (!checkIn || !checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      if (
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime())
      ) {
        throw new BadRequestException("Fechas invalidas");
      }

      const quote = await this.buildPackageQuote({
        referenceId,
        checkIn,
        checkOut,
        guests,
        selectedExtras:
          Array.isArray(data.selectedExtras) && data.selectedExtras.length > 0
            ? data.selectedExtras
            : (data.extraIds || []).map((id) => ({ id, quantity: 1 })),
      });

      selectedExtrasSnapshot = quote.selectedExtrasSnapshot;
      totalEstimate = quote.finalTotal;
      taxesAmount = quote.taxesAmount;
      itemName = quote.packageItem.title;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const pre = await tx.preReservation.create({
        data: {
          customerName: data.customerName,
          email: data.email,
          customerPhone: data.customerPhone || null,
          customerCountry: data.customerCountry || null,
          paymentMethodPreferred: data.paymentMethodPreferred || null,
          specialRequests: data.specialRequests || null,
          selectedExtras: selectedExtrasSnapshot,
          checkIn,
          checkOut,
          adults: data.adults ? Number(data.adults) : null,
          children: data.children ? Number(data.children) : null,
          infants: data.infants ? Number(data.infants) : null,
          totalEstimate: totalEstimate || null,
          taxesAmount: taxesAmount || null,
          finalTotal: totalEstimate || null,
          status: PreReservationStatus.PENDING_ADVISOR,
        },
      });

      if (referenceId) {
        await tx.preReservationItem.create({
          data: {
            preReservationId: pre.id,
            type,
            referenceId,
            name: itemName,
            unitPrice: totalEstimate || null,
            quantity: 1,
            totalPrice: totalEstimate || null,
            guests,
          },
        });
      }

      return tx.preReservation.findUnique({
        where: { id: pre.id },
        include: { items: true },
      });
    });

    if (updated?.id) {
      void this.notificationsService
        .notifyNewPreReservation(updated.id)
        .catch((error) => {
          this.logger.warn(
            `No se pudo disparar notificacion operativa ${updated.id}: ${
              error instanceof Error ? error.message : "Notification error"
            }`
          );
        });
    }

    return updated;
  }
  // ===============================
  // RECALCULATE TOTAL
  // ===============================
  async recalculateTotal(preReservationId: string) {
    const items = await this.prisma.preReservationItem.findMany({
      where: { preReservationId },
    });

    const total = items.reduce((acc, item) => {
      return acc + (item.totalPrice ?? 0);
    }, 0);

    return this.prisma.preReservation.update({
      where: { id: preReservationId },
      data: { totalEstimate: total },
    });
  }

  // ===============================
  // ADD ITEM
  // ===============================
  async addItem(data: {
    preReservationId: string;
    type: BookingType;
    referenceId: number;
    name?: string;
    unitPrice?: number;
    quantity?: number;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
    extraIds?: number[];
  }, actor?: ReservationActor) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id: data.preReservationId },
    });

    if (!pre) {
      throw new NotFoundException("PreReservation no encontrada");
    }

    if (actor) {
      await this.getManagedReservation(data.preReservationId, actor);
    }

    const quantity = data.quantity ?? 1;
    const guests = data.guests ?? 1;
    let officialName = data.name;
    let officialUnitPrice = data.unitPrice || 0;

    // VALIDACION DISPONIBILIDAD Y PRECIO OFICIAL
    if (data.type === BookingType.PROPERTY) {
      if (!data.checkIn || !data.checkOut) {
        throw new BadRequestException("Fechas requeridas");
      }

      const checkIn = new Date(data.checkIn);
      const checkOut = new Date(data.checkOut);

      if (checkOut <= checkIn) {
        throw new BadRequestException("Fechas invalidas");
      }

      const property = await this.prisma.property.findUnique({
        where: {
          id: data.referenceId,
        },
        include: {
          extras: true,
        },
      });

      if (!property) {
        throw new NotFoundException("Propiedad no encontrada");
      }

      const maxAllowedGuests = Math.min(
        property.maxGuests,
        property.maxCapacity
      );

      if (guests > maxAllowedGuests) {
        throw new BadRequestException("Excede la capacidad del alojamiento");
      }

      const nights =
        (checkOut.getTime() - checkIn.getTime()) /
        (1000 * 60 * 60 * 24);

      if (nights < property.minimumNights) {
        throw new BadRequestException(
          `Estadia minima: ${property.minimumNights} noches`
        );
      }

      const availability = await this.availability.checkAvailability({
        type: BookingType.PROPERTY,
        referenceId: data.referenceId,
        checkIn,
        checkOut,
      });

      if (!availability.available) {
        throw new BadRequestException("No disponible");
      }

      const extraIds = Array.isArray(data.extraIds)
        ? data.extraIds.map(Number)
        : [];

      const selectedExtras = property.extras.filter((extra) => {
        return extraIds.includes(extra.id) && extra.active;
      });

      const extrasTotal = selectedExtras.reduce((acc, extra) => {
        return acc + Number(extra.price || 0);
      }, 0);

      const stayTotal = nights * Number(property.pricePerNight || 0);

      officialName = property.title;
      officialUnitPrice =
        stayTotal +
        Number(property.cleaningFee || 0) +
        Number(property.serviceFee || 0) +
        Number(property.taxes || 0) +
        extrasTotal;

      // SOFT LOCK
      await this.prisma.availabilityBlock.create({
        data: {
          type: BookingType.PROPERTY,
          referenceId: data.referenceId,
          propertyId: property.id,
          startDate: checkIn,
          endDate: checkOut,
          source: AvailabilitySource.SYSTEM,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          notes: `pre-${data.preReservationId}`,
        },
      });
    }

    const totalPrice = officialUnitPrice * quantity;

    const item = await this.prisma.preReservationItem.create({
      data: {
        preReservationId: data.preReservationId,
        type: data.type,
        referenceId: data.referenceId,
        name: officialName,
        unitPrice: officialUnitPrice,
        quantity,
        totalPrice,
        guests,
      },
    });

    await this.recalculateTotal(data.preReservationId);

    if (actor) {
      await this.audit.record({
        actor,
        action: "PRE_RESERVATION_ITEM_ADDED",
        entityType: "PreReservation",
        entityId: data.preReservationId,
        metadata: {
          itemId: item.id,
          type: data.type,
          referenceId: data.referenceId,
        },
      });
    }

    return item;
  }

  // ===============================
  // REMOVE ITEM (FIX 🔥)
  // ===============================
  async removeItem(itemId: number, actor?: ReservationActor) {
    const item = await this.prisma.preReservationItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    if (actor) {
      await this.getManagedReservation(item.preReservationId, actor);
    }

    // 🔥 ELIMINAR BLOQUEO TEMPORAL
    await this.prisma.availabilityBlock.deleteMany({
      where: {
        referenceId: item.referenceId,
        notes: `pre-${item.preReservationId}`,
      },
    });

    await this.prisma.preReservationItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotal(item.preReservationId);

    if (actor) {
      await this.audit.record({
        actor,
        action: "PRE_RESERVATION_ITEM_REMOVED",
        entityType: "PreReservation",
        entityId: item.preReservationId,
        metadata: {
          itemId,
        },
      });
    }

    return { success: true };
  }

  // ===============================
  // CONFIRM (PRO)
  // ===============================
  async confirmPreReservation(preReservationId: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const pre = await tx.preReservation.findUnique({
        where: { id: preReservationId },
        include: { items: true },
      });

      if (!pre) throw new Error("Pre-reserva no encontrada");
      if (!pre.items.length) throw new Error("Sin items");

      if (!pre.checkIn || !pre.checkOut) {
        throw new Error("Fechas inválidas");
      }

      const bookings: Booking[] = []; // ✅ FIX

      for (const item of pre.items) {
        const conflict = await tx.availabilityBlock.findFirst({
          where: {
            type: item.type,
            referenceId: item.referenceId,
            NOT: {
              notes: `pre-${pre.id}`,
            },
            AND: [
              { startDate: { lt: pre.checkOut } },
              { endDate: { gt: pre.checkIn } },
            ],
          },
        });

        if (conflict) {
          throw new Error("Ya no disponible");
        }

        const booking = await tx.booking.create({
          data: {
            userId,
            type: item.type,
            referenceId: item.referenceId,
            checkIn: pre.checkIn,
            checkOut: pre.checkOut,
            guests: item.guests,
            totalPrice: item.totalPrice || 0,
            status: BookingStatus.CONFIRMED,
          },
        });

        await tx.availabilityBlock.create({
          data: {
            type: item.type,
            referenceId: item.referenceId,
            startDate: pre.checkIn,
            endDate: pre.checkOut,
            source: AvailabilitySource.STRIPE,
            notes: `booking-${booking.id}`,
          },
        });

        bookings.push(booking);
      }

      await tx.availabilityBlock.deleteMany({
        where: {
          notes: `pre-${pre.id}`,
        },
      });

      await tx.preReservation.update({
        where: { id: pre.id },
        data: { status: PreReservationStatus.CONFIRMED },
      });

      return bookings;
    });
  }
  // ===============================
  // FIND ALL
  // ===============================
  async findAll(actor: ReservationActor) {
    if (this.isSuperAdmin(actor)) {
      return this.prisma.preReservation.findMany({
        where: { archivedAt: null },
        include: {
          items: true,
          assignedTo: true,
          payments: { orderBy: { createdAt: "desc" } },
          booking: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (actor.role === "ADVISOR") {
      return this.prisma.preReservation.findMany({
        where: {
          archivedAt: null,
          OR: [
            {
              status: PreReservationStatus.PENDING_ADVISOR,
              assignedToId: null,
            },
            {
              assignedToId: actor.userId,
            },
          ],
        },
        include: {
          items: true,
          assignedTo: true,
          payments: { orderBy: { createdAt: "desc" } },
          booking: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    throw new ForbiddenException("Rol no autorizado");
  }

  async findAllLegacy() {
    return this.prisma.preReservation.findMany({
      include: { items: true },
    });
  }

  async findOperationalNotifications(actor: ReservationActor) {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException("Solo SUPERADMIN puede ver notificaciones operativas");
    }

    return this.prisma.operationalNotification.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        preReservation: {
          select: {
            id: true,
            customerName: true,
            status: true,
            createdAt: true,
            items: {
              select: {
                type: true,
                referenceId: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  // ===============================
  // FIND ONE
  // ===============================
  async findOne(id: string, actor: ReservationActor) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: {
        items: true,
        assignedTo: true,
        payments: { orderBy: { createdAt: "desc" } },
        booking: true,
      },
    });

    if (!pre) {
      throw new NotFoundException("Pre-reserva no encontrada");
    }

    if (this.isSuperAdmin(actor)) {
      return pre;
    }

    if (
      actor.role === "ADVISOR" &&
      (
        pre.assignedToId === actor.userId ||
        (
          pre.assignedToId === null &&
          pre.status === PreReservationStatus.PENDING_ADVISOR
        )
      )
    ) {
      return pre;
    }

    throw new ForbiddenException("No tienes acceso a esta reserva");
  }

  async findOneLegacy(id: string) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!pre) {
      throw new NotFoundException("Pre-reserva no encontrada");
    }

    return pre;
  }

  // ===============================
  // ASSIGN
  // ===============================
  async assignToCurrentAdvisor(id: string, actor: ReservationActor) {
    if (
      actor.role !== "ADVISOR" &&
      actor.role !== "SUPERADMIN"
    ) {
      throw new ForbiddenException("Rol no autorizado");
    }

    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
    });

    if (!pre) {
      throw new NotFoundException("Pre-reserva no encontrada");
    }

    if (pre.assignedToId) {
      throw new ConflictException("La reserva ya tiene asesor asignado");
    }

    if (pre.status !== PreReservationStatus.PENDING_ADVISOR) {
      throw new BadRequestException(
        "Solo se pueden tomar reservas pendientes de asesor"
      );
    }

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: {
        assignedToId: actor.userId,
        status: PreReservationStatus.ASSIGNED,
      },
      include: { items: true, assignedTo: true },
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_TAKEN",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        assignedToId: actor.userId,
      },
    });

    return updated;
  }

  async assign(id: string, userId: number) {
    const advisor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!advisor) {
      throw new NotFoundException("Asesor no encontrado");
    }

    if (advisor.role !== "ADVISOR") {
      throw new BadRequestException("El usuario asignado debe ser asesor");
    }

    return this.prisma.preReservation.update({
      where: { id },
      data: {
        assignedToId: userId,
        status: PreReservationStatus.ASSIGNED,
      },
      include: { items: true, assignedTo: true },
    });
  }

  async markValidating(id: string, actor: ReservationActor) {
    const pre = await this.getManagedReservation(id, actor);
    this.logTransitionAttempt(
      id,
      actor,
      pre.status,
      PreReservationStatus.VALIDATING
    );

    this.assertTransition(
      pre.status,
      [
        PreReservationStatus.ASSIGNED,
        PreReservationStatus.AVAILABLE,
        PreReservationStatus.UNAVAILABLE,
      ],
      PreReservationStatus.VALIDATING
    );

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: { status: PreReservationStatus.VALIDATING },
      include: { items: true, assignedTo: true },
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_STATUS_CHANGED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        from: pre.status,
        to: PreReservationStatus.VALIDATING,
      },
    });

    return updated;
  }

  async markAvailable(id: string, actor: ReservationActor) {
    const pre = await this.getManagedReservation(id, actor);
    this.logTransitionAttempt(
      id,
      actor,
      pre.status,
      PreReservationStatus.AVAILABLE
    );

    this.assertTransition(
      pre.status,
      [
        PreReservationStatus.ASSIGNED,
        PreReservationStatus.VALIDATING,
        PreReservationStatus.UNAVAILABLE,
      ],
      PreReservationStatus.AVAILABLE
    );

    if (!pre.checkIn || !pre.checkOut) {
      throw new BadRequestException("La solicitud no tiene fechas para validar");
    }

    const primaryItem = pre.items[0];

    if (!primaryItem) {
      throw new BadRequestException("La solicitud no tiene producto asociado");
    }

    if (!this.isRealAvailabilityEnabled()) {
      const updated = await this.prisma.preReservation.update({
        where: { id },
        data: {
          status: PreReservationStatus.AVAILABLE,
          advisorNotes:
            pre.advisorNotes || "Validación manual por asesor.",
        },
        include: { items: true, assignedTo: true },
      });

      await this.audit.record({
        actor,
        action: "PRE_RESERVATION_STATUS_CHANGED",
        entityType: "PreReservation",
        entityId: id,
        metadata: {
          from: pre.status,
          to: PreReservationStatus.AVAILABLE,
          mode: "MANUAL_AVAILABILITY",
        },
      });

      return updated;
    }

    const existingBookingConflict = await this.prisma.booking.findFirst({
      where: {
        type: primaryItem.type,
        referenceId: primaryItem.referenceId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        checkIn: { lt: pre.checkOut },
        checkOut: { gt: pre.checkIn },
      },
      select: {
        id: true,
        reservationCode: true,
      },
    });

    const existingBlockConflict =
      await this.prisma.availabilityBlock.findFirst({
        where: {
          type: primaryItem.type,
          referenceId: primaryItem.referenceId,
          NOT: {
            notes: `pre-${pre.id}`,
          },
          AND: [
            { startDate: { lt: pre.checkOut } },
            { endDate: { gt: pre.checkIn } },
          ],
        },
        select: {
          id: true,
          notes: true,
        },
      });

    if (existingBookingConflict || existingBlockConflict) {
      await this.prisma.preReservation.update({
        where: { id },
        data: {
          status: PreReservationStatus.UNAVAILABLE,
          advisorNotes:
            "No disponible por reserva o bloqueo operativo existente.",
        },
      });

      await this.audit.record({
        actor,
        action: "PRE_RESERVATION_STATUS_CHANGED",
        entityType: "PreReservation",
        entityId: id,
        metadata: {
          from: pre.status,
          to: PreReservationStatus.UNAVAILABLE,
          reason: "INTERNAL_AVAILABILITY_CONFLICT",
          bookingId: existingBookingConflict?.id,
          blockId: existingBlockConflict?.id,
        },
      });

      throw new ConflictException({
        message:
          "No disponible por reserva o bloqueo operativo existente. La solicitud fue marcada como UNAVAILABLE.",
      });
    }

    if (primaryItem.type === BookingType.PROPERTY) {
      const availability =
        await this.calendarService.checkPropertyIcalAvailability(
          primaryItem.referenceId,
          pre.checkIn,
          pre.checkOut
        );

      if (!availability.available) {
        await this.prisma.preReservation.update({
          where: { id },
          data: {
            status: PreReservationStatus.UNAVAILABLE,
            advisorNotes:
              "No disponible segun calendario externo iCal.",
          },
        });

        await this.audit.record({
          actor,
          action: "PRE_RESERVATION_STATUS_CHANGED",
          entityType: "PreReservation",
          entityId: id,
          metadata: {
            from: pre.status,
            to: PreReservationStatus.UNAVAILABLE,
            reason: "ICAL_CONFLICT",
            conflicts: availability.conflicts.length,
          },
        });

        throw new ConflictException({
          message:
            "No disponible segun calendario externo. La solicitud fue marcada como UNAVAILABLE.",
          conflicts: availability.conflicts,
        });
      }
    }

    if (primaryItem.type === BookingType.EXPERIENCE) {
      const conflict = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: BookingType.EXPERIENCE,
          referenceId: primaryItem.referenceId,
          NOT: {
            notes: `pre-${pre.id}`,
          },
          AND: [
            { startDate: { lt: pre.checkOut } },
            { endDate: { gt: pre.checkIn } },
          ],
        },
      });

      if (conflict) {
        await this.prisma.preReservation.update({
          where: { id },
          data: {
            status: PreReservationStatus.UNAVAILABLE,
            advisorNotes:
              "No disponible por bloqueo operativo de experiencia.",
          },
        });

        await this.audit.record({
          actor,
          action: "PRE_RESERVATION_STATUS_CHANGED",
          entityType: "PreReservation",
          entityId: id,
          metadata: {
            from: pre.status,
            to: PreReservationStatus.UNAVAILABLE,
            reason: "EXPERIENCE_BLOCK_CONFLICT",
            blockId: conflict.id,
          },
        });

        throw new ConflictException({
          message:
            "No disponible por bloqueo operativo. La solicitud fue marcada como UNAVAILABLE.",
        });
      }
    }

    if (primaryItem.type === BookingType.PACKAGE) {
      const conflict = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: BookingType.PACKAGE,
          referenceId: primaryItem.referenceId,
          NOT: {
            notes: `pre-${pre.id}`,
          },
          AND: [
            { startDate: { lt: pre.checkOut } },
            { endDate: { gt: pre.checkIn } },
          ],
        },
      });

      if (conflict) {
        await this.prisma.preReservation.update({
          where: { id },
          data: {
            status: PreReservationStatus.UNAVAILABLE,
            advisorNotes:
              "No disponible por bloqueo operativo de paquete.",
          },
        });

        await this.audit.record({
          actor,
          action: "PRE_RESERVATION_STATUS_CHANGED",
          entityType: "PreReservation",
          entityId: id,
          metadata: {
            from: pre.status,
            to: PreReservationStatus.UNAVAILABLE,
            reason: "PACKAGE_BLOCK_CONFLICT",
            blockId: conflict.id,
          },
        });

        throw new ConflictException({
          message:
            "No disponible por bloqueo operativo. La solicitud fue marcada como UNAVAILABLE.",
        });
      }
    }

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: { status: PreReservationStatus.AVAILABLE },
      include: { items: true, assignedTo: true },
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_STATUS_CHANGED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        from: pre.status,
        to: PreReservationStatus.AVAILABLE,
      },
    });

    return updated;
  }

  async markUnavailable(id: string, actor: ReservationActor) {
    const pre = await this.getManagedReservation(id, actor);
    this.logTransitionAttempt(
      id,
      actor,
      pre.status,
      PreReservationStatus.UNAVAILABLE
    );

    this.assertTransition(
      pre.status,
      [
        PreReservationStatus.ASSIGNED,
        PreReservationStatus.VALIDATING,
        PreReservationStatus.AVAILABLE,
      ],
      PreReservationStatus.UNAVAILABLE
    );

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: { status: PreReservationStatus.UNAVAILABLE },
      include: { items: true, assignedTo: true },
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_STATUS_CHANGED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        from: pre.status,
        to: PreReservationStatus.UNAVAILABLE,
      },
    });

    return updated;
  }

  async markPaymentPending(id: string, actor: ReservationActor) {
    const pre = await this.getManagedReservation(id, actor);
    this.logTransitionAttempt(
      id,
      actor,
      pre.status,
      PreReservationStatus.PAYMENT_PENDING
    );

    if (pre.status === PreReservationStatus.PAYMENT_PENDING) {
      return this.prisma.preReservation.findUnique({
        where: { id },
        include: {
          items: true,
          assignedTo: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      });
    }

    this.assertTransition(
      pre.status,
      [PreReservationStatus.AVAILABLE],
      PreReservationStatus.PAYMENT_PENDING
    );

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: {
        status: PreReservationStatus.PAYMENT_PENDING,
        finalTotal:
          pre.finalTotal ??
          pre.totalEstimate ??
          pre.totalPrice,
      },
      include: { items: true, assignedTo: true },
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_STATUS_CHANGED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        from: pre.status,
        to: PreReservationStatus.PAYMENT_PENDING,
        finalTotal: updated.finalTotal,
      },
    });

    return updated;
  }

  async generateManualBooking(id: string, actor: ReservationActor) {
    const pre = await this.getManagedReservation(id, actor);
    const realAvailabilityEnabled = this.isRealAvailabilityEnabled();

    const allowedManualStatuses: PreReservationStatus[] = [
        PreReservationStatus.AVAILABLE,
        PreReservationStatus.PAYMENT_PENDING,
        PreReservationStatus.CONFIRMED,
      ];

    if (!allowedManualStatuses.includes(pre.status)) {
      throw new BadRequestException(
        "Solo se puede generar reserva desde AVAILABLE o PAYMENT_PENDING"
      );
    }

    const existingBooking = await this.prisma.booking.findUnique({
      where: { preReservationId: id },
    });

    if (existingBooking) {
      const invoicePath = await this.ensureManualInvoice(existingBooking.id);

      return {
        booking: {
          ...existingBooking,
          invoicePath,
        },
        reservationCode: existingBooking.reservationCode,
        idempotent: true,
      };
    }

    const item = pre.items[0];

    if (!item || !pre.checkIn || !pre.checkOut) {
      throw new BadRequestException(
        "La solicitud no tiene producto o fechas validas"
      );
    }

    const checkIn = pre.checkIn;
    const checkOut = pre.checkOut;

    const finalTotal = Number(
      pre.finalTotal ??
        pre.totalEstimate ??
        pre.totalPrice
    );

    if (!finalTotal || finalTotal <= 0) {
      throw new BadRequestException(
        "La solicitud no tiene total final valido"
      );
    }

    const user = await this.ensureCustomerUser(pre);

    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { preReservationId: pre.id },
      });

      if (existing) {
        return existing;
      }

      if (realAvailabilityEnabled) {
        const conflict = await tx.availabilityBlock.findFirst({
          where: {
            type: item.type,
            referenceId: item.referenceId,
            NOT: {
              notes: `pre-${pre.id}`,
            },
            AND: [
              { startDate: { lt: checkOut } },
              { endDate: { gt: checkIn } },
            ],
          },
        });

        if (conflict) {
          throw new BadRequestException(
            "La disponibilidad cambio antes de confirmar. Requiere revision manual."
          );
        }
      }

      const reservationCode = await this.createReservationCode(tx);
      const created = await tx.booking.create({
        data: {
          reservationCode,
          preReservationId: pre.id,
          type: item.type,
          referenceId: item.referenceId,
          productName: item.name,
          checkIn,
          checkOut,
          guests: item.guests,
          adults: pre.adults,
          children: pre.children,
          infants: pre.infants,
          totalPrice: finalTotal,
          taxesAmount: pre.taxesAmount,
          discountAmount: pre.discountAmount,
          selectedExtras: pre.selectedExtras ?? undefined,
          customerName: pre.customerName,
          customerEmail: pre.email,
          customerPhone: pre.customerPhone,
          advisorId: pre.assignedToId,
          advisorName: pre.assignedTo?.name,
          paymentMethod: "Manual concierge",
          status: BookingStatus.CONFIRMED,
          userId: user.id,
        },
      });

      await tx.availabilityBlock.create({
        data: {
          type: item.type,
          referenceId: item.referenceId,
          propertyId:
            item.type === BookingType.PROPERTY
              ? item.referenceId
              : null,
          startDate: checkIn,
          endDate: checkOut,
          source: AvailabilitySource.SYSTEM,
          notes: `booking-${created.id}`,
        },
      });

      await tx.preReservationItem.updateMany({
        where: { preReservationId: pre.id },
        data: { paid: true },
      });

      await tx.availabilityBlock.deleteMany({
        where: {
          notes: `pre-${pre.id}`,
        },
      });

      await tx.preReservation.update({
        where: { id: pre.id },
        data: { status: PreReservationStatus.CONFIRMED },
      });

      return created;
    });

    const invoicePath = await this.ensureManualInvoice(booking.id);
    const updatedBooking = await this.prisma.booking.findUnique({
      where: { id: booking.id },
    });

    await this.audit.record({
      actor,
      action: "MANUAL_BOOKING_GENERATED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        bookingId: booking.id,
        reservationCode: booking.reservationCode,
        finalTotal,
      },
    });

    return {
      booking: {
        ...updatedBooking,
        invoicePath,
      },
      reservationCode: booking.reservationCode,
      idempotent: false,
    };
  }

  async updateAssistedQuote(
    id: string,
    data: AssistedQuoteUpdateInput,
    actor: ReservationActor
  ) {
    const pre = await this.getManagedReservation(id, actor);

    const editableStatuses: PreReservationStatus[] = [
        PreReservationStatus.ASSIGNED,
        PreReservationStatus.VALIDATING,
        PreReservationStatus.AVAILABLE,
        PreReservationStatus.UNAVAILABLE,
    ];

    if (!editableStatuses.includes(pre.status)) {
      throw new BadRequestException(
        "Solo se puede editar una solicitud asignada antes de pago"
      );
    }

    const currentItem = pre.items[0];
    const type = data.type ?? currentItem?.type ?? BookingType.PROPERTY;
    const referenceId = Number(
      data.referenceId ?? data.propertyId ?? currentItem?.referenceId
    );

    if (
      type !== BookingType.PROPERTY &&
      type !== BookingType.EXPERIENCE &&
      type !== BookingType.PACKAGE
    ) {
      throw new BadRequestException(
        "Tipo de producto no habilitado para cotizacion asistida"
      );
    }

    if (!referenceId) {
      throw new BadRequestException("Producto requerido");
    }

    const checkIn = data.checkIn
      ? new Date(data.checkIn)
      : pre.checkIn;
    const checkOut = data.checkOut
      ? new Date(data.checkOut)
      : pre.checkOut;

    if (!checkIn || !checkOut) {
      throw new BadRequestException("Fechas requeridas");
    }

    const adults =
      data.adults !== undefined
        ? Number(data.adults)
        : pre.adults;
    const children =
      data.children !== undefined
        ? Number(data.children)
        : pre.children;
    const infants =
      data.infants !== undefined
        ? Number(data.infants)
        : pre.infants;

    for (const [label, value] of [
      ["Adultos", adults],
      ["Ninos", children],
      ["Bebes", infants],
    ] as const) {
      if (
        value !== null &&
        value !== undefined &&
        (!Number.isInteger(value) || value < 0)
      ) {
        throw new BadRequestException(`${label} invalido`);
      }
    }

    const hasGuestBreakdownInput =
      data.adults !== undefined ||
      data.children !== undefined ||
      data.infants !== undefined;
    const guests =
      data.guests !== undefined
        ? Number(data.guests)
        : hasGuestBreakdownInput
          ? Number(adults || 0) +
            Number(children || 0) +
            Number(infants || 0)
          : Number(currentItem?.guests || 1);

    if (!Number.isInteger(guests) || guests < 1) {
      throw new BadRequestException("Debe haber al menos 1 huesped");
    }

    const existingExtras = Array.isArray(pre.selectedExtras)
      ? (pre.selectedExtras as any[]).map((extra) => ({
          id: Number(extra.id),
          quantity: Number(extra.quantity || 1),
        }))
      : [];

    const productChanged =
      currentItem?.type !== type ||
      currentItem?.referenceId !== referenceId;
    const datesChanged =
      (pre.checkIn?.getTime() || null) !== checkIn.getTime() ||
      (pre.checkOut?.getTime() || null) !== checkOut.getTime();

    const selectedExtras =
      data.selectedExtras !== undefined
        ? data.selectedExtras
        : existingExtras;
    const taxesAmount =
      data.taxesAmount !== undefined
        ? Number(data.taxesAmount)
        : productChanged
          ? undefined
          : pre.taxesAmount ?? undefined;
    const discountAmount =
      data.discountAmount !== undefined
        ? Number(data.discountAmount)
        : pre.discountAmount ?? 0;
    const manualAdjustmentAmount =
      data.manualAdjustmentAmount !== undefined
        ? Number(data.manualAdjustmentAmount)
        : pre.manualAdjustmentAmount ?? 0;

    const quote =
      type === BookingType.PROPERTY
        ? await this.buildPropertyQuote({
            referenceId,
            checkIn,
            checkOut,
            guests,
            selectedExtras,
            taxesAmount,
            discountAmount,
            manualAdjustmentAmount,
          })
        : type === BookingType.EXPERIENCE
          ? await this.buildExperienceQuote({
              referenceId,
              checkIn,
              checkOut,
              guests,
              selectedExtras,
              taxesAmount,
              discountAmount,
              manualAdjustmentAmount,
            })
          : await this.buildPackageQuote({
              referenceId,
              checkIn,
              checkOut,
              guests,
              selectedExtras,
              taxesAmount,
              discountAmount,
              manualAdjustmentAmount,
            });
    const productName =
      type === BookingType.PROPERTY
        ? (quote as any).property.title
        : type === BookingType.EXPERIENCE
          ? (quote as any).experience.title
          : (quote as any).packageItem.title;

    const nextStatus =
      pre.status === PreReservationStatus.ASSIGNED
        ? PreReservationStatus.ASSIGNED
        : pre.status === PreReservationStatus.AVAILABLE &&
            !productChanged &&
            !datesChanged
          ? PreReservationStatus.AVAILABLE
          : PreReservationStatus.VALIDATING;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (currentItem) {
        await tx.preReservationItem.update({
          where: { id: currentItem.id },
          data: {
            type,
            referenceId,
            name: productName,
            unitPrice: quote.baseSubtotal,
            quantity: 1,
            totalPrice: quote.baseSubtotal,
            guests,
          },
        });

        await tx.preReservationItem.deleteMany({
          where: {
            preReservationId: id,
            id: { not: currentItem.id },
          },
        });
      } else {
        await tx.preReservationItem.create({
          data: {
            preReservationId: id,
            type,
            referenceId,
            name: productName,
            unitPrice: quote.baseSubtotal,
            quantity: 1,
            totalPrice: quote.baseSubtotal,
            guests,
          },
        });
      }

      return tx.preReservation.update({
        where: { id },
        data: {
          checkIn,
          checkOut,
          adults: adults ?? null,
          children: children ?? null,
          infants: infants ?? null,
          selectedExtras: quote.selectedExtrasSnapshot,
          totalEstimate: quote.subtotal,
          totalPrice: quote.finalTotal,
          taxesAmount: quote.taxesAmount,
          discountAmount: quote.discountAmount,
          manualAdjustmentAmount: quote.manualAdjustmentAmount,
          finalTotal: quote.finalTotal,
          advisorNotes:
            data.advisorNotes !== undefined
              ? data.advisorNotes
              : pre.advisorNotes,
          internalNotes:
            data.internalNotes !== undefined
              ? data.internalNotes
              : pre.internalNotes,
          lastModifiedById: actor.userId,
          status: nextStatus,
        },
        include: { items: true, assignedTo: true },
      });
    });

    await this.audit.record({
      actor,
      action: "PRE_RESERVATION_QUOTE_UPDATED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        referenceId,
        guests,
        taxesAmount: quote.taxesAmount,
        discountAmount: quote.discountAmount,
        manualAdjustmentAmount: quote.manualAdjustmentAmount,
        finalTotal: quote.finalTotal,
        status: nextStatus,
      },
    });

    return updated;
  }

  // ===============================
  // UPDATE ITEM
  // ===============================
  async updateItem(itemId: number, data: any, actor?: ReservationActor) {
    const existing = await this.prisma.preReservationItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      throw new NotFoundException("Item not found");
    }

    if (actor) {
      await this.getManagedReservation(existing.preReservationId, actor);
    }

    const item = await this.prisma.preReservationItem.update({
      where: { id: itemId },
      data,
    });

    await this.recalculateTotal(item.preReservationId);

    if (actor) {
      await this.audit.record({
        actor,
        action: "PRE_RESERVATION_ITEM_UPDATED",
        entityType: "PreReservation",
        entityId: item.preReservationId,
        metadata: {
          itemId,
        },
      });
    }

    return item;
  }
}
