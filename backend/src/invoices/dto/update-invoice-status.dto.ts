import { InvoiceStatus } from "@prisma/client";

export type UpdateInvoiceStatusDto = {
  status: InvoiceStatus;
};
