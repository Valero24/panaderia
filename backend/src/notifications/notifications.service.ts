import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { WhatsappService } from "./whatsapp.service";
import { OperationalNotificationStatus } from "@prisma/client";
import { AuditService } from "../common/audit.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly whatsappService: WhatsappService,
    private readonly audit: AuditService
  ) {}

  private extras(extras: any) {
    return Array.isArray(extras) ? extras : [];
  }

  private currencyFor(booking: {
    payments?: { currency?: string | null }[];
  }) {
    return booking.payments?.[0]?.currency || "COP";
  }

  private operationalRecipients() {
    const raw =
      process.env.WHATSAPP_NOTIFICATION_NUMBERS ||
      "573187350654,573246100431";

    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async notifyNewPreReservation(preReservationId: string) {
    try {
      const preReservation = await this.prisma.preReservation.findUnique({
        where: { id: preReservationId },
        include: { items: true },
      });

      if (!preReservation) {
        return {
          status: "missing-pre-reservation",
          created: 0,
        };
      }

      const item = preReservation.items[0];
      const message = [
        "Nueva solicitud en Cartagena Tailored Travel",
        "",
        `Cliente: ${preReservation.customerName}`,
        `WhatsApp: ${preReservation.customerPhone || "No registrado"}`,
        `Correo: ${preReservation.email}`,
        `Producto: ${item?.name || "Producto pendiente"}`,
        `Tipo: ${item?.type || "N/A"}`,
        `Fechas: ${preReservation.checkIn?.toLocaleDateString("es-CO") || "Pendiente"} - ${preReservation.checkOut?.toLocaleDateString("es-CO") || "Pendiente"}`,
        `Huespedes: ${item?.guests || preReservation.adults || 1}`,
        `Total estimado: COP ${Number(preReservation.finalTotal || preReservation.totalEstimate || 0).toLocaleString("es-CO")}`,
        "",
        "Ingresa al panel para gestionar la solicitud.",
      ].join("\n");

      const enabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === "true";
      const recipients = this.operationalRecipients();
      let sent = 0;
      let pending = 0;
      let failed = 0;

      for (const recipient of recipients) {
        if (!enabled) {
          const notification = await this.prisma.operationalNotification.create({
            data: {
              channel: "WHATSAPP",
              recipient,
              message,
              status: OperationalNotificationStatus.PENDING,
              provider: "simulated",
              preReservationId,
            },
          });
          await this.auditOperationalNotification(notification.id, {
            preReservationId,
            recipient,
            status: OperationalNotificationStatus.PENDING,
            action: "OPERATIONAL_NOTIFICATION_PENDING",
            message: "Notificacion operativa simulada pendiente",
          });
          pending += 1;
          this.logger.log(
            `Notificacion operativa pendiente para ${recipient}: ${preReservationId}`
          );
          continue;
        }

        try {
          const result = await this.whatsappService.sendOperationalMessage({
            to: recipient,
            message,
          });

          if ((result as any)?.skipped) {
            const notification = await this.prisma.operationalNotification.create({
              data: {
                channel: "WHATSAPP",
                recipient,
                message,
                status: OperationalNotificationStatus.PENDING,
                provider: (result as any).provider || "generic",
                error: (result as any).reason || "WhatsApp no configurado",
                preReservationId,
              },
            });
            await this.auditOperationalNotification(notification.id, {
              preReservationId,
              recipient,
              status: OperationalNotificationStatus.PENDING,
              action: "OPERATIONAL_NOTIFICATION_PENDING",
              message: "Notificacion operativa pendiente por proveedor no configurado",
            });
            pending += 1;
          } else {
            const notification = await this.prisma.operationalNotification.create({
              data: {
                channel: "WHATSAPP",
                recipient,
                message,
                status: OperationalNotificationStatus.SENT,
                provider: (result as any).provider || "generic",
                sentAt: new Date(),
                preReservationId,
              },
            });
            await this.auditOperationalNotification(notification.id, {
              preReservationId,
              recipient,
              status: OperationalNotificationStatus.SENT,
              action: "OPERATIONAL_NOTIFICATION_SENT",
              message: "Notificacion operativa enviada",
            });
            sent += 1;
          }
        } catch (error) {
          const notification = await this.prisma.operationalNotification.create({
            data: {
              channel: "WHATSAPP",
              recipient,
              message,
              status: OperationalNotificationStatus.FAILED,
              provider: process.env.WHATSAPP_PROVIDER || "generic",
              error:
                error instanceof Error
                  ? error.message
                  : "Operational WhatsApp error",
              preReservationId,
            },
          });
          await this.auditOperationalNotification(notification.id, {
            preReservationId,
            recipient,
            status: OperationalNotificationStatus.FAILED,
            action: "OPERATIONAL_NOTIFICATION_FAILED",
            message: "Fallo la notificacion operativa",
            error: error instanceof Error ? error.message : "Operational WhatsApp error",
          });
          failed += 1;
          this.logger.warn(
            `Fallo notificacion operativa ${preReservationId} -> ${recipient}`
          );
        }
      }

      return {
        status: enabled ? "processed" : "queued-simulated",
        sent,
        pending,
        failed,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar notificacion operativa para ${preReservationId}`
      );
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "Notification error",
      };
    }
  }

  private auditOperationalNotification(
    id: number,
    data: {
      preReservationId: string;
      recipient: string;
      status: OperationalNotificationStatus;
      action: string;
      message: string;
      error?: string;
    }
  ) {
    return this.audit.record({
      action: data.action,
      entityType: "OperationalNotification",
      entityId: id,
      message: data.message,
      newValue: {
        status: data.status,
        channel: "WHATSAPP",
        recipient: data.recipient,
        preReservationId: data.preReservationId,
        error: data.error,
      },
      metadata: {
        preReservationId: data.preReservationId,
      },
    });
  }

  async sendManualBookingEmail(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return {
        status: "missing-booking",
        sent: false,
      };
    }

    if (!booking.customerEmail) {
      return {
        status: "missing-email",
        sent: false,
        reason: "Cliente sin correo",
      };
    }

    if (!booking.invoicePath) {
      return {
        status: "missing-invoice",
        sent: false,
        reason: "La reserva no tiene comprobante PDF",
      };
    }

    if (booking.confirmationEmailSentAt) {
      return {
        status: "already-sent",
        sent: false,
        sentAt: booking.confirmationEmailSentAt,
      };
    }

    try {
      const emailResult =
        await this.mailService.sendManualReservationComprobante({
          to: booking.customerEmail,
          guestName: booking.customerName || "Cliente",
          reservationCode: booking.reservationCode,
          bookingId: booking.id,
          productName:
            booking.productName || `Producto #${booking.referenceId}`,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          extras: this.extras(booking.selectedExtras),
          total: booking.totalPrice,
          currency: this.currencyFor(booking),
          advisorName: booking.advisorName,
          pdfPath: booking.invoicePath,
        });

      if ((emailResult as any)?.skipped) {
        return {
          status: "skipped",
          sent: false,
          reason: (emailResult as any).reason || "Correo no configurado",
        };
      }

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          confirmationEmailSentAt: new Date(),
          notificationLastError: null,
        },
      });

      return {
        status: "sent",
        sent: true,
        sentAt: updated.confirmationEmailSentAt,
      };
    } catch (error) {
      this.logger.warn("No se pudo enviar comprobante manual por correo");
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          notificationLastError:
            error instanceof Error ? error.message : "Email error",
        },
      });

      return {
        status: "failed",
        sent: false,
        reason: error instanceof Error ? error.message : "Email error",
      };
    }
  }

  async sendManualBookingWhatsapp(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return {
        status: "missing-booking",
        sent: false,
      };
    }

    if (!booking.customerPhone) {
      return {
        status: "missing-phone",
        sent: false,
        reason: "Cliente sin telefono",
      };
    }

    if (booking.confirmationWhatsappSentAt) {
      return {
        status: "already-sent",
        sent: false,
        sentAt: booking.confirmationWhatsappSentAt,
      };
    }

    try {
      const whatsapp =
        await this.whatsappService.sendManualReservationSummary({
          to: booking.customerPhone,
          customerName: booking.customerName || "Cliente",
          reservationCode: booking.reservationCode,
          bookingId: booking.id,
          productName:
            booking.productName || `Producto #${booking.referenceId}`,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          total: booking.totalPrice,
          currency: this.currencyFor(booking),
        });

      if (whatsapp.skipped) {
        return {
          status: "skipped",
          sent: false,
          reason: whatsapp.reason || "WhatsApp no configurado",
        };
      }

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          confirmationWhatsappSentAt: new Date(),
          notificationLastError: null,
        },
      });

      return {
        status: "sent",
        sent: true,
        sentAt: updated.confirmationWhatsappSentAt,
      };
    } catch (error) {
      this.logger.warn("No se pudo enviar resumen manual por WhatsApp");
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          notificationLastError:
            error instanceof Error ? error.message : "WhatsApp error",
        },
      });

      return {
        status: "failed",
        sent: false,
        reason: error instanceof Error ? error.message : "WhatsApp error",
      };
    }
  }

  async sendFinalBookingNotifications(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return {
        email: "missing-booking",
        whatsapp: "missing-booking",
      };
    }

    const currency = this.currencyFor(booking);
    const result = {
      email: "skipped",
      whatsapp: "skipped",
    };

    if (
      booking.customerEmail &&
      booking.invoicePath &&
      !booking.confirmationEmailSentAt
    ) {
      try {
        const emailResult =
          await this.mailService.sendPaidReservationSummary({
          to: booking.customerEmail,
          guestName: booking.customerName || "Cliente",
          bookingId: booking.id,
          productName:
            booking.productName || `Producto #${booking.referenceId}`,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          extras: this.extras(booking.selectedExtras),
          total: booking.totalPrice,
          currency,
          paymentMethod: booking.paymentMethod || "Wompi",
          advisorName: booking.advisorName,
          pdfPath: booking.invoicePath,
        });

        if ((emailResult as any)?.skipped) {
          result.email = (emailResult as any).reason || "skipped";
        } else {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              confirmationEmailSentAt: new Date(),
              notificationLastError: null,
            },
          });

          result.email = "sent";
        }
      } catch (error) {
        this.logger.warn("No se pudo enviar correo premium");
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            notificationLastError:
              error instanceof Error ? error.message : "Email error",
          },
        });
        result.email = "failed";
      }
    }

    if (
      booking.customerPhone &&
      !booking.confirmationWhatsappSentAt
    ) {
      try {
        const whatsapp =
          await this.whatsappService.sendConfirmationMessage({
            to: booking.customerPhone,
            customerName: booking.customerName || "Cliente",
            bookingId: booking.id,
            productName:
              booking.productName || `Producto #${booking.referenceId}`,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            total: booking.totalPrice,
            currency,
            advisorName: booking.advisorName,
          });

        if (!whatsapp.skipped) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              confirmationWhatsappSentAt: new Date(),
              notificationLastError: null,
            },
          });

          result.whatsapp = "sent";
        } else {
          result.whatsapp = whatsapp.reason || "skipped";
        }
      } catch (error) {
        this.logger.warn("No se pudo enviar WhatsApp");
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            notificationLastError:
              error instanceof Error ? error.message : "WhatsApp error",
          },
        });
        result.whatsapp = "failed";
      }
    }

    return result;
  }
}
