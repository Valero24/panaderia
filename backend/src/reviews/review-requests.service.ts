import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { BookingStatus, Prisma } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { EmailService } from "../email/email.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

type ReviewRequestActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type ReviewRequestBooking = Prisma.BookingGetPayload<{
  include: {
    preReservation: {
      select: {
        locale: true;
        customerPhone: true;
      };
    };
    reviews: {
      select: {
        id: true;
      };
    };
  };
}>;

@Injectable()
export class ReviewRequestsService {
  private readonly tokenTtlDays = 30;
  private readonly reminderInFlight = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService
  ) {}

  async findBookingsReadyForReview() {
    const now = new Date();

    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        reviewSubmittedAt: null,
        reviewRequestSentAt: null,
        reviews: {
          none: {},
        },
        OR: [
          {
            checkOut: {
              lte: now,
            },
          },
          {
            checkOut: null,
            checkIn: {
              lte: now,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                customerEmail: {
                  not: null,
                },
              },
              {
                customerPhone: {
                  not: null,
                },
              },
            ],
          },
        ],
      },
      include: this.bookingInclude(),
      orderBy: {
        checkOut: "asc",
      },
      take: 100,
    });
  }

  async generateReviewTokenForBooking(bookingId: number) {
    const booking = await this.getBooking(bookingId);
    this.assertBookingReadyForReview(booking, { allowAlreadySent: true });

    const now = new Date();

    if (
      booking.reviewToken &&
      booking.reviewTokenExpiresAt &&
      booking.reviewTokenExpiresAt > now
    ) {
      return {
        token: booking.reviewToken,
        expiresAt: booking.reviewTokenExpiresAt,
        reviewLink: this.buildReviewLink(booking.reviewToken),
        booking,
      };
    }

    const token = await this.createUniqueToken();
    const expiresAt = this.addDays(now, this.tokenTtlDays);
    const updated = await this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        reviewToken: token,
        reviewTokenExpiresAt: expiresAt,
      },
      include: this.bookingInclude(),
    });

    return {
      token,
      expiresAt,
      reviewLink: this.buildReviewLink(token),
      booking: updated,
    };
  }

  buildReviewLink(token: string) {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
      "http://localhost:3001";

    return `${frontendUrl.replace(/\/$/, "")}/review/${token}`;
  }

  async sendReviewRequest(bookingId: number, actor?: ReviewRequestActor) {
    const currentBooking = await this.getBooking(bookingId);
    this.assertBookingReadyForReview(currentBooking, { allowAlreadySent: true });

    if (currentBooking.reviewRequestSentAt) {
      const existingLink =
        currentBooking.reviewToken &&
        currentBooking.reviewTokenExpiresAt &&
        currentBooking.reviewTokenExpiresAt > new Date()
          ? this.buildReviewLink(currentBooking.reviewToken)
          : null;

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REQUEST_ALREADY_SENT",
        booking: currentBooking,
        message: "La solicitud post-servicio de resena ya habia sido enviada",
        metadata: {
          sentAt: currentBooking.reviewRequestSentAt,
          reminderCount: currentBooking.reviewReminderCount,
        },
      });

      return {
        bookingId: currentBooking.id,
        reservationCode: currentBooking.reservationCode,
        reviewLink: existingLink,
        expiresAt: currentBooking.reviewTokenExpiresAt,
        email: "skipped" as const,
        whatsapp: currentBooking.customerPhone ? ("prepared" as const) : ("disabled" as const),
        whatsappMessage: existingLink
          ? this.whatsappMessage(this.resolveLocale(currentBooking), currentBooking, existingLink)
          : "",
        waLink: existingLink
          ? this.buildWhatsappLink(
              currentBooking.customerPhone,
              this.whatsappMessage(this.resolveLocale(currentBooking), currentBooking, existingLink)
            )
          : null,
        status: "already-sent",
        reason: "La solicitud de resena ya fue enviada",
      };
    }

    await this.recordReviewRequestAudit({
      actor,
      action: "REVIEW_REQUEST_READY",
      booking: currentBooking,
      message: "Reserva finalizada lista para solicitar resena",
      metadata: {
        serviceEnd: this.serviceEndDate(currentBooking),
      },
    });

    const beforeToken = currentBooking.reviewToken;
    const { reviewLink, expiresAt, booking } =
      await this.generateReviewTokenForBooking(bookingId);

    if (!beforeToken || beforeToken !== booking.reviewToken) {
      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_LINK_GENERATED",
        booking,
        message: "Link privado de resena generado",
        metadata: {
          expiresAt,
        },
      });
    }

    this.assertBookingReadyForReview(booking, { allowAlreadySent: false });

    const locale = this.resolveLocale(booking);
    const whatsappMessage = this.whatsappMessage(locale, booking, reviewLink);
    const whatsappEnabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === "true";
    const result: {
      bookingId: number;
      reservationCode?: string | null;
      reviewLink: string;
      expiresAt: Date;
      email: "sent" | "skipped" | "failed" | "missing-email";
      whatsapp: "prepared" | "disabled";
      whatsappMessage: string;
      waLink?: string | null;
      reason?: string;
      status?: string;
    } = {
      bookingId: booking.id,
      reservationCode: booking.reservationCode,
      reviewLink,
      expiresAt,
      email: "skipped",
      whatsapp: booking.customerPhone ? "prepared" : "disabled",
      whatsappMessage,
      waLink: this.buildWhatsappLink(booking.customerPhone, whatsappMessage),
    };

    try {
      if (booking.customerPhone) {
        await this.recordReviewRequestAudit({
          actor,
          action: "REVIEW_REQUEST_WHATSAPP_PREPARED",
          booking,
          message: "Mensaje de WhatsApp para resena preparado sin API externa",
          metadata: {
            whatsappEnabled,
            hasPhone: true,
          },
        });
      }

      if (!booking.customerEmail) {
        result.email = "missing-email";
        result.reason = "Cliente sin correo";
        await this.recordReviewRequestAudit({
          actor,
          action: "REVIEW_REQUEST_SKIPPED",
          booking,
          message: "Correo de solicitud de resena omitido",
          metadata: {
            reason: result.reason,
            channel: "email",
          },
        });
      } else {
        const mailResult = await this.emailService.sendReviewRequest(
          booking.id,
          reviewLink,
          actor
        );

        const mailStatus = (mailResult as any)?.status;
        if (mailStatus === "skipped" || mailStatus === "already-sent") {
          result.email = "skipped";
          result.reason = (mailResult as any).reason || "Correo omitido";
          await this.recordReviewRequestAudit({
            actor,
            action: "REVIEW_REQUEST_SKIPPED",
            booking,
            message: "Correo de solicitud de resena omitido",
            metadata: {
              reason: result.reason,
              channel: "email",
            },
          });
        } else if (mailStatus === "failed") {
          result.email = "failed";
          result.reason = (mailResult as any).reason || "Email error";
          await this.recordReviewRequestAudit({
            actor,
            action: "REVIEW_REQUEST_EMAIL_FAILED",
            booking,
            message: "Fallo el correo de solicitud de resena",
            metadata: {
              reason: result.reason,
              channel: "email",
            },
          });
        } else {
          result.email = "sent";
          await this.recordReviewRequestAudit({
            actor,
            action: "REVIEW_REQUEST_EMAIL_SENT",
            booking,
            message: "Correo de solicitud de resena enviado",
            metadata: {
              channel: "email",
            },
          });
        }
      }

      const updated = await this.markReviewRequestSent(booking.id);
      result.status = "processed";

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REQUEST_READY",
        booking,
        message: "Solicitud post-servicio de resena procesada",
        metadata: {
          email: result.email,
          whatsapp: result.whatsapp,
          reminderCount: updated.reviewReminderCount,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          notificationLastError:
            error instanceof Error ? error.message : "Review request error",
        },
      });

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REQUEST_EMAIL_FAILED",
        booking,
        message: "Fallo enviando solicitud post-servicio de resena",
        metadata: {
          error: error instanceof Error ? error.message : "UNKNOWN",
          channel: "email",
        },
      });

      throw error;
    }
  }

  async markReviewRequestSent(bookingId: number) {
    const now = new Date();

    return this.prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        reviewRequestSentAt: now,
        notificationLastError: null,
      },
    });
  }

  async findBookingsReadyForReviewReminder() {
    const now = new Date();
    const maxReminders = this.maxReviewReminders();
    const firstReminderDays = this.firstReviewReminderDays();
    const secondReminderDays = this.secondReviewReminderDays();
    const firstReminderCutoff = this.addDays(now, -firstReminderDays);
    const secondReminderCutoff = this.addDays(now, -secondReminderDays);

    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        reviewRequestSentAt: {
          not: null,
        },
        reviewSubmittedAt: null,
        reviewReminderCount: {
          lt: maxReminders,
        },
        reviews: {
          none: {},
        },
        OR: [
          {
            checkOut: {
              lte: now,
            },
          },
          {
            checkOut: null,
            checkIn: {
              lte: now,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                customerEmail: {
                  not: null,
                },
              },
              {
                customerPhone: {
                  not: null,
                },
              },
            ],
          },
          {
            OR: [
              {
                reviewReminderCount: 0,
                reviewRequestSentAt: {
                  lte: firstReminderCutoff,
                },
              },
              {
                reviewReminderCount: {
                  gt: 0,
                },
                lastReviewReminderAt: {
                  lte: secondReminderCutoff,
                },
              },
            ],
          },
        ],
      },
      include: this.bookingInclude(),
      orderBy: {
        reviewRequestSentAt: "asc",
      },
      take: 100,
    });
  }

  async sendReviewReminder(bookingId: number, actor?: ReviewRequestActor) {
    if (this.reminderInFlight.has(bookingId)) {
      throw new BadRequestException("Ya hay un recordatorio en proceso para esta reserva");
    }

    this.reminderInFlight.add(bookingId);

    const booking = await this.getBooking(bookingId);
    try {
      try {
        this.assertBookingReadyForReviewReminder(booking);
      } catch (error) {
        if (
          error instanceof BadRequestException &&
          Number(booking.reviewReminderCount || 0) >= this.maxReviewReminders()
        ) {
          await this.recordReviewRequestAudit({
            actor,
            action: "REVIEW_REMINDER_LIMIT_REACHED",
            booking,
            message: "Limite de recordatorios de resena alcanzado",
            metadata: {
              reminderCount: booking.reviewReminderCount,
              maxReminders: this.maxReviewReminders(),
            },
          });
        }

        throw error;
      }

      const tokenSnapshot = await this.ensureActiveReviewToken(booking, actor);
      const locale = this.resolveLocale(tokenSnapshot.booking);
      const reviewLink = tokenSnapshot.reviewLink;
      const emailTemplate = this.reminderEmailTemplate(locale, tokenSnapshot.booking, reviewLink);
      const whatsappMessage = this.reminderWhatsappMessage(
        locale,
        tokenSnapshot.booking,
        reviewLink
      );
      const emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === "true";
      const whatsappEnabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === "true";
      const result: {
        bookingId: number;
        reservationCode?: string | null;
        reviewLink: string;
        expiresAt: Date;
        reminderNumber: number;
        email: "sent" | "skipped" | "failed" | "missing-email";
        whatsapp: "prepared" | "disabled";
        whatsappMessage: string;
        waLink?: string | null;
        reason?: string;
        status?: string;
      } = {
        bookingId: tokenSnapshot.booking.id,
        reservationCode: tokenSnapshot.booking.reservationCode,
        reviewLink,
        expiresAt: tokenSnapshot.expiresAt,
        reminderNumber: Number(tokenSnapshot.booking.reviewReminderCount || 0) + 1,
        email: "skipped",
        whatsapp: tokenSnapshot.booking.customerPhone ? "prepared" : "disabled",
        whatsappMessage,
        waLink: this.buildWhatsappLink(tokenSnapshot.booking.customerPhone, whatsappMessage),
      };

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REMINDER_READY",
        booking: tokenSnapshot.booking,
        message: "Reserva lista para recordatorio de resena",
        metadata: {
          reminderNumber: result.reminderNumber,
          maxReminders: this.maxReviewReminders(),
        },
      });

      if (tokenSnapshot.booking.customerPhone) {
        await this.recordReviewRequestAudit({
          actor,
          action: "REVIEW_REMINDER_SKIPPED",
          booking: tokenSnapshot.booking,
          message: "Mensaje de WhatsApp para recordatorio de resena preparado sin API externa",
          metadata: {
            whatsappEnabled,
            channel: "whatsapp",
            reason: whatsappEnabled
              ? "WHATSAPP_REAL_NOT_IMPLEMENTED"
              : "ENABLE_WHATSAPP_NOTIFICATIONS no esta activo",
            reminderNumber: result.reminderNumber,
          },
        });
      }

      if (!tokenSnapshot.booking.customerEmail) {
        result.email = "missing-email";
        result.reason = "Cliente sin correo";
        await this.recordReviewRequestAudit({
          actor,
          action: "REVIEW_REMINDER_SKIPPED",
          booking: tokenSnapshot.booking,
          message: "Correo de recordatorio de resena omitido",
          metadata: {
            reason: result.reason,
            channel: "email",
            reminderNumber: result.reminderNumber,
          },
        });
      } else if (!emailEnabled) {
        result.email = "skipped";
        result.reason = "ENABLE_EMAIL_NOTIFICATIONS no esta activo";
        await this.recordReviewRequestAudit({
          actor,
          action: "REVIEW_REMINDER_SKIPPED",
          booking: tokenSnapshot.booking,
          message: "Correo de recordatorio de resena omitido por configuracion",
          metadata: {
            reason: result.reason,
            channel: "email",
            reminderNumber: result.reminderNumber,
          },
        });
      } else {
        const mailResult = await this.mailService.sendReviewRequest({
          to: tokenSnapshot.booking.customerEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        if ((mailResult as any)?.skipped) {
          result.email = "skipped";
          result.reason = (mailResult as any).reason || "Correo omitido";
          await this.recordReviewRequestAudit({
            actor,
            action: "REVIEW_REMINDER_SKIPPED",
            booking: tokenSnapshot.booking,
            message: "Correo de recordatorio de resena omitido",
            metadata: {
              reason: result.reason,
              channel: "email",
              reminderNumber: result.reminderNumber,
            },
          });
        } else {
          result.email = "sent";
        }
      }

      const updated = await this.markReviewReminderSent(tokenSnapshot.booking.id);
      result.status = "processed";
      result.reminderNumber = updated.reviewReminderCount;

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REMINDER_SENT",
        booking: tokenSnapshot.booking,
        message: "Recordatorio post-servicio de resena procesado",
        metadata: {
          email: result.email,
          whatsapp: result.whatsapp,
          reminderCount: updated.reviewReminderCount,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          notificationLastError:
            error instanceof Error ? error.message : "Review reminder error",
        },
      });

      await this.recordReviewRequestAudit({
        actor,
        action: "REVIEW_REMINDER_FAILED",
        booking,
        message: "Fallo enviando recordatorio post-servicio de resena",
        metadata: {
          error: error instanceof Error ? error.message : "UNKNOWN",
          channel: "email",
        },
      });

      throw error;
    } finally {
      this.reminderInFlight.delete(bookingId);
    }
  }

  async sendPendingReviewReminders(actor?: ReviewRequestActor) {
    const bookings = await this.findBookingsReadyForReviewReminder();
    const summary = {
      totalFound: bookings.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: [] as unknown[],
    };

    for (const booking of bookings) {
      try {
        const result = await this.sendReviewReminder(booking.id, actor);
        if (result.status === "processed") {
          summary.sent += 1;
        } else {
          summary.skipped += 1;
        }
        summary.results.push(result);
      } catch (error) {
        summary.failed += 1;
        summary.results.push({
          bookingId: booking.id,
          reservationCode: booking.reservationCode,
          error: error instanceof Error ? error.message : "UNKNOWN",
        });
      }
    }

    return summary;
  }

  async markReviewReminderSent(bookingId: number) {
    const now = new Date();

    return this.prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        lastReviewReminderAt: now,
        reviewReminderCount: {
          increment: 1,
        },
        notificationLastError: null,
      },
    });
  }

  async sendPendingReviewRequests(actor?: ReviewRequestActor) {
    const bookings = await this.findBookingsReadyForReview();
    const summary = {
      totalFound: bookings.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: [] as unknown[],
    };

    for (const booking of bookings) {
      try {
        const result = await this.sendReviewRequest(booking.id, actor);
        if (result.status === "processed") {
          summary.sent += 1;
        } else {
          summary.skipped += 1;
        }
        summary.results.push(result);
      } catch (error) {
        summary.failed += 1;
        summary.results.push({
          bookingId: booking.id,
          reservationCode: booking.reservationCode,
          error: error instanceof Error ? error.message : "UNKNOWN",
        });
      }
    }

    return summary;
  }

  private async getBooking(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }

    return booking;
  }

  private assertBookingReadyForReview(
    booking: ReviewRequestBooking,
    options: { allowAlreadySent: boolean }
  ) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException("Solo reservas confirmadas pueden solicitar resena");
    }

    if (!this.hasBookingFinished(booking)) {
      throw new BadRequestException("La reserva aun no ha finalizado");
    }

    if (booking.reviewSubmittedAt || booking.reviews.length > 0) {
      throw new BadRequestException("Esta reserva ya tiene una resena registrada");
    }

    if (!options.allowAlreadySent && booking.reviewRequestSentAt) {
      throw new BadRequestException("La solicitud de resena ya fue enviada");
    }

    if (!booking.customerEmail && !booking.customerPhone) {
      throw new BadRequestException("La reserva no tiene correo ni telefono del cliente");
    }
  }

  private assertBookingReadyForReviewReminder(booking: ReviewRequestBooking) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException("Solo reservas confirmadas pueden recibir recordatorios");
    }

    if (!this.hasBookingFinished(booking)) {
      throw new BadRequestException("La reserva aun no ha finalizado");
    }

    if (!booking.reviewRequestSentAt) {
      throw new BadRequestException("Primero debe enviarse el link inicial de resena");
    }

    if (booking.reviewSubmittedAt || booking.reviews.length > 0) {
      throw new BadRequestException("Esta reserva ya tiene una resena registrada");
    }

    if (!booking.customerEmail && !booking.customerPhone) {
      throw new BadRequestException("La reserva no tiene correo ni telefono del cliente");
    }

    if (Number(booking.reviewReminderCount || 0) >= this.maxReviewReminders()) {
      throw new BadRequestException("La reserva ya alcanzo el maximo de recordatorios");
    }

    if (!this.isReviewReminderDue(booking)) {
      throw new BadRequestException("Aun no se cumple la frecuencia del siguiente recordatorio");
    }
  }

  private isReviewReminderDue(booking: ReviewRequestBooking) {
    const reminderCount = Number(booking.reviewReminderCount || 0);
    const baseDate =
      reminderCount === 0
        ? booking.reviewRequestSentAt
        : booking.lastReviewReminderAt || booking.reviewRequestSentAt;

    if (!baseDate) return false;

    const waitDays =
      reminderCount === 0
        ? this.firstReviewReminderDays()
        : this.secondReviewReminderDays();
    const dueAt = this.addDays(baseDate, waitDays);

    return dueAt.getTime() <= Date.now();
  }

  private async ensureActiveReviewToken(
    booking: ReviewRequestBooking,
    actor?: ReviewRequestActor
  ) {
    const now = new Date();

    if (
      booking.reviewToken &&
      booking.reviewTokenExpiresAt &&
      booking.reviewTokenExpiresAt > now
    ) {
      return {
        reviewLink: this.buildReviewLink(booking.reviewToken),
        expiresAt: booking.reviewTokenExpiresAt,
        booking,
      };
    }

    const token = await this.createUniqueToken();
    const expiresAt = this.addDays(now, this.tokenTtlDays);
    const updated = await this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        reviewToken: token,
        reviewTokenExpiresAt: expiresAt,
      },
      include: this.bookingInclude(),
    });

    await this.recordReviewRequestAudit({
      actor,
      action: "REVIEW_REMINDER_TOKEN_REGENERATED",
      booking: updated,
      message: "Link privado de resena regenerado para recordatorio",
      metadata: {
        expiresAt,
        reason: "TOKEN_EXPIRED_FOR_REMINDER",
      },
    });

    return {
      reviewLink: this.buildReviewLink(token),
      expiresAt,
      booking: updated,
    };
  }

  private hasBookingFinished(booking: { checkIn: Date; checkOut?: Date | null }) {
    const serviceEnd = this.serviceEndDate(booking);

    return serviceEnd.getTime() <= Date.now();
  }

  private serviceEndDate(booking: { checkIn: Date; checkOut?: Date | null }) {
    return booking.checkOut || booking.checkIn;
  }

  private async createUniqueToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(32).toString("base64url");
      const existing = await this.prisma.booking.findUnique({
        where: {
          reviewToken: token,
        },
        select: {
          id: true,
        },
      });

      if (!existing) return token;
    }

    throw new BadRequestException("No fue posible generar token de resena");
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private envNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private firstReviewReminderDays() {
    return this.envNumber("REVIEW_FIRST_REMINDER_DAYS", 3);
  }

  private secondReviewReminderDays() {
    return this.envNumber("REVIEW_SECOND_REMINDER_DAYS", 7);
  }

  private maxReviewReminders() {
    return Math.max(0, this.envNumber("REVIEW_MAX_REMINDERS", 2));
  }

  private resolveLocale(booking: ReviewRequestBooking) {
    const locale = String(booking.preReservation?.locale || "es").toLowerCase();
    return locale === "en" ? "en" : "es";
  }

  private emailTemplate(locale: "es" | "en", booking: ReviewRequestBooking, reviewLink: string) {
    const customerName = booking.customerName || "viajero";

    if (locale === "en") {
      const text = [
        `Hi ${customerName},`,
        "",
        "We hope you enjoyed your experience with Cartagena Tailored Travel.",
        "",
        "Your feedback helps us improve and helps other travelers choose trusted experiences in Cartagena.",
        "",
        "You can leave your review here:",
        reviewLink,
        "",
        "Thank you for traveling with us.",
        "",
        "Cartagena Tailored Travel",
      ].join("\n");

      return {
        subject: "How was your experience with Cartagena Tailored Travel?",
        text,
        html: this.toHtml(text),
      };
    }

    const text = [
      `Hola ${customerName},`,
      "",
      "Esperamos que hayas disfrutado tu experiencia con Cartagena Tailored Travel.",
      "",
      "Tu opinion nos ayuda a seguir mejorando y tambien ayuda a otros viajeros a elegir experiencias confiables en Cartagena.",
      "",
      "Puedes dejar tu resena aqui:",
      reviewLink,
      "",
      "Gracias por viajar con nosotros.",
      "",
      "Cartagena Tailored Travel",
    ].join("\n");

    return {
      subject: "Como fue tu experiencia con Cartagena Tailored Travel?",
      text,
      html: this.toHtml(text),
    };
  }

  private reminderEmailTemplate(
    locale: "es" | "en",
    booking: ReviewRequestBooking,
    reviewLink: string
  ) {
    const customerName = booking.customerName || "viajero";

    if (locale === "en") {
      const text = [
        `Hi ${customerName},`,
        "",
        "We recently shared a link so you could tell us how your experience with Cartagena Tailored Travel was.",
        "",
        "Your feedback helps us improve and helps other travelers choose with confidence.",
        "",
        "You can leave your review here:",
        reviewLink,
        "",
        "Thank you for your time.",
        "",
        "Cartagena Tailored Travel",
      ].join("\n");

      return {
        subject: "Could you share your feedback with us?",
        text,
        html: this.toHtml(text),
      };
    }

    const text = [
      `Hola ${customerName},`,
      "",
      "Hace poco te compartimos el enlace para contarnos cómo fue tu experiencia con Cartagena Tailored Travel.",
      "",
      "Tu opinión nos ayuda a mejorar y también ayuda a otros viajeros a elegir con confianza.",
      "",
      "Puedes dejar tu reseña aquí:",
      reviewLink,
      "",
      "Gracias por tu tiempo.",
      "",
      "Cartagena Tailored Travel",
    ].join("\n");

    return {
      subject: "¿Nos ayudas con tu opinión?",
      text,
      html: this.toHtml(text),
    };
  }

  private whatsappMessage(locale: "es" | "en", booking: ReviewRequestBooking, reviewLink: string) {
    const customerName = booking.customerName || (locale === "en" ? "traveler" : "viajero");

    if (locale === "en") {
      return `Hi ${customerName}, we hope you enjoyed your experience with Cartagena Tailored Travel. Your feedback is very important to us. You can leave your review here: ${reviewLink}`;
    }

    return `Hola ${customerName}, esperamos que hayas disfrutado tu experiencia con Cartagena Tailored Travel. Tu opinion es muy importante para nosotros. Puedes dejar tu resena aqui: ${reviewLink}`;
  }

  private reminderWhatsappMessage(
    locale: "es" | "en",
    booking: ReviewRequestBooking,
    reviewLink: string
  ) {
    const customerName = booking.customerName || (locale === "en" ? "traveler" : "viajero");

    if (locale === "en") {
      return `Hi ${customerName}, this is a friendly reminder that you can share your feedback about your Cartagena Tailored Travel experience here: ${reviewLink}`;
    }

    return `Hola ${customerName}, queremos recordarte que puedes compartir tu opinión sobre tu experiencia con Cartagena Tailored Travel aquí: ${reviewLink}`;
  }

  private buildWhatsappLink(phone?: string | null, message?: string) {
    if (!phone || !message) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  private async recordReviewRequestAudit(data: {
    actor?: ReviewRequestActor;
    action: string;
    booking: ReviewRequestBooking;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.audit.record({
      actor: data.actor,
      action: data.action,
      entityType: "Booking",
      entityId: data.booking.id,
      message: data.message,
      metadata: {
        reservationCode: data.booking.reservationCode,
        ...data.metadata,
      },
    });
  }

  private toHtml(text: string) {
    return `
      <div style="font-family:Arial,sans-serif;color:#0D2B52;line-height:1.6">
        ${text
          .split("\n")
          .map((line) => (line ? `<p>${line}</p>` : "<br />"))
          .join("")}
      </div>
    `;
  }

  private bookingInclude() {
    return {
      preReservation: {
        select: {
          locale: true,
          customerPhone: true,
        },
      },
      reviews: {
        select: {
          id: true,
        },
      },
    } satisfies Prisma.BookingInclude;
  }
}
