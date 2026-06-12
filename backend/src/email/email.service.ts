import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingType, EmailEntityType, EmailStatus, PreReservationStatus } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailLogService } from "./email-log.service";
import { emailStatusLabel, normalizeEmailLocale, renderEmailTemplate } from "./email.templates";
import {
  EmailTemplateKey,
  ReservationEmailContext,
  SendReservationEmailOptions,
} from "./email.types";

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly logs: EmailLogService,
    private readonly audit: AuditService
  ) {}

  shouldSendEmailForStatusChange(oldStatus?: string | null, newStatus?: string | null) {
    if (!newStatus || oldStatus === newStatus) return false;
    const notifiableStatuses: string[] = [
      PreReservationStatus.VALIDATING,
      PreReservationStatus.AVAILABLE,
      PreReservationStatus.UNAVAILABLE,
      PreReservationStatus.PAYMENT_PENDING,
      PreReservationStatus.CANCELLED,
    ];
    return notifiableStatuses.includes(newStatus);
  }

  async sendPreReservationCreated(preReservationId: string, actor?: any) {
    const pre = await this.getPreReservation(preReservationId);
    const context = await this.buildReservationEmailContext({ pre });
    const results: any[] = [];

    results.push(
      await this.sendReservationEmail({
        templateKey: "PRERESERVATION_CREATED_CUSTOMER",
        to: pre.email,
        locale: pre.locale,
        context,
        entityType: EmailEntityType.PRERESERVATION,
        entityId: pre.id,
        preReservationId: pre.id,
        actor,
      })
    );

    for (const recipient of this.adminRecipients(pre.assignedTo?.email)) {
      results.push(
        await this.sendReservationEmail({
          templateKey: "PRERESERVATION_CREATED_ADMIN",
          to: recipient,
          locale: "es",
          context,
          entityType: EmailEntityType.PRERESERVATION,
          entityId: pre.id,
          preReservationId: pre.id,
          actor,
        })
      );
    }

    return results;
  }

  async sendPreReservationStatusChanged(
    preReservationId: string,
    oldStatus?: string | null,
    actor?: any,
    resend = false
  ) {
    const pre = await this.getPreReservation(preReservationId);
    if (!resend && !this.shouldSendEmailForStatusChange(oldStatus, pre.status)) {
      return { status: "skipped", reason: "Estado sin correo transaccional" };
    }

    const templateKey =
      pre.status === PreReservationStatus.CANCELLED
        ? "PRERESERVATION_CANCELLED"
        : "PRERESERVATION_STATUS_CHANGED";
    return this.sendReservationEmail({
      templateKey,
      to: pre.email,
      locale: pre.locale,
      context: await this.buildReservationEmailContext({ pre }),
      entityType: EmailEntityType.PRERESERVATION,
      entityId: pre.id,
      preReservationId: pre.id,
      resend,
      actor,
    });
  }

  async sendPaymentLink(preReservationId: string, paymentId?: number, actor?: any, resend = false) {
    const pre = await this.getPreReservation(preReservationId);
    const payment = paymentId
      ? await this.prisma.payment.findUnique({ where: { id: paymentId } })
      : await this.prisma.payment.findFirst({
          where: { preReservationId, paymentLinkUrl: { not: null } },
          orderBy: { createdAt: "desc" },
        });

    if (!payment?.paymentLinkUrl) {
      throw new BadRequestException("La pre-reserva no tiene link de pago disponible");
    }

    return this.sendReservationEmail({
      templateKey: "PRERESERVATION_PAYMENT_LINK",
      to: pre.email,
      locale: pre.locale,
      context: await this.buildReservationEmailContext({ pre, paymentLink: payment.paymentLinkUrl }),
      entityType: EmailEntityType.PAYMENT,
      entityId: payment.id,
      preReservationId: pre.id,
      resend,
      actor,
    });
  }

  async sendBookingConfirmed(bookingId: number, actor?: any, resend = false) {
    const booking = await this.getBooking(bookingId);
    const context = await this.buildReservationEmailContext({ pre: booking.preReservation, booking });
    const results: any[] = [];

    if (booking.customerEmail) {
      results.push(
        await this.sendReservationEmail({
          templateKey: "BOOKING_CONFIRMED_CUSTOMER",
          to: booking.customerEmail,
          locale: booking.preReservation?.locale,
          context,
          entityType: EmailEntityType.BOOKING,
          entityId: booking.id,
          preReservationId: booking.preReservationId,
          bookingId: booking.id,
          attachments: booking.invoicePath
            ? [{ filename: `${booking.reservationCode || `reserva-${booking.id}`}.pdf`, path: booking.invoicePath }]
            : undefined,
          resend,
          actor,
        })
      );
    }

    for (const recipient of this.adminRecipients(booking.preReservation?.assignedTo?.email)) {
      results.push(
        await this.sendReservationEmail({
          templateKey: "BOOKING_CONFIRMED_ADMIN",
          to: recipient,
          locale: "es",
          context,
          entityType: EmailEntityType.BOOKING,
          entityId: booking.id,
          preReservationId: booking.preReservationId,
          bookingId: booking.id,
          resend,
          actor,
        })
      );
    }

    if (results.some((item: any) => item.status === "sent")) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { confirmationEmailSentAt: new Date(), notificationLastError: null },
      });
    }

    return results;
  }

  async sendCancellation(preReservationId: string, actor?: any, resend = false) {
    const pre = await this.getPreReservation(preReservationId);
    const context = await this.buildReservationEmailContext({ pre, booking: pre.booking });
    const results = [
      await this.sendReservationEmail({
        templateKey: "PRERESERVATION_CANCELLED",
        to: pre.email,
        locale: pre.locale,
        context,
        entityType: EmailEntityType.PRERESERVATION,
        entityId: pre.id,
        preReservationId: pre.id,
        bookingId: pre.booking?.id,
        resend,
        actor,
      }),
    ];

    for (const recipient of this.adminRecipients(pre.assignedTo?.email)) {
      results.push(
        await this.sendReservationEmail({
          templateKey: "PRERESERVATION_CANCELLED",
          to: recipient,
          locale: "es",
          context,
          entityType: EmailEntityType.PRERESERVATION,
          entityId: pre.id,
          preReservationId: pre.id,
          bookingId: pre.booking?.id,
          resend,
          actor,
        })
      );
    }

    return results;
  }

  async sendReviewRequest(bookingId: number, reviewLink: string, actor?: any, resend = false) {
    const booking = await this.getBooking(bookingId);
    if (!booking.customerEmail) {
      return { status: "skipped", reason: "Reserva sin correo" };
    }

    return this.sendReservationEmail({
      templateKey: "REVIEW_REQUEST_CUSTOMER",
      to: booking.customerEmail,
      locale: booking.preReservation?.locale,
      context: await this.buildReservationEmailContext({
        pre: booking.preReservation,
        booking,
        reviewLink,
      }),
      entityType: EmailEntityType.REVIEW,
      entityId: booking.id,
      preReservationId: booking.preReservationId,
      bookingId: booking.id,
      resend,
      actor,
    });
  }

  async listLogsForPreReservation(preReservationId: string) {
    return this.prisma.emailLog.findMany({
      where: { preReservationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async resendPreReservationEmail(
    preReservationId: string,
    templateKey: EmailTemplateKey,
    actor?: any
  ) {
    if (templateKey === "PRERESERVATION_CREATED_CUSTOMER") {
      const pre = await this.getPreReservation(preReservationId);
      return this.sendReservationEmail({
        templateKey,
        to: pre.email,
        locale: pre.locale,
        context: await this.buildReservationEmailContext({ pre }),
        entityType: EmailEntityType.PRERESERVATION,
        entityId: pre.id,
        preReservationId: pre.id,
        resend: true,
        actor,
      });
    }

    if (templateKey === "PRERESERVATION_PAYMENT_LINK") {
      return this.sendPaymentLink(preReservationId, undefined, actor, true);
    }

    if (templateKey === "BOOKING_CONFIRMED_CUSTOMER") {
      const pre = await this.getPreReservation(preReservationId);
      if (!pre.booking?.id) throw new BadRequestException("La solicitud no tiene reserva confirmada");
      return this.sendBookingConfirmed(pre.booking.id, actor, true);
    }

    if (templateKey === "REVIEW_REQUEST_CUSTOMER") {
      throw new BadRequestException("Usa la accion de opiniones para reenviar solicitud de resena");
    }

    return this.sendPreReservationStatusChanged(preReservationId, null, actor, true);
  }

  private async sendReservationEmail(options: SendReservationEmailOptions) {
    const to = this.cleanEmail(options.to);
    if (!to || !this.isValidEmail(to)) {
      return { status: "skipped", reason: "Correo invalido", to: options.to };
    }

    if (!options.resend) {
      const duplicate = await this.logs.findDuplicate({
        templateKey: options.templateKey,
        entityType: options.entityType,
        entityId: options.entityId,
        to,
      });
      if (duplicate) {
        return { status: "already-sent", logId: duplicate.id, sentAt: duplicate.sentAt };
      }
    }

    const rendered = renderEmailTemplate(
      options.templateKey,
      this.sanitizeContext(options.context),
      options.locale
    );
    const log = await this.logs.createPending({
      to,
      cc: options.cc,
      bcc: options.bcc,
      subject: rendered.subject,
      templateKey: options.templateKey,
      provider: process.env.EMAIL_PROVIDER || "smtp",
      entityType: options.entityType,
      entityId: options.entityId,
      preReservationId: options.preReservationId,
      bookingId: options.bookingId,
    });

    await this.audit.record({
      actor: options.actor,
      action: "EMAIL_SEND_REQUESTED",
      entityType: "EmailLog",
      entityId: log.id,
      metadata: { templateKey: options.templateKey, to, entityType: options.entityType },
    });

    try {
      const result = await this.mail.sendRaw({
        to,
        cc: options.cc,
        bcc: options.bcc,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: options.attachments,
      });

      if ((result as any)?.skipped) {
        await this.logs.mark(log.id, EmailStatus.SKIPPED, (result as any).reason || "Correo deshabilitado");
        await this.audit.record({
          actor: options.actor,
          action: "EMAIL_SKIPPED",
          entityType: "EmailLog",
          entityId: log.id,
          metadata: { templateKey: options.templateKey, reason: (result as any).reason },
        });
        return { status: "skipped", logId: log.id, reason: (result as any).reason };
      }

      await this.logs.mark(log.id, EmailStatus.SENT);
      await this.audit.record({
        actor: options.actor,
        action: options.resend ? "EMAIL_RESENT" : "EMAIL_SENT",
        entityType: "EmailLog",
        entityId: log.id,
        metadata: { templateKey: options.templateKey, to },
      });
      await this.auditSpecific(options, log.id);
      return { status: "sent", logId: log.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email error";
      await this.logs.mark(log.id, EmailStatus.FAILED, message);
      await this.audit.record({
        actor: options.actor,
        action: "EMAIL_FAILED",
        entityType: "EmailLog",
        entityId: log.id,
        metadata: { templateKey: options.templateKey, error: message },
      });
      return { status: "failed", logId: log.id, reason: message };
    }
  }

  private async auditSpecific(options: SendReservationEmailOptions, logId: number) {
    const actionByTemplate: Partial<Record<EmailTemplateKey, string>> = {
      PRERESERVATION_CREATED_CUSTOMER: "PRERESERVATION_EMAIL_SENT",
      PRERESERVATION_CREATED_ADMIN: "PRERESERVATION_EMAIL_SENT",
      BOOKING_CONFIRMED_CUSTOMER: "BOOKING_CONFIRMATION_EMAIL_SENT",
      BOOKING_CONFIRMED_ADMIN: "BOOKING_CONFIRMATION_EMAIL_SENT",
      REVIEW_REQUEST_CUSTOMER: "REVIEW_REQUEST_EMAIL_SENT",
    };
    const action = actionByTemplate[options.templateKey];
    if (!action) return;
    await this.audit.record({
      actor: options.actor,
      action,
      entityType: String(options.entityType),
      entityId: options.entityId,
      metadata: { emailLogId: logId, templateKey: options.templateKey },
    });
  }

  private async getPreReservation(id: string) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: {
        items: true,
        assignedTo: true,
        booking: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!pre) throw new NotFoundException("Pre-reserva no encontrada");
    return pre;
  }

  private async getBooking(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        preReservation: { include: { items: true, assignedTo: true, payments: { orderBy: { createdAt: "desc" } }, booking: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!booking) throw new NotFoundException("Reserva no encontrada");
    return booking;
  }

  private async buildReservationEmailContext(data: {
    pre?: any;
    booking?: any;
    paymentLink?: string | null;
    reviewLink?: string | null;
  }): Promise<ReservationEmailContext> {
    const pre = data.pre;
    const booking = data.booking;
    const item = pre?.items?.[0];
    const locale = normalizeEmailLocale(pre?.locale);
    const status = booking?.status || pre?.status || "";
    const productType = booking?.type || item?.type;
    const total = Number(
      booking?.totalPrice ??
        pre?.finalTotal ??
        pre?.displayTotal ??
        pre?.totalEstimate ??
        pre?.totalPrice ??
        0
    );
    const currency = booking?.payments?.[0]?.currency || pre?.displayCurrency || pre?.baseCurrency || "COP";
    const settings = await this.prisma.companySettings.findUnique({ where: { id: 1 } }).catch(() => null);

    return {
      customerName: this.cleanText(booking?.customerName || pre?.customerName || "Cliente"),
      customerEmail: this.cleanEmail(booking?.customerEmail || pre?.email || ""),
      customerPhone: this.cleanText(booking?.customerPhone || pre?.customerPhone || ""),
      productTitle: this.cleanText(booking?.productName || item?.name || "Cartagena Tailored Travel"),
      productTypeLabel: this.productTypeLabel(productType, locale),
      startDate: this.formatDate(booking?.checkIn || pre?.checkIn, locale),
      endDate: this.formatDate(booking?.checkOut || pre?.checkOut, locale),
      guests: String(booking?.guests || item?.guests || pre?.adults || 1),
      totalAmount: total > 0 ? `${currency} ${total.toLocaleString("es-CO")}` : "Pendiente",
      currency,
      status: emailStatusLabel(status, locale),
      advisorName: this.cleanText(booking?.advisorName || pre?.assignedTo?.name || "Equipo concierge"),
      advisorEmail: this.cleanEmail(pre?.assignedTo?.email || ""),
      paymentLink: this.cleanUrl(data.paymentLink || pre?.payments?.[0]?.paymentLinkUrl || ""),
      adminUrl: `${this.adminUrl()}/admin/reservas?preReservationId=${pre?.id || booking?.preReservationId || ""}`,
      reviewLink: this.cleanUrl(data.reviewLink || ""),
      companyName: this.cleanText(settings?.businessName || settings?.companyName || "Cartagena Tailored Travel"),
      supportWhatsApp: this.cleanText(settings?.whatsappNumber || settings?.phone || settings?.phones || process.env.SUPPORT_WHATSAPP || ""),
      supportEmail: this.cleanEmail(settings?.email || process.env.SUPPORT_EMAIL || process.env.MAIL_FROM_EMAIL || "reservations@cartagenatailoredtravel.com"),
      reservationCode: this.cleanText(booking?.reservationCode || (pre?.id ? `PRE-${String(pre.id).slice(0, 8).toUpperCase()}` : "")),
      cancellationReason: this.cleanText(booking?.cancellationReason || pre?.cancellationReason || ""),
    };
  }

  private adminRecipients(assignedEmail?: string | null) {
    const raw = [
      process.env.ADMIN_EMAIL,
      process.env.RESERVATIONS_ADMIN_EMAIL,
      process.env.CONTACT_TO_EMAIL,
      process.env.MAIL_TO,
      assignedEmail,
    ]
      .filter(Boolean)
      .join(",");
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((item) => this.cleanEmail(item))
          .filter((item) => item && this.isValidEmail(item))
      )
    );
  }

  private productTypeLabel(type: BookingType | string | undefined, locale: string) {
    const labels: Record<string, Record<string, string>> = {
      PROPERTY: { es: "Alojamiento", en: "Accommodation", fr: "Hebergement", pt: "Acomodacao", it: "Alloggio" },
      EXPERIENCE: { es: "Experiencia", en: "Experience", fr: "Experience", pt: "Experiencia", it: "Esperienza" },
      PACKAGE: { es: "Paquete", en: "Package", fr: "Forfait", pt: "Pacote", it: "Pacchetto" },
    };
    return labels[String(type || "")]?.[locale] || String(type || "Servicio");
  }

  private formatDate(value?: Date | string | null, locale = "es") {
    if (!value) return "Pendiente";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Pendiente";
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
      dateStyle: "medium",
    }).format(date);
  }

  private sanitizeContext(context: ReservationEmailContext): ReservationEmailContext {
    return Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, this.cleanText(String(value || ""))])
    ) as ReservationEmailContext;
  }

  private cleanText(value?: string | null) {
    return String(value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private cleanEmail(value?: string | null) {
    return this.cleanText(value).toLowerCase();
  }

  private cleanUrl(value?: string | null) {
    const clean = this.cleanText(value);
    return /^https?:\/\//i.test(clean) ? clean : "";
  }

  private isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private adminUrl() {
    return process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panaderia-psi.vercel.app";
  }
}
