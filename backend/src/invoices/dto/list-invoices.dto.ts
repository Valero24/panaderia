import { InvoicePaymentStatus, InvoiceStatus } from "@prisma/client";

export type ListInvoicesDto = {
  status?: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  customerIdentification?: string;
  invoiceNumber?: string;
  from?: string;
  to?: string;
  take?: string;
};
