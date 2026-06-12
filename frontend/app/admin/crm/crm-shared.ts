import { apiUrl } from "@/lib/api";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "RESERVED"
  | "LOST"
  | "ARCHIVED";

export type LeadSource =
  | "WEBSITE"
  | "WHATSAPP"
  | "EMAIL"
  | "PHONE"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "REFERRAL"
  | "MANUAL"
  | "OTHER";

export type LeadPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";
export type LeadActivityType =
  | "CALL"
  | "WHATSAPP"
  | "EMAIL"
  | "NOTE"
  | "FOLLOW_UP"
  | "PROPOSAL"
  | "STATUS_CHANGE"
  | "BOOKING_CREATED"
  | "LOST_REASON"
  | "TASK";

export type Lead = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  preferredLanguage?: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  assignedAdvisorId?: number | null;
  assignedAdvisor?: { id: number; name: string; email: string; role: string } | null;
  interestedProductType?: ProductType | null;
  interestedProductId?: number | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  guests?: number | null;
  budget?: string | number | null;
  message?: string | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  convertedBookingId?: number | null;
  lostReason?: string | null;
  priorityScore?: number;
  healthStatus?: "GREEN" | "YELLOW" | "RED" | "GRAY" | string;
  slaStatus?: "AL_DIA" | "VENCIDO" | "CERRADO" | string;
  activities?: LeadActivity[];
  tasks?: LeadTask[];
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: number;
  leadId: number;
  type: LeadActivityType;
  title: string;
  description?: string | null;
  createdBy?: { id: number; name: string; email: string; role: string } | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type LeadTask = {
  id: number;
  leadId: number;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "OVERDUE";
  reminderAt?: string | null;
  reminderSentAt?: string | null;
  reminderType?: "IN_APP" | "EMAIL" | "WHATSAPP_MANUAL";
  assignedTo?: { id: number; name: string; email: string; role: string } | null;
  completedAt?: string | null;
  createdAt: string;
};

export type CrmMessageTemplate = {
  id: number;
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "NOTE";
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

export const statusLabels: Record<LeadStatus, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  PROPOSAL_SENT: "Propuesta enviada",
  NEGOTIATION: "Negociacion",
  RESERVED: "Reservado",
  LOST: "Perdido",
  ARCHIVED: "Archivado",
};

export const sourceLabels: Record<LeadSource, string> = {
  WEBSITE: "Sitio web",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  PHONE: "Telefono",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  REFERRAL: "Referido",
  MANUAL: "Manual",
  OTHER: "Otro",
};

export const priorityLabels: Record<LeadPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const productTypeLabels: Record<ProductType, string> = {
  PROPERTY: "Alojamiento",
  EXPERIENCE: "Experiencia",
  PACKAGE: "Paquete",
};

export const healthLabels: Record<string, string> = {
  GREEN: "Al dia",
  YELLOW: "Por vencer",
  RED: "Vencido",
  GRAY: "Cerrado",
};

export function authHeaders(extra: Record<string, string> = {}) {
  if (typeof window === "undefined") return extra;
  const token = localStorage.getItem("token") || "";
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no valida";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildQuery(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) params.set(key, String(value));
  });
  return params.toString();
}

export async function crmFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: authHeaders({
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string> | undefined),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "No se pudo completar la operacion");
  return data as T;
}
