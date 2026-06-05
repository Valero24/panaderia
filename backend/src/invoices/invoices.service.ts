import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingStatus,
  InvoicePaymentStatus,
  InvoiceStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { buildFactusInvoicePayload } from "../factus/factus-invoice.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { ListInvoicesDto } from "./dto/list-invoices.dto";

type InvoiceActor = {
  userId?: number;
  role?: Role | string;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private assertValidId(id: number, label: string) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`${label} invalido`);
    }
  }

  private isSuperAdmin(actor: InvoiceActor) {
    return actor.role === Role.SUPERADMIN || actor.role === "SUPERADMIN";
  }

  private assertSuperAdmin(actor: InvoiceActor) {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException("Solo SUPERADMIN puede administrar facturas");
    }
  }

  private includeRelations() {
    return {
      booking: {
        select: {
          id: true,
          reservationCode: true,
          productName: true,
          type: true,
          checkIn: true,
          checkOut: true,
          guests: true,
          adults: true,
          children: true,
          infants: true,
          totalPrice: true,
          status: true,
          advisorId: true,
          advisorName: true,
          invoicePath: true,
          billingLegalOrganizationType: true,
          billingIdentificationDocumentType: true,
          billingIdentificationNumber: true,
          billingVerificationDigit: true,
          billingCustomerName: true,
          billingEmail: true,
          billingPhone: true,
          billingDepartment: true,
          billingMunicipalityId: true,
          billingMunicipalityName: true,
          billingAddress: true,
          billingTaxResponsibility: true,
          billingTributeId: true,
          billingDataAccepted: true,
          billingIsComplete: true,
        },
      },
      preReservation: {
        select: {
          id: true,
          status: true,
          customerName: true,
          email: true,
          customerPhone: true,
          checkIn: true,
          checkOut: true,
          subtotalCop: true,
          taxCop: true,
          discountCop: true,
          totalCop: true,
          displayCurrency: true,
          displayTotal: true,
          exchangeRate: true,
          exchangeRateSource: true,
          exchangeRateDate: true,
          assignedToId: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              type: true,
              referenceId: true,
              name: true,
              guests: true,
            },
          },
        },
      },
    };
  }

  private async createInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    let sequence = count + 1;

    while (sequence < count + 1000) {
      const invoiceNumber = `INV-${year}-${String(sequence).padStart(6, "0")}`;
      const exists = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
        select: { id: true },
      });

      if (!exists) return invoiceNumber;

      sequence += 1;
    }

    throw new BadRequestException("No se pudo generar numero de factura");
  }

  async findAll(query: ListInvoicesDto, actor: InvoiceActor) {
    this.assertSuperAdmin(actor);
    const andWhere: Prisma.InvoiceWhereInput[] = [];
    const take = Math.min(Math.max(Number(query.take || 100), 1), 200);

    if (query.status) {
      if (!Object.values(InvoiceStatus).includes(query.status)) {
        throw new BadRequestException("Estado de factura invalido");
      }
      andWhere.push({ status: query.status });
    }

    if (query.paymentStatus) {
      if (!Object.values(InvoicePaymentStatus).includes(query.paymentStatus)) {
        throw new BadRequestException("Estado de pago invalido");
      }
      andWhere.push({ paymentStatus: query.paymentStatus });
    }

    if (query.customerIdentification) {
      andWhere.push({
        customerIdentification: {
          contains: query.customerIdentification,
          mode: "insensitive",
        },
      });
    }

    if (query.invoiceNumber) {
      andWhere.push({
        invoiceNumber: {
          contains: query.invoiceNumber,
          mode: "insensitive",
        },
      });
    }

    if (query.from || query.to) {
      const issueDate: Prisma.DateTimeFilter = {};

      if (query.from) {
        const from = new Date(query.from);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestException("Fecha from invalida");
        }
        issueDate.gte = from;
      }

      if (query.to) {
        const to = new Date(query.to);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestException("Fecha to invalida");
        }
        issueDate.lte = to;
      }

      andWhere.push({ issueDate });
    }

    return this.prisma.invoice.findMany({
      where: andWhere.length ? { AND: andWhere } : {},
      include: this.includeRelations(),
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  private async findAuditLogs(invoiceId: number) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: "Invoice",
        entityId: String(invoiceId),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findOne(
    id: number,
    actor: InvoiceActor,
    options: { recordView?: boolean } = { recordView: true }
  ) {
    this.assertSuperAdmin(actor);
    this.assertValidId(id, "Factura");

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    if (options.recordView !== false) {
      await this.audit.record({
        actor,
        action: "INVOICE_DETAIL_VIEWED",
        entityType: "Invoice",
        entityId: invoice.id,
        message: "Detalle de factura consultado",
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          bookingId: invoice.bookingId,
        },
      });
    }

    const auditLogs = await this.findAuditLogs(invoice.id);

    return {
      ...invoice,
      auditLogs,
    };
  }

  async createFromBooking(bookingId: number, actor: InvoiceActor) {
    this.assertSuperAdmin(actor);
    this.assertValidId(bookingId, "bookingId");

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        preReservation: true,
        invoices: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        "Solo se puede crear factura desde Booking CONFIRMED"
      );
    }

    const existing = booking.invoices[0];
    if (existing) {
      await this.audit.record({
        actor,
        action: "INVOICE_DUPLICATE_ATTEMPT",
        entityType: "Invoice",
        entityId: existing.id,
        message: "Intento de duplicar factura interna para la misma reserva",
        metadata: {
          invoiceNumber: existing.invoiceNumber,
          bookingId: booking.id,
          preReservationId: booking.preReservationId,
        },
      });

      return this.findOne(existing.id, actor, { recordView: false });
    }

    const pre = booking.preReservation;
    const total = Number(pre?.totalCop ?? booking.totalPrice ?? 0);
    if (!total || total <= 0) {
      throw new BadRequestException("La reserva no tiene total valido");
    }

    const taxes = Number(pre?.taxCop ?? booking.taxesAmount ?? 0);
    const discounts = Number(pre?.discountCop ?? booking.discountAmount ?? 0);
    const subtotal = Number(
      pre?.subtotalCop ?? Math.max(total - taxes + discounts, 0)
    );
    const displayCurrency = pre?.displayCurrency || "COP";
    const displayTotal =
      pre?.displayTotal !== null && pre?.displayTotal !== undefined
        ? Number(pre.displayTotal)
        : total;
    const exchangeRate = Number(pre?.exchangeRate || 1);
    const exchangeRateSource = pre?.exchangeRateSource || "SYSTEM";
    const exchangeRateDate = pre?.exchangeRateDate || new Date();
    const displayNote =
      displayCurrency !== "COP"
        ? ` Referencia visual: ${displayCurrency} ${displayTotal}. Tasa usada: ${exchangeRate} COP.`
        : "";
    const invoiceNumber = await this.createInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId: booking.id,
        preReservationId: booking.preReservationId,
        customerName:
          booking.billingCustomerName ||
          booking.customerName ||
          booking.preReservation?.customerName ||
          "Cliente",
        customerEmail:
          booking.billingEmail ||
          booking.customerEmail ||
          booking.preReservation?.email ||
          "sin-correo@cartagenatailoredtravel.local",
        customerPhone:
          booking.billingPhone ||
          booking.customerPhone ||
          booking.preReservation?.customerPhone,
        customerIdentification:
          booking.billingIdentificationNumber ||
          booking.preReservation?.billingIdentificationNumber,
        subtotal,
        taxes,
        discounts,
        total,
        currency: "COP",
        subtotalCop: subtotal,
        taxCop: taxes,
        discountCop: discounts,
        totalCop: total,
        displayCurrency,
        displayTotal,
        exchangeRate,
        exchangeRateSource,
        exchangeRateDate,
        status: InvoiceStatus.GENERATED,
        paymentStatus: InvoicePaymentStatus.UNPAID,
        provider: "INTERNAL",
        mode: "demo",
        pdfUrl: booking.invoicePath,
        notes:
          `Factura interna generada desde reserva. No es factura electronica DIAN. Los valores fiscales estan expresados en COP.${displayNote}`,
      },
      include: this.includeRelations(),
    });

    await this.audit.record({
      actor,
      action: "INVOICE_GENERATED",
      entityType: "Invoice",
      entityId: invoice.id,
      message: "Factura interna generada desde reserva confirmada",
      newValue: {
        invoiceNumber: invoice.invoiceNumber,
        bookingId: booking.id,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        total: invoice.total,
        totalCop: invoice.totalCop,
        displayCurrency: invoice.displayCurrency,
        displayTotal: invoice.displayTotal,
      },
      metadata: {
        bookingId: booking.id,
        preReservationId: booking.preReservationId,
      },
    });

    await this.audit.record({
      actor,
      action: "INVOICE_COP_GENERATED",
      entityType: "Invoice",
      entityId: invoice.id,
      message: "Factura interna generada con valores fiscales en COP",
      newValue: {
        invoiceNumber: invoice.invoiceNumber,
        subtotalCop: invoice.subtotalCop,
        taxCop: invoice.taxCop,
        discountCop: invoice.discountCop,
        totalCop: invoice.totalCop,
        currency: invoice.currency,
        displayCurrency: invoice.displayCurrency,
        displayTotal: invoice.displayTotal,
        exchangeRate: invoice.exchangeRate,
        exchangeRateSource: invoice.exchangeRateSource,
        exchangeRateDate: invoice.exchangeRateDate,
      },
      metadata: {
        bookingId: booking.id,
        preReservationId: booking.preReservationId,
      },
    });

    const factusPayload = buildFactusInvoicePayload({
      invoiceNumber: invoice.invoiceNumber,
      reservationCode: booking.reservationCode,
      productName: booking.productName,
      subtotalCop: invoice.subtotalCop,
      taxCop: invoice.taxCop,
      discountCop: invoice.discountCop,
      totalCop: invoice.totalCop,
      displayCurrency: invoice.displayCurrency,
      displayTotal: invoice.displayTotal,
      exchangeRate: invoice.exchangeRate,
      exchangeRateSource: invoice.exchangeRateSource,
      exchangeRateDate: invoice.exchangeRateDate,
      selectedExtras: booking.selectedExtras,
      billingIdentificationNumber:
        booking.billingIdentificationNumber ||
        booking.preReservation?.billingIdentificationNumber,
      billingCustomerName:
        booking.billingCustomerName ||
        booking.customerName ||
        booking.preReservation?.billingCustomerName ||
        booking.preReservation?.customerName,
      billingEmail:
        booking.billingEmail ||
        booking.customerEmail ||
        booking.preReservation?.billingEmail ||
        booking.preReservation?.email,
      billingPhone:
        booking.billingPhone ||
        booking.customerPhone ||
        booking.preReservation?.billingPhone ||
        booking.preReservation?.customerPhone,
      billingLegalOrganizationType:
        booking.billingLegalOrganizationType ||
        booking.preReservation?.billingLegalOrganizationType,
      billingIdentificationDocumentType:
        booking.billingIdentificationDocumentType ||
        booking.preReservation?.billingIdentificationDocumentType,
      billingMunicipalityId:
        booking.billingMunicipalityId ||
        booking.preReservation?.billingMunicipalityId,
      billingTributeId:
        booking.billingTributeId ||
        booking.preReservation?.billingTributeId,
      billingAddress:
        booking.billingAddress ||
        booking.preReservation?.billingAddress,
    });

    await this.audit.record({
      actor,
      action: "FACTUS_COP_PAYLOAD_PREPARED",
      entityType: "Invoice",
      entityId: invoice.id,
      message: "Payload futuro Factus preparado en COP sin envio externo",
      metadata: {
        referenceCode: factusPayload.reference_code,
        currency: factusPayload.currency,
        subtotal: factusPayload.subtotal,
        tax: factusPayload.tax,
        discount: factusPayload.discount,
        total: factusPayload.total,
        observation: factusPayload.observation,
      },
    });

    return invoice;
  }

  async updateStatus(id: number, status: InvoiceStatus, actor: InvoiceActor) {
    this.assertSuperAdmin(actor);
    this.assertValidId(id, "Factura");

    if (!Object.values(InvoiceStatus).includes(status)) {
      throw new BadRequestException("Estado de factura invalido");
    }

    const exists = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paidAt: true,
        cancelledAt: true,
      },
    });

    if (!exists) {
      throw new NotFoundException("Factura no encontrada");
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        lastStatusChangeAt: new Date(),
        paidAt: status === InvoiceStatus.PAID ? new Date() : undefined,
        cancelledAt: status === InvoiceStatus.CANCELLED ? new Date() : undefined,
      },
      include: this.includeRelations(),
    });

    const action =
      status === InvoiceStatus.PAID
        ? "INVOICE_MARKED_PAID"
        : status === InvoiceStatus.CANCELLED
          ? "INVOICE_CANCELLED"
          : "INVOICE_STATUS_UPDATED";

    await this.audit.record({
      actor,
      action,
      entityType: "Invoice",
      entityId: id,
      message:
        status === InvoiceStatus.PAID
          ? "Factura marcada como pagada"
          : status === InvoiceStatus.CANCELLED
            ? "Factura cancelada"
            : "Estado de factura actualizado",
      previousValue: {
        status: exists.status,
        paidAt: exists.paidAt,
        cancelledAt: exists.cancelledAt,
      },
      newValue: {
        status: updated.status,
        paidAt: updated.paidAt,
        cancelledAt: updated.cancelledAt,
      },
    });

    return updated;
  }

  async updatePaymentStatus(
    id: number,
    paymentStatus: InvoicePaymentStatus,
    actor: InvoiceActor
  ) {
    this.assertSuperAdmin(actor);
    this.assertValidId(id, "Factura");

    if (!Object.values(InvoicePaymentStatus).includes(paymentStatus)) {
      throw new BadRequestException("Estado de pago invalido");
    }

    const exists = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        paymentStatus: true,
      },
    });

    if (!exists) {
      throw new NotFoundException("Factura no encontrada");
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus,
      },
      include: this.includeRelations(),
    });

    await this.audit.record({
      actor,
      action: "INVOICE_PAYMENT_STATUS_UPDATED",
      entityType: "Invoice",
      entityId: id,
      message: "Estado de pago de factura actualizado",
      previousValue: {
        paymentStatus: exists.paymentStatus,
      },
      newValue: {
        paymentStatus: updated.paymentStatus,
      },
    });

    return updated;
  }
}
