import { InvoicePaymentStatus } from "@prisma/client";

export type UpdateInvoicePaymentStatusDto = {
  paymentStatus: InvoicePaymentStatus;
};
