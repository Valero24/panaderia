import { EmailEntityType } from "@prisma/client";

export type EmailLocale = "es" | "en" | "fr" | "pt" | "it";

export type EmailTemplateKey =
  | "PRERESERVATION_CREATED_CUSTOMER"
  | "PRERESERVATION_CREATED_ADMIN"
  | "PRERESERVATION_PAYMENT_LINK"
  | "BOOKING_CONFIRMED_CUSTOMER"
  | "BOOKING_CONFIRMED_ADMIN"
  | "PRERESERVATION_STATUS_CHANGED"
  | "PRERESERVATION_CANCELLED"
  | "REVIEW_REQUEST_CUSTOMER";

export type ReservationEmailContext = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productTitle: string;
  productTypeLabel: string;
  startDate: string;
  endDate: string;
  guests: string;
  totalAmount: string;
  currency: string;
  status: string;
  advisorName: string;
  advisorEmail: string;
  paymentLink: string;
  adminUrl: string;
  reviewLink: string;
  companyName: string;
  supportWhatsApp: string;
  supportEmail: string;
  reservationCode: string;
  cancellationReason: string;
};

export type SendReservationEmailOptions = {
  templateKey: EmailTemplateKey;
  to: string;
  cc?: string;
  bcc?: string;
  locale?: string | null;
  context: ReservationEmailContext;
  entityType: EmailEntityType;
  entityId: string | number;
  preReservationId?: string | null;
  bookingId?: number | null;
  attachments?: Array<{ filename: string; path: string }>;
  resend?: boolean;
  actor?: {
    userId?: number;
    role?: string;
    email?: string;
    name?: string;
  } | null;
};
