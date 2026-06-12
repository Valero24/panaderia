export type User = {
  id: number;
  email: string;
  role: string;
};

export type PreReservationItem = {
  id: number;
  type: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
  referenceId: number;
  name?: string | null;
  unitPrice?: number | null;
  guests?: number;
  totalPrice?: number | null;
};

export type SelectedExtra = {
  id: number;
  name?: string;
  description?: string | null;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
};

export type EmailLog = {
  id: number;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  templateKey: string;
  status: string;
  provider?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
};

export type PreReservation = {
  id: string;
  customerName: string;
  email: string;
  customerPhone?: string | null;
  customerCountry?: string | null;
  paymentMethodPreferred?: string | null;
  specialRequests?: string | null;
  selectedExtras?: SelectedExtra[] | null;
  totalEstimate?: number | null;
  discountAmount?: number | null;
  taxesAmount?: number | null;
  manualAdjustmentAmount?: number | null;
  finalTotal?: number | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  internalNotes?: string | null;
  advisorNotes?: string | null;
  billingLegalOrganizationType?: string | null;
  billingIdentificationDocumentType?: string | null;
  billingIdentificationNumber?: string | null;
  billingVerificationDigit?: string | null;
  billingCustomerName?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingDepartment?: string | null;
  billingMunicipalityId?: string | null;
  billingMunicipalityName?: string | null;
  billingAddress?: string | null;
  billingTaxResponsibility?: string | null;
  billingTributeId?: string | null;
  billingDataAccepted?: boolean;
  billingIsComplete?: boolean;
  status: string;
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  items?: PreReservationItem[];
  payments?: PaymentRecord[];
  emailLogs?: EmailLog[];
  booking?: {
    id: number;
    preReservationId?: string | null;
    reservationCode?: string | null;
    invoicePath?: string | null;
    customerName?: string | null;
    totalPrice?: number | null;
    status?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    advisorName?: string | null;
    reviewRequestSentAt?: string | null;
    reviewSubmittedAt?: string | null;
    reviewTokenExpiresAt?: string | null;
    reviewReminderCount?: number | null;
    lastReviewReminderAt?: string | null;
    billingLegalOrganizationType?: string | null;
    billingIdentificationDocumentType?: string | null;
    billingIdentificationNumber?: string | null;
    billingVerificationDigit?: string | null;
    billingCustomerName?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    billingDepartment?: string | null;
    billingMunicipalityId?: string | null;
    billingMunicipalityName?: string | null;
    billingAddress?: string | null;
    billingTaxResponsibility?: string | null;
    billingTributeId?: string | null;
    billingDataAccepted?: boolean;
    billingIsComplete?: boolean;
    confirmationEmailSentAt?: string | null;
    confirmationWhatsappSentAt?: string | null;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
    cancelledById?: number | null;
    invoices?: InvoiceRecord[];
  } | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledById?: number | null;
  archiveReason?: string | null;
  archivedAt?: string | null;
  archivedById?: number | null;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentRecord = {
  id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paymentLinkUrl?: string | null;
  wompiReference?: string | null;
  wompiPaymentLinkId?: string | null;
  createdAt: string;
};

export type InvoiceRecord = {
  id: number;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  total?: number | null;
  currency?: string | null;
  pdfUrl?: string | null;
  createdAt?: string;
};

export type ExtraOption = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
};

export type PropertyOption = {
  id: number;
  title: string;
  pricePerNight: number;
  maxGuests: number;
  maxCapacity: number;
  extras?: ExtraOption[];
};

export type AdvisorOption = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
};

export type QuoteForm = {
  referenceId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  infants: string;
  discountAmount: string;
  taxesAmount: string;
  manualAdjustmentAmount: string;
  advisorNotes: string;
  internalNotes: string;
  selectedExtras: {
    id: number;
    quantity: number;
  }[];
};

export type OperationalNotification = {
  id: number;
  channel: string;
  recipient: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | string;
  provider?: string | null;
  error?: string | null;
  createdAt: string;
  sentAt?: string | null;
  preReservation?: {
    id: string;
    customerName: string;
    status: string;
    items?: {
      type: string;
      referenceId: number;
      name?: string | null;
    }[];
  } | null;
};

export type OperationalLog = {
  id: number;
  actorId?: number | null;
  actorRole?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  message?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  createdAt: string;
};
