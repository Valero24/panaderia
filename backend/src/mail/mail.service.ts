import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter;
  private configured: boolean;

  constructor() {
    const mailPass =
      process.env.SMTP_PASSWORD ||
      process.env.MAIL_PASS ||
      process.env.MAIL_PASSWORD;
    const mailUser = process.env.SMTP_USER || process.env.MAIL_USER;

    this.configured = Boolean(
      mailUser &&
        mailPass
    );

    this.transporter = nodemailer.createTransport(
      (process.env.SMTP_HOST || process.env.MAIL_HOST)
        ? {
            host: process.env.SMTP_HOST || process.env.MAIL_HOST,
            port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
            secure: process.env.MAIL_SECURE === "true",
            auth: {
              user: mailUser,
              pass: mailPass,
            },
          }
        : {
            service: "gmail",
            auth: {
              user: mailUser,
              pass: mailPass,
            },
          }
    );
  }

  private async sendMail(options: any) {
    if (
      process.env.SEND_EMAILS_ENABLED === "false" ||
      process.env.ENABLE_EMAIL_NOTIFICATIONS === "false"
    ) {
      return {
        skipped: true,
        reason: "SEND_EMAILS_ENABLED=false",
      };
    }

    if (!this.configured) {
      return {
        skipped: true,
        reason: "MAIL_USER/MAIL_PASS no configurados",
      };
    }

    return this.transporter.sendMail(options);
  }

  private fromAddress() {
    const fromName =
      process.env.SMTP_FROM_NAME ||
      process.env.MAIL_FROM_NAME ||
      "Cartagena Tailored Travel";
    const fromEmail =
      process.env.SMTP_FROM ||
      process.env.MAIL_FROM_EMAIL ||
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.MAIL_USER ||
      "reservations@cartagenatailoredtravel.com";

    if (fromEmail.includes("<")) {
      return fromEmail;
    }

    return `"${fromName}" <${fromEmail}>`;
  }

  async sendRaw(options: any) {
    return this.sendMail({
      from: this.fromAddress(),
      ...options,
    });
  }

  async sendBookingConfirmation(
    to: string,
    guestName: string,
    pdfPath: string
  ) {
    return this.sendMail({
      from:
        this.fromAddress(),
      to,
      subject: "Your Luxury Stay Has Been Confirmed ✨",
      html: `
        <h1>Reservation Confirmed</h1>
        <p>Hello ${guestName},</p>
        <p>Your luxury stay has been confirmed successfully.</p>
        <p>We look forward to hosting you in Cartagena.</p>
        <p>Please find your invoice attached in PDF format.</p>
      `,
      attachments: [
        {
          filename: "invoice.pdf",
          path: pdfPath,
        },
      ],
    });
  }

  async sendPaidReservationSummary(data: {
    to: string;
    guestName: string;
    bookingId: number;
    productName: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    guests?: number;
    extras?: {
      name?: string;
      quantity?: number;
      totalPrice?: number;
    }[];
    total: number;
    currency: string;
    paymentMethod?: string | null;
    advisorName?: string | null;
    pdfPath: string;
  }) {
    const extrasHtml = data.extras?.length
      ? data.extras
          .map(
            (extra) => `
              <li>
                ${extra.name || "Servicio premium"} x${extra.quantity || 1}
                - ${data.currency} ${Number(extra.totalPrice || 0).toLocaleString("es-CO")}
              </li>
            `
          )
          .join("")
      : "<li>Sin servicios premium adicionales.</li>";

    return this.sendMail({
      from:
        this.fromAddress(),
      to: data.to,
      subject: `Reserva confirmada #${data.bookingId}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0D2B52;line-height:1.6">
          <h1 style="margin-bottom:8px">Reserva confirmada</h1>
          <p>Hola ${data.guestName},</p>
          <p>
            Tu pago fue aprobado y tu reserva concierge en Cartagena quedo
            confirmada. Nuestro equipo ya tiene todos los detalles para preparar
            tu experiencia.
          </p>

          <h2 style="font-size:18px;margin-top:24px">Resumen de reserva</h2>
          <ul>
            <li><strong>Numero de reserva:</strong> ${data.bookingId}</li>
            <li><strong>Producto:</strong> ${data.productName}</li>
            <li><strong>Fechas:</strong> ${
              data.checkIn?.toLocaleDateString("es-CO") || "Pendiente"
            } - ${data.checkOut?.toLocaleDateString("es-CO") || "Pendiente"}</li>
            <li><strong>Huespedes:</strong> ${data.guests || 1}</li>
            <li><strong>Total pagado:</strong> ${data.currency} ${Number(
              data.total
            ).toLocaleString("es-CO")}</li>
            <li><strong>Metodo de pago:</strong> ${
              data.paymentMethod || "Wompi"
            }</li>
            <li><strong>Asesor:</strong> ${
              data.advisorName || "Equipo concierge"
            }</li>
          </ul>

          <h2 style="font-size:18px;margin-top:24px">Servicios premium</h2>
          <ul>${extrasHtml}</ul>

          <p>
            Adjuntamos la factura PDF de tu reserva. Si necesitas ajustar algun
            detalle de llegada o servicios adicionales, responde a este correo.
          </p>

          <p style="margin-top:24px">
            <strong>Contacto:</strong><br />
            Cartagena Tailored Travel<br />
            reservations@cartagenatailoredtravel.com
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-booking-${data.bookingId}.pdf`,
          path: data.pdfPath,
        },
      ],
    });
  }

  async sendManualReservationComprobante(data: {
    to: string;
    guestName: string;
    reservationCode?: string | null;
    bookingId: number;
    productName: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    guests?: number;
    extras?: {
      name?: string;
      quantity?: number;
      totalPrice?: number;
    }[];
    total: number;
    currency: string;
    advisorName?: string | null;
    pdfPath: string;
  }) {
    const code = data.reservationCode || `#${data.bookingId}`;
    const extrasHtml = data.extras?.length
      ? data.extras
          .map(
            (extra) => `
              <li>
                ${extra.name || "Servicio premium"} x${extra.quantity || 1}
                - ${data.currency} ${Number(extra.totalPrice || 0).toLocaleString("es-CO")}
              </li>
            `
          )
          .join("")
      : "<li>Sin servicios premium adicionales.</li>";

    return this.sendMail({
      from:
        this.fromAddress(),
      to: data.to,
      subject: `Comprobante de reserva confirmada ${code}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0D2B52;line-height:1.6">
          <h1 style="margin-bottom:8px">Reserva confirmada</h1>
          <p>Hola ${data.guestName},</p>
          <p>
            Tu reserva concierge en Cartagena fue confirmada por nuestro equipo.
            Adjuntamos el comprobante PDF con todos los detalles de la reserva.
          </p>

          <h2 style="font-size:18px;margin-top:24px">Resumen de reserva</h2>
          <ul>
            <li><strong>Codigo de reserva:</strong> ${code}</li>
            <li><strong>Producto reservado:</strong> ${data.productName}</li>
            <li><strong>Fechas:</strong> ${
              data.checkIn?.toLocaleDateString("es-CO") || "Pendiente"
            } - ${data.checkOut?.toLocaleDateString("es-CO") || "Pendiente"}</li>
            <li><strong>Huespedes:</strong> ${data.guests || 1}</li>
            <li><strong>Total:</strong> ${data.currency} ${Number(
              data.total
            ).toLocaleString("es-CO")}</li>
            <li><strong>Asesor:</strong> ${
              data.advisorName || "Equipo concierge"
            }</li>
          </ul>

          <h2 style="font-size:18px;margin-top:24px">Servicios premium</h2>
          <ul>${extrasHtml}</ul>

          <p>
            Si necesitas ajustar horarios de llegada, servicios adicionales o
            alguna preferencia especial, responde este correo y tu asesor te
            acompanara.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `comprobante-${code}.pdf`,
          path: data.pdfPath,
        },
      ],
    });
  }

  async sendInternalContactRequest(data: {
    id: number;
    name: string;
    email: string;
    whatsapp: string;
    subject: string;
    message: string;
    interestType: string;
    createdAt: Date;
  }) {
    const to =
      process.env.CONTACT_TO_EMAIL ||
      process.env.MAIL_TO ||
      process.env.MAIL_USER ||
      "reservations@cartagenatailoredtravel.com";

    return this.sendMail({
      from:
        this.fromAddress(),
      to,
      subject: `Nueva solicitud de contacto #${data.id}: ${data.subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0D2B52;line-height:1.6">
          <h1 style="margin-bottom:8px">Nueva solicitud de contacto</h1>
          <p><strong>Fecha:</strong> ${data.createdAt.toLocaleString("es-CO")}</p>
          <p><strong>Interes:</strong> ${data.interestType}</p>
          <p><strong>Nombre:</strong> ${data.name}</p>
          <p><strong>Correo:</strong> ${data.email}</p>
          <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
          <p><strong>Asunto:</strong> ${data.subject}</p>
          <h2 style="font-size:18px;margin-top:24px">Mensaje</h2>
          <p>${data.message.replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });
  }

  async sendPreReservationRequestSummary(data: {
    to: string;
    subject: string;
    html: string;
    text: string;
    pdfPath: string;
    filename: string;
  }) {
    return this.sendMail({
      from: this.fromAddress(),
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
      attachments: [
        {
          filename: data.filename,
          path: data.pdfPath,
        },
      ],
    });
  }

  async sendReviewRequest(data: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    return this.sendMail({
      from: this.fromAddress(),
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    });
  }
}
