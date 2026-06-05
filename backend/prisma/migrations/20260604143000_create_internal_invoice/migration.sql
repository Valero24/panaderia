CREATE TYPE "InvoiceStatus" AS ENUM ('GENERATED', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'FAILED');

CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "preReservationId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerIdentification" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastStatusChangeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'GENERATED',
    "paymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "provider" TEXT NOT NULL DEFAULT 'INTERNAL',
    "mode" TEXT NOT NULL DEFAULT 'demo',
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");
CREATE INDEX "Invoice_preReservationId_idx" ON "Invoice"("preReservationId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_preReservationId_fkey" FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
