import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import Stripe from "stripe";
import { Request } from "express";
import { createHash } from "crypto";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";
import { PreReservationsService } from "../pre-reservations/pre-reservations.service";
import { InvoiceService } from "../invoice/invoice.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../common/audit.service";
import { EmailService } from "../email/email.service";
import {
  AvailabilitySource,
  BookingStatus,
  BookingType,
  PaymentStatus,
  PreReservationStatus,
  Role,
} from "@prisma/client";

type PaymentActor = {
  userId: number;
  role: string;
};

@Injectable()
export class PaymentsService {
  // 🔥 IMPORTANTE: usar any para evitar conflictos de tipos de Stripe
  private stripe: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly preReservationsService: PreReservationsService,
    private readonly invoiceService: InvoiceService,
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService
  ) {
    this.stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY || "sk_test_disabled",
      {
        // 🔥 FIX: evitar error de versión de API
        apiVersion: "2024-06-20" as any,
      }
    );
  }

  private getWompiBaseUrl() {
    return (
      process.env.WOMPI_BASE_URL ||
      "https://sandbox.wompi.co"
    ).replace(/\/$/, "");
  }

  private isRealPaymentsEnabled() {
    return process.env.ENABLE_REAL_PAYMENTS === "true";
  }

  private getWompiPrivateKey() {
    const privateKey = process.env.WOMPI_PRIVATE_KEY;

    if (!privateKey) {
      throw new BadRequestException("Missing WOMPI_PRIVATE_KEY");
    }

    return privateKey;
  }

  private getWompiLinkUrl(paymentLinkId: string) {
    return `https://checkout.wompi.co/l/${paymentLinkId}`;
  }

  private createWompiReference(preReservationId: string) {
    return `PR-${preReservationId.slice(0, 8).toUpperCase()}-${Date.now()}`;
  }

  private toWompiAmountInCents(amount: number) {
    return Math.round(amount * 100);
  }

  private resolvePath(source: any, path: string) {
    return path.split(".").reduce((acc, key) => {
      if (acc === undefined || acc === null) return undefined;

      return acc[key];
    }, source);
  }

  private verifyWompiEvent(payload: any, headerChecksum?: string) {
    const secret = process.env.WOMPI_EVENTS_SECRET;

    if (!secret) {
      throw new BadRequestException("Missing WOMPI_EVENTS_SECRET");
    }

    const properties = payload?.signature?.properties;
    const checksum =
      headerChecksum ||
      payload?.signature?.checksum;

    if (!Array.isArray(properties) || !checksum) {
      throw new BadRequestException("Firma Wompi invalida");
    }

    const dataSignature = properties
      .map((property) => {
        const value = this.resolvePath(payload.data, property);

        if (value === undefined || value === null) return "";

        return String(value);
      })
      .join("");
    const expected = createHash("sha256")
      .update(`${dataSignature}${payload.timestamp}${secret}`)
      .digest("hex")
      .toUpperCase();

    if (expected !== String(checksum).toUpperCase()) {
      throw new BadRequestException("Firma Wompi invalida");
    }
  }

  private mapWompiStatus(status?: string): PaymentStatus {
    if (status === "APPROVED") return PaymentStatus.APPROVED;

    if (
      status === "DECLINED" ||
      status === "VOIDED" ||
      status === "ERROR"
    ) {
      return PaymentStatus.FAILED;
    }

    return PaymentStatus.PENDING;
  }

  // ===============================
  // 🔥 CREATE PAYMENT INTENT
  // ===============================
  async createPaymentIntent(preReservationId: string) {
    throw new BadRequestException(
      "Stripe Checkout esta deshabilitado para el flujo asistido. Usa Wompi desde PAYMENT_PENDING."
    );

    /*

    const pre = await this.prisma.preReservation.findUnique({
      where: { id: preReservationId },
    });

    if (!pre) {
      throw new BadRequestException("Pre-reserva no encontrada");
    }

    if (!pre.totalEstimate || pre.totalEstimate <= 0) {
      throw new BadRequestException("Total inválido");
    }

    const paymentIntent =
      await this.stripe.paymentIntents.create({
        amount: Math.round(pre.totalEstimate * 100),
        currency: "usd",

        // 🔥 moderno (reemplaza payment_method_types)
        automatic_payment_methods: {
          enabled: true,
        },

        metadata: {
          preReservationId: pre.id,
        },
      });

    return {
      clientSecret: paymentIntent.client_secret,
    };
    */
  }

  async createWompiPaymentLink(
    preReservationId: string,
    actor: PaymentActor
  ) {
    if (!this.isRealPaymentsEnabled()) {
      throw new BadRequestException(
        "Pago real pendiente de integración. Usa confirmación manual por ahora."
      );
    }

    const pre = await this.prisma.preReservation.findUnique({
      where: { id: preReservationId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pre) {
      throw new NotFoundException("Pre-reserva no encontrada");
    }

    if (
      actor.role !== "SUPERADMIN" &&
      pre.assignedToId !== actor.userId
    ) {
      throw new ForbiddenException(
        "Solo el asesor asignado o el superadmin pueden generar el link"
      );
    }

    if (pre.status !== PreReservationStatus.PAYMENT_PENDING) {
      throw new BadRequestException(
        "La solicitud debe estar en PAYMENT_PENDING para generar pago"
      );
    }

    const amount = Number(
      pre.totalCop ??
      pre.finalTotal ??
      pre.totalEstimate ??
      pre.totalPrice
    );

    if (!amount || amount <= 0) {
      throw new BadRequestException("La solicitud no tiene total final valido");
    }

    if (!pre.email && !pre.customerPhone) {
      throw new BadRequestException(
        "La solicitud debe tener correo o telefono del cliente"
      );
    }

    if (!pre.assignedToId) {
      throw new BadRequestException(
        "La solicitud debe tener asesor asignado"
      );
    }

    const existingPending = pre.payments.find(
      (payment) =>
        payment.provider === "WOMPI" &&
        payment.status === PaymentStatus.PENDING &&
        payment.paymentLinkUrl
    );

    if (existingPending) {
      void this.emailService
        .sendPaymentLink(pre.id, existingPending.id, actor)
        .catch(() => undefined);
      return {
        reused: true,
        payment: existingPending,
      };
    }

    const wompiReference = this.createWompiReference(pre.id);
    const currency = "COP";
    const amountInCents = this.toWompiAmountInCents(amount);
    const baseUrl = this.getWompiBaseUrl();
    const privateKey = this.getWompiPrivateKey();
    const productName =
      pre.items[0]?.name ||
      `Solicitud ${pre.id}`;

    const response = await fetch(`${baseUrl}/v1/payment_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${privateKey}`,
      },
      body: JSON.stringify({
        name: `Reserva Cartagena ${pre.id.slice(0, 8)}`,
        description: `Pago asistido para ${productName}`,
        single_use: true,
        collect_shipping: false,
        currency,
        amount_in_cents: amountInCents,
        sku: wompiReference,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new BadRequestException({
        message: "No se pudo crear link de pago Wompi",
        wompi: payload,
      });
    }

    const paymentLinkId = payload?.data?.id;

    if (!paymentLinkId) {
      throw new BadRequestException(
        "Wompi no retorno id del link de pago"
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        amount,
        amountCop: amount,
        currency,
        displayCurrency: pre.displayCurrency || "COP",
        displayAmount: pre.displayTotal ?? amount,
        exchangeRate: pre.exchangeRate || 1,
        exchangeRateSource: pre.exchangeRateSource || "SYSTEM",
        exchangeRateDate: pre.exchangeRateDate || new Date(),
        paymentMethod: pre.paymentMethodPreferred || "CARD",
        provider: "WOMPI",
        paymentProvider: "WOMPI",
        status: PaymentStatus.PENDING,
        providerReference: wompiReference,
        providerStatus: "PENDING",
        wompiReference,
        wompiPaymentLinkId: paymentLinkId,
        paymentLinkUrl: this.getWompiLinkUrl(paymentLinkId),
        preReservationId: pre.id,
      },
    });

    await this.audit.record({
      actor,
      action: "WOMPI_PAYMENT_LINK_CREATED",
      entityType: "PreReservation",
      entityId: pre.id,
      metadata: {
        paymentId: payment.id,
        amount,
        amountCop: amount,
        currency,
        displayCurrency: pre.displayCurrency || "COP",
        exchangeRate: pre.exchangeRate || 1,
        wompiReference,
      },
    });

    await this.audit.record({
      actor,
      action: "PAYMENT_CURRENCY_SAVED",
      entityType: "Payment",
      entityId: payment.id,
      message: "Trazabilidad monetaria del pago guardada en COP",
      newValue: {
        amountCop: payment.amountCop,
        currency: payment.currency,
        displayCurrency: payment.displayCurrency,
        displayAmount: payment.displayAmount,
        exchangeRate: payment.exchangeRate,
        exchangeRateSource: payment.exchangeRateSource,
        exchangeRateDate: payment.exchangeRateDate,
        paymentMethod: payment.paymentMethod,
        paymentProvider: payment.paymentProvider,
        providerReference: payment.providerReference,
        providerStatus: payment.providerStatus,
      },
      metadata: {
        preReservationId: pre.id,
        wompiReference,
      },
    });

    void this.emailService
      .sendPaymentLink(pre.id, payment.id, actor)
      .catch(() => undefined);

    return {
      reused: false,
      payment,
    };
  }

  private getExtrasSnapshot(extras: any) {
    return Array.isArray(extras) ? extras : [];
  }

  private async ensureCustomerUser(pre: any) {
    const password = await bcrypt.hash(
      `wompi-${pre.id}-${pre.email}`,
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

  private async ensureInvoice(data: {
    bookingId: number;
    paymentId: number;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        payments: true,
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

    let invoicePath = booking.invoicePath;

    if (!invoicePath) {
      const companySettings =
        await this.prisma.companySettings.upsert({
          where: { id: 1 },
          update: {},
          create: {
            id: 1,
            companyName: "Cartagena Tailored Travel",
          },
        });

      invoicePath = await this.invoiceService.generateBookingInvoice({
        bookingId: booking.id,
        preReservationId: booking.preReservationId || "",
        companyName: companySettings.companyName,
        companyLegalId:
          companySettings.legalId ||
          companySettings.legalInfo ||
          undefined,
        customerName: booking.customerName || "Cliente",
        customerEmail: booking.customerEmail || "",
        customerPhone: booking.customerPhone,
        productName: booking.productName || `Producto #${booking.referenceId}`,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        extras: this.getExtrasSnapshot(booking.selectedExtras),
        subtotal: booking.totalPrice,
        taxesAmount: booking.taxesAmount,
        discountAmount: booking.discountAmount,
        total: booking.totalPrice,
        currency: booking.payments[0]?.currency || "COP",
        paymentMethod: booking.paymentMethod || "Wompi",
        advisorName:
          booking.advisorName ||
          booking.preReservation?.assignedTo?.name,
        paymentStatus: "PAGADO",
      });

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { invoicePath },
      });
    }

    return {
      bookingId: booking.id,
      invoicePath,
    };
  }

  private async confirmApprovedWompiPayment(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        preReservation: {
          include: {
            items: true,
            assignedTo: true,
            booking: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Pago no encontrado");
    }

    if (payment.status !== PaymentStatus.APPROVED) {
      return { confirmed: false };
    }

    const pre = payment.preReservation;

    if (!pre) {
      return { confirmed: false, ignored: true };
    }

    if (pre.booking) {
      if (!payment.bookingId) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { bookingId: pre.booking.id },
        });
      }

      const invoice = await this.ensureInvoice({
        bookingId: pre.booking.id,
        paymentId: payment.id,
      });

      const notifications =
        await this.notificationsService.sendFinalBookingNotifications(
          pre.booking.id
        );

      return {
        confirmed: true,
        idempotent: true,
        bookingId: pre.booking.id,
        invoicePath: invoice.invoicePath,
        notifications,
      };
    }

    const item = pre.items[0];

    if (!item || !pre.checkIn || !pre.checkOut) {
      throw new BadRequestException(
        "La pre-reserva no tiene producto o fechas validas"
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
        "La pre-reserva no tiene total final valido"
      );
    }

    const user = await this.ensureCustomerUser(pre);

    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { preReservationId: pre.id },
      });

      if (existing) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { bookingId: existing.id },
        });

        return existing;
      }

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
          "La disponibilidad cambio antes de confirmar el pago. Requiere revision manual."
        );
      }

      await tx.preReservation.update({
        where: { id: pre.id },
        data: { status: PreReservationStatus.PAID },
      });

      const created = await tx.booking.create({
        data: {
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
          paymentMethod: "Wompi",
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

      await tx.payment.update({
        where: { id: payment.id },
        data: { bookingId: created.id },
      });

      await tx.preReservation.update({
        where: { id: pre.id },
        data: { status: PreReservationStatus.CONFIRMED },
      });

      return created;
    });

    const invoice = await this.ensureInvoice({
      bookingId: booking.id,
      paymentId: payment.id,
    });
    const notifications =
      await this.notificationsService.sendFinalBookingNotifications(
        booking.id
      );

    return {
      confirmed: true,
      idempotent: false,
      bookingId: booking.id,
      invoicePath: invoice.invoicePath,
      notifications,
    };
  }

  async handleWompiWebhook(
    payload: any,
    checksum?: string
  ) {
    this.verifyWompiEvent(payload, checksum);

    if (payload?.event !== "transaction.updated") {
      return { received: true };
    }

    const transaction = payload?.data?.transaction;

    if (!transaction) {
      throw new BadRequestException("Transaccion Wompi no encontrada");
    }

    const status = this.mapWompiStatus(transaction.status);
    const amount =
      transaction.amount_in_cents !== undefined
        ? Number(transaction.amount_in_cents) / 100
        : undefined;
    const paymentLookup = [
      transaction.payment_link_id
        ? { wompiPaymentLinkId: transaction.payment_link_id }
        : undefined,
      transaction.reference
        ? { wompiReference: transaction.reference }
        : undefined,
    ].filter(Boolean) as any[];

    if (paymentLookup.length === 0) {
      return { received: true, ignored: true };
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: "WOMPI",
        OR: paymentLookup,
      },
    });

    if (!payment) {
      return { received: true, ignored: true };
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        amount: amount ?? payment.amount,
        amountCop: amount ?? payment.amountCop ?? payment.amount,
        currency: "COP",
        providerStatus: transaction.status || payment.providerStatus,
        providerTransactionId:
          transaction.id || payment.providerTransactionId,
        providerReference:
          transaction.reference || payment.providerReference,
        paidAt:
          status === PaymentStatus.APPROVED
            ? new Date()
            : payment.paidAt,
        rawProviderResponse: payload,
        wompiTransactionId:
          transaction.id || payment.wompiTransactionId,
      },
    });

    if (status === PaymentStatus.APPROVED) {
      const confirmation =
        await this.confirmApprovedWompiPayment(updatedPayment.id);

      await this.audit.record({
        action: "WOMPI_PAYMENT_APPROVED",
        entityType: "Payment",
        entityId: updatedPayment.id,
        metadata: {
          preReservationId: updatedPayment.preReservationId,
          bookingId: (confirmation as any)?.bookingId,
          wompiTransactionId: updatedPayment.wompiTransactionId,
        },
      });

      return {
        received: true,
        confirmation,
      };
    }

    return { received: true };
  }

  // ===============================
  // 🔥 STRIPE WEBHOOK
  // ===============================
  async handleWebhook(
    req: Request,
    signature: string
  ) {
    throw new BadRequestException(
      "El webhook Stripe heredado esta deshabilitado para evitar confirmaciones fuera de Wompi."
    );

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestException(
        "Missing STRIPE_WEBHOOK_SECRET"
      );
    }

    // 🔥 FIX: evitar tipos rotos de Stripe
    let event: any;

    try {
      event =
        this.stripe.webhooks.constructEvent(
          (req as any).rawBody ||
          JSON.stringify(req.body),
          signature,
          webhookSecret
        );
    } catch (error: any) {
      throw new BadRequestException(
        `Webhook Error: ${error.message}`
      );
    }

    // ===============================
    // 🔥 PAYMENT SUCCEEDED
    // ===============================
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;

      const preReservationId =
        paymentIntent.metadata?.preReservationId;

      if (!preReservationId) {
        throw new BadRequestException("Missing preReservationId");
      }

      // 🧠 🔴 IDPOTENCIA (AQUÍ VA)
      const existing = await this.prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      if (existing) {
        // 🔁 Stripe reintentó webhook → ignoramos
        return { received: true };
      }

      // 🔥 marcar items como pagados
      await this.prisma.preReservationItem.updateMany({
        where: { preReservationId },
        data: { paid: true },
      });

      // 🔒 confirmar reserva (tu lógica con transaction)
      const bookings =
        await this.preReservationsService.confirmPreReservation(
          preReservationId,
          1 // luego auth real
        );

      const booking = bookings[0];

      if (!booking) {
        throw new BadRequestException("No se pudo crear la reserva");
      }

      await this.prisma.payment.create({
        data: {
          amount: paymentIntent.amount / 100,
          amountCop: paymentIntent.amount / 100,
          status: "PAID",
          currency: "COP",
          displayCurrency: "COP",
          displayAmount: paymentIntent.amount / 100,
          exchangeRate: 1,
          exchangeRateSource: "LEGACY_STRIPE",
          exchangeRateDate: new Date(),
          paymentMethod: "CARD",
          provider: "STRIPE",
          paymentProvider: "STRIPE",
          providerTransactionId: paymentIntent.id,
          providerStatus: "PAID",
          paidAt: new Date(),
          rawProviderResponse: paymentIntent,
          stripePaymentIntentId: paymentIntent.id,
          bookingId: booking.id,
        },
      });
    }

    return { received: true };
  }
}
