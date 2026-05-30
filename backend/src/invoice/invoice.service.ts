import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

type BookingInvoiceData = {
  bookingId: number;
  preReservationId: string;
  reservationCode?: string | null;
  productType?: string | null;
  companyName?: string;
  companyLegalId?: string;
  companyAddress?: string | null;
  companyPhones?: string | null;
  companyEmail?: string | null;
  companyLegalInfo?: string | null;
  companyPolicies?: string | null;
  invoiceFooter?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCountry?: string | null;
  productName: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  guests: number;
  extras?: {
    name?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  subtotal?: number | null;
  taxesAmount?: number | null;
  discountAmount?: number | null;
  total: number;
  currency: string;
  paymentMethod?: string | null;
  advisorName?: string | null;
  advisorEmail?: string | null;
  paymentStatus: string;
};

@Injectable()
export class InvoiceService {
  private ensureInvoicesDir() {
    const invoicesDir = path.join(process.cwd(), "uploads", "invoices");

    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    return invoicesDir;
  }

  private money(value?: number | null, currency = "COP") {
    return `${currency} ${Number(value || 0).toLocaleString("es-CO")}`;
  }

  private waitForPdfWrite(stream: fs.WriteStream) {
    return new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  }

  private findBrandLogo() {
    const candidates = [
      path.resolve(
        process.cwd(),
        "..",
        "frontend",
        "public",
        "branding",
        "LOGO-12.png"
      ),
      path.resolve(
        process.cwd(),
        "..",
        "frontend",
        "public",
        "branding",
        "LOGO-06.png"
      ),
      path.resolve(process.cwd(), "public", "branding", "LOGO-12.png"),
      path.resolve(process.cwd(), "public", "branding", "LOGO-06.png"),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  async generateInvoice(data: {
    guestName: string;
    propertyTitle: string;
    totalPrice: number;
    bookingId: number;
  }) {
    const doc = new PDFDocument();
    const invoicesDir = this.ensureInvoicesDir();
    const filePath = path.join(invoicesDir, `invoice-${data.bookingId}.pdf`);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).text("Cartagena Tailored Travel", { align: "center" });
    doc.moveDown();
    doc.fontSize(18).text("Luxury Reservation Invoice");
    doc.moveDown();
    doc.fontSize(14).text(`Guest: ${data.guestName}`);
    doc.text(`Property: ${data.propertyTitle}`);
    doc.text(`Booking ID: ${data.bookingId}`);
    doc.text(`Total Paid: $${data.totalPrice}`);
    doc.moveDown();
    doc.text("Thank you for choosing Cartagena Tailored Travel.");

    doc.end();
    await this.waitForPdfWrite(stream);

    return filePath;
  }

  async generateBookingInvoice(data: BookingInvoiceData) {
    const doc = new PDFDocument({
      margin: 32,
      size: "A4",
    });
    const invoicesDir = this.ensureInvoicesDir();
    const filePath = path.join(
      invoicesDir,
      `invoice-booking-${data.bookingId}.pdf`
    );
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const colors = {
      navy: "#0D2B52",
      navySoft: "#173A63",
      gold: "#B48A5A",
      beige: "#F8F6F2",
      ink: "#111827",
      muted: "#64748B",
      border: "#E5E0D6",
      green: "#166534",
      greenBg: "#EAF7EE",
    };

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const reservationCode =
      data.reservationCode || `PRE-${data.preReservationId}`;
    const invoiceNumber = `INV-${data.bookingId}`;
    const status = (data.paymentStatus || "CONFIRMADA").toUpperCase();
    const logo = this.findBrandLogo();

    const textValue = (value?: string | number | null) =>
      value === undefined || value === null || value === ""
        ? "No registrado"
        : String(value);

    const shortDate = (value?: Date | null) =>
      value
        ? value.toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
        : "Pendiente";

    const generatedAt = new Date().toLocaleString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const ensureSpace = (height: number) => {
      if (doc.y + height > bottom() - 12) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
    };

    const sectionTitle = (title: string) => {
      ensureSpace(22);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.gold)
        .text(title.toUpperCase(), left, doc.y, {
          characterSpacing: 1,
        });
      doc
        .moveTo(left, doc.y + 2)
        .lineTo(right, doc.y + 2)
        .strokeColor(colors.border)
        .stroke();
      doc.y += 8;
    };

    const field = (
      label: string,
      value: string | number | null | undefined,
      x: number,
      y: number,
      fieldWidth: number,
      valueSize = 9
    ) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(6.8)
        .fillColor(colors.gold)
        .text(label.toUpperCase(), x, y, {
          width: fieldWidth,
          characterSpacing: 0.4,
        });
      doc
        .font("Helvetica")
        .fontSize(valueSize)
        .fillColor(colors.ink)
        .text(textValue(value), x, y + 10, {
          width: fieldWidth,
          lineGap: 1,
          ellipsis: true,
        });
    };

    const card = (
      x: number,
      y: number,
      cardWidth: number,
      height: number,
      fill = "#FFFFFF"
    ) => {
      doc.roundedRect(x, y, cardWidth, height, 8).fillAndStroke(fill, colors.border);
    };

    const drawHeader = () => {
      doc.rect(0, 0, doc.page.width, 92).fill(colors.navy);
      doc.rect(0, 88, doc.page.width, 4).fill(colors.gold);

      if (logo) {
        try {
          doc.image(logo, left, 22, { fit: [126, 42] });
        } catch {
          doc
            .font("Helvetica-Bold")
            .fontSize(15)
            .fillColor("#FFFFFF")
            .text(data.companyName || "Cartagena Tailored Travel", left, 24, {
              width: 190,
            });
        }
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(15)
          .fillColor("#FFFFFF")
          .text(data.companyName || "Cartagena Tailored Travel", left, 24, {
            width: 190,
          });
      }

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#D8E1EC")
        .text(
          [
            data.companyLegalId,
            data.companyAddress,
            data.companyPhones,
            data.companyEmail,
          ]
            .filter(Boolean)
            .join(" | ") || "Luxury travel, villas y experiencias premium",
          left,
          62,
          { width: 310, lineGap: 1 }
        );

      const boxW = 176;
      const boxX = right - boxW;
      doc.roundedRect(boxX, 18, boxW, 58, 10).fill("#FFFFFF");
      doc.roundedRect(boxX + 14, 30, 72, 18, 9).fill(colors.greenBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(colors.green)
        .text(status, boxX + 14, 36, { width: 72, align: "center" });
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(colors.gold)
        .text("CODIGO RES", boxX + 94, 30, { width: 66, align: "right" });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(colors.navy)
        .text(reservationCode, boxX + 14, 52, {
          width: boxW - 28,
          align: "right",
        });

      doc.y = 108;
    };

    drawHeader();

    doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(colors.navy)
      .text("Comprobante de reserva confirmada", left, doc.y, {
        width: width - 150,
      });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(colors.muted)
      .text(`${invoiceNumber}\n${generatedAt}`, right - 145, 111, {
        width: 145,
        align: "right",
        lineGap: 2,
      });
    doc.y = 138;

    sectionTitle("Cliente y asesor");
    const gap = 10;
    const colW = (width - gap) / 2;
    const peopleY = doc.y;
    const peopleH = 72;
    card(left, peopleY, colW, peopleH);
    card(left + colW + gap, peopleY, colW, peopleH);

    field("Cliente", data.customerName, left + 12, peopleY + 10, colW - 24);
    field("Correo", data.customerEmail, left + 12, peopleY + 34, colW - 24, 8.3);
    field("Telefono", data.customerPhone, left + 12, peopleY + 54, colW - 24, 8.3);

    const advisorX = left + colW + gap + 12;
    field("Asesor", data.advisorName || "Equipo de atencion", advisorX, peopleY + 10, colW - 24);
    field("Contacto", data.advisorEmail || data.companyEmail, advisorX, peopleY + 34, colW - 24, 8.3);
    field("Pais", data.customerCountry, advisorX, peopleY + 54, colW - 24, 8.3);
    doc.y = peopleY + peopleH + 12;

    sectionTitle("Producto reservado");
    const productY = doc.y;
    const productH = 66;
    card(left, productY, width, productH, colors.beige);
    field("Tipo", data.productType || "Reserva premium", left + 12, productY + 11, 122);
    field("Producto", data.productName, left + 150, productY + 11, width - 162);
    field("Fechas", `${shortDate(data.checkIn)} - ${shortDate(data.checkOut)}`, left + 12, productY + 38, 205, 8.5);
    field("Huespedes", data.guests, left + 235, productY + 38, 70, 8.5);
    field("Metodo", data.paymentMethod || "Pago coordinado por asesor", left + 330, productY + 38, width - 342, 8.5);
    doc.y = productY + productH + 12;

    sectionTitle("Servicios premium");
    const tableHeaderHeight = 20;
    const rowH = 20;
    const tableX = left;
    const tableW = width;
    const drawTableHeader = () => {
      doc.roundedRect(tableX, doc.y, tableW, tableHeaderHeight, 7).fill(colors.navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor("#FFFFFF")
        .text("SERVICIO", tableX + 10, doc.y + 7, { width: tableW - 190 });
      doc.text("CANT.", tableX + tableW - 168, doc.y + 7, {
        width: 44,
        align: "right",
      });
      doc.text("VALOR", tableX + tableW - 108, doc.y + 7, {
        width: 98,
        align: "right",
      });
      doc.y += tableHeaderHeight;
    };

    drawTableHeader();
    const extras = data.extras?.length
      ? data.extras
      : [
          {
            name: "Sin servicios premium adicionales",
            quantity: 1,
            totalPrice: 0,
          },
        ];

    extras.forEach((extra, index) => {
      if (doc.y + rowH + 118 > bottom()) {
        doc.addPage();
        doc.y = doc.page.margins.top;
        sectionTitle("Servicios premium");
        drawTableHeader();
      }

      const rowY = doc.y;
      doc.rect(tableX, rowY, tableW, rowH).fill(index % 2 === 0 ? "#FFFFFF" : colors.beige);
      doc
        .font("Helvetica")
        .fontSize(8.4)
        .fillColor(colors.ink)
        .text(extra.name || "Servicio premium", tableX + 10, rowY + 6, {
          width: tableW - 190,
          ellipsis: true,
        });
      doc.text(String(extra.quantity || 1), tableX + tableW - 168, rowY + 6, {
        width: 44,
        align: "right",
      });
      doc
        .font("Helvetica-Bold")
        .fontSize(8.4)
        .fillColor(colors.navy)
        .text(this.money(extra.totalPrice, data.currency), tableX + tableW - 108, rowY + 6, {
          width: 98,
          align: "right",
        });
      doc.y = rowY + rowH;
    });
    doc.y += 10;

    ensureSpace(112);
    sectionTitle("Resumen financiero");
    const summaryY = doc.y;
    const summaryH = 86;
    const summaryW = 236;
    const confirmationW = width - summaryW - 10;
    card(left, summaryY, confirmationW, summaryH, "#F1E6D6");
    card(left + confirmationW + 10, summaryY, summaryW, summaryH);

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.gold)
      .text("CONFIRMACION", left + 12, summaryY + 12, { characterSpacing: 0.8 });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.navy)
      .text("Reserva registrada y confirmada.", left + 12, summaryY + 29, {
        width: confirmationW - 24,
      });
    doc
      .font("Helvetica")
      .fontSize(8.2)
      .fillColor("#334155")
      .text(
        "El equipo de atencion mantendra seguimiento de los detalles operativos antes de tu llegada.",
        left + 12,
        summaryY + 49,
        { width: confirmationW - 24, lineGap: 2 }
      );

    const summaryX = left + confirmationW + 10;
    const summaryRow = (label: string, value: string, y: number, strong = false) => {
      doc
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 10.8 : 8.2)
        .fillColor(strong ? colors.navy : colors.muted)
        .text(label, summaryX + 12, y, { width: 90 });
      doc
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 11 : 8.2)
        .fillColor(strong ? colors.navy : colors.ink)
        .text(value, summaryX + 96, y, {
          width: summaryW - 108,
          align: "right",
        });
    };
    summaryRow("Subtotal", this.money(data.subtotal, data.currency), summaryY + 12);
    summaryRow("Descuentos", this.money(data.discountAmount, data.currency), summaryY + 30);
    summaryRow("Impuestos", this.money(data.taxesAmount, data.currency), summaryY + 48);
    doc.moveTo(summaryX + 12, summaryY + 64).lineTo(summaryX + summaryW - 12, summaryY + 64).strokeColor(colors.border).stroke();
    summaryRow("Total final", this.money(data.total, data.currency), summaryY + 70, true);
    doc.y = summaryY + summaryH + 12;

    ensureSpace(86);
    sectionTitle("Informacion importante");
    const policyText =
      data.companyPolicies ||
      "Reserva confirmada por el equipo de atencion despues de validar disponibilidad y condiciones comerciales. Cambios, cancelaciones o servicios adicionales quedan sujetos a las politicas informadas por el asesor.";
    const policyY = doc.y;
    card(left, policyY, width, 58);
    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor("#334155")
      .text(policyText, left + 10, policyY + 10, {
        width: width - 20,
        height: 40,
        align: "justify",
        lineGap: 1,
        ellipsis: true,
      });
    doc.y = policyY + 66;

    if (data.companyLegalInfo) {
      ensureSpace(34);
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(colors.muted)
        .text(data.companyLegalInfo, left, doc.y, {
          width,
          height: 24,
          align: "justify",
          lineGap: 1,
          ellipsis: true,
        });
      doc.y += 28;
    }

    const footerText =
      data.invoiceFooter ||
      "Gracias por confiar en Cartagena Tailored Travel. Este comprobante certifica la reserva registrada en el sistema.";
    if (doc.y + 42 > bottom()) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
    const footerY = doc.y + 4;
    doc.roundedRect(left, footerY, width, 34, 8).fill(colors.navySoft);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#FFFFFF")
      .text(data.companyName || "Cartagena Tailored Travel", left + 12, footerY + 8, {
        width: 160,
      });
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#D8E1EC")
      .text(footerText, left + 185, footerY + 8, {
        width: width - 197,
        height: 18,
        ellipsis: true,
      });
    doc
      .font("Helvetica")
      .fontSize(6.6)
      .fillColor("#D8E1EC")
      .text(
        `Soporte: ${data.companyPhones || "WhatsApp"} | ${data.companyEmail || "Cartagena Tailored Travel"} | ${reservationCode}`,
        left + 12,
        footerY + 22,
        { width: width - 24, align: "center", ellipsis: true }
      );

    doc.end();
    await this.waitForPdfWrite(stream);

    return filePath;
  }
}
