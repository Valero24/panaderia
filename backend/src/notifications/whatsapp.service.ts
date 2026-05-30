import { Injectable } from "@nestjs/common";

@Injectable()
export class WhatsappService {
  private normalizePhone(phone?: string | null) {
    if (!phone) return null;

    return phone.replace(/[^\d+]/g, "");
  }

  async sendConfirmationMessage(data: {
    to?: string | null;
    customerName: string;
    bookingId: number;
    productName: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    total: number;
    currency: string;
    advisorName?: string | null;
  }) {
    const to = this.normalizePhone(data.to);

    if (!to) {
      return {
        skipped: true,
        reason: "Cliente sin telefono",
      };
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    const provider = process.env.WHATSAPP_PROVIDER || "generic";
    const from = process.env.WHATSAPP_FROM_NUMBER;

    if (!apiUrl || !token) {
      return {
        skipped: true,
        reason: "WhatsApp no configurado",
      };
    }

    const message = [
      `Hola ${data.customerName}, tu reserva #${data.bookingId} esta confirmada.`,
      `Producto: ${data.productName}.`,
      `Fechas: ${data.checkIn?.toLocaleDateString("es-CO") || "Pendiente"} - ${data.checkOut?.toLocaleDateString("es-CO") || "Pendiente"}.`,
      `Total pagado: ${data.currency} ${Number(data.total).toLocaleString("es-CO")}.`,
      `Asesor: ${data.advisorName || "Equipo concierge"}.`,
      "Enviamos la factura PDF a tu correo.",
    ].join(" ");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
        from,
        to,
        message,
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`WhatsApp provider error: ${body}`);
    }

    return {
      skipped: false,
      provider,
    };
  }

  async sendManualReservationSummary(data: {
    to?: string | null;
    customerName: string;
    reservationCode?: string | null;
    bookingId: number;
    productName: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    total: number;
    currency: string;
  }) {
    const to = this.normalizePhone(data.to);

    if (!to) {
      return {
        skipped: true,
        reason: "Cliente sin telefono",
      };
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    const provider = process.env.WHATSAPP_PROVIDER || "generic";
    const from = process.env.WHATSAPP_FROM_NUMBER;

    if (!apiUrl || !token) {
      return {
        skipped: true,
        reason: "WhatsApp no configurado",
      };
    }

    const code = data.reservationCode || `#${data.bookingId}`;
    const message = [
      `Hola ${data.customerName}, tu reserva ${code} esta confirmada.`,
      `Producto: ${data.productName}.`,
      `Fechas: ${data.checkIn?.toLocaleDateString("es-CO") || "Pendiente"} - ${data.checkOut?.toLocaleDateString("es-CO") || "Pendiente"}.`,
      `Total: ${data.currency} ${Number(data.total).toLocaleString("es-CO")}.`,
      "El comprobante PDF fue enviado a tu correo.",
    ].join(" ");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
        from,
        to,
        message,
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`WhatsApp provider error: ${body}`);
    }

    return {
      skipped: false,
      provider,
    };
  }

  async sendOperationalMessage(data: {
    to: string;
    message: string;
  }) {
    const to = this.normalizePhone(data.to);

    if (!to) {
      return {
        skipped: true,
        reason: "Destinatario sin telefono",
      };
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    const provider = process.env.WHATSAPP_PROVIDER || "generic";
    const from = process.env.WHATSAPP_FROM_NUMBER;

    if (!apiUrl || !token) {
      return {
        skipped: true,
        reason: "WhatsApp no configurado",
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
        from,
        to,
        message: data.message,
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`WhatsApp provider error: ${body}`);
    }

    return {
      skipped: false,
      provider,
    };
  }
}
