import { apiUrl } from "@/lib/api";

export type BulkImportType =
  | "PROPERTY"
  | "EXPERIENCE"
  | "PACKAGE"
  | "DESTINATION"
  | "BLOG";

export type BulkImportStatus =
  | "DRAFT"
  | "UPLOADED"
  | "VALIDATING"
  | "VALIDATED"
  | "FAILED_VALIDATION"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED";

export type BulkImportTypeOption = {
  type: BulkImportType;
  label: string;
  description: string;
  templateSlug: string;
  enabled: boolean;
  acceptedExtensions: string[];
  importExecutionEnabled: boolean;
};

export type BulkImportJob = {
  id: number;
  type: BulkImportType;
  status: BulkImportStatus;
  originalFileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  source?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdRows: number;
  failedRows: number;
  errorSummary?: unknown;
  validationSummary?: unknown;
  metadata?: unknown;
  createdById?: number | null;
  createdByEmail?: string | null;
  createdByRole?: string | null;
  createdBy?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  validatedAt?: string | null;
  completedAt?: string | null;
};

export const acceptedExtensions = [".xlsx"];

export const fallbackTypes: BulkImportTypeOption[] = [
  {
    type: "PROPERTY",
    label: "Alojamientos",
    description: "Crear alojamientos masivamente desde Excel.",
    templateSlug: "alojamientos",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
  {
    type: "EXPERIENCE",
    label: "Experiencias",
    description: "Crear experiencias masivamente desde Excel.",
    templateSlug: "experiencias",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
  {
    type: "PACKAGE",
    label: "Paquetes",
    description: "Crear paquetes masivamente desde Excel.",
    templateSlug: "paquetes",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
  {
    type: "DESTINATION",
    label: "Destinos",
    description: "Crear destinos masivamente desde Excel.",
    templateSlug: "destinos",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
  {
    type: "BLOG",
    label: "Blog",
    description: "Crear artículos de blog masivamente desde Excel.",
    templateSlug: "blog",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
];

export const statusLabel: Record<BulkImportStatus, string> = {
  DRAFT: "Borrador",
  UPLOADED: "Cargado",
  VALIDATING: "Validando",
  VALIDATED: "Validado",
  FAILED_VALIDATION: "Validación fallida",
  IMPORTING: "Importando",
  COMPLETED: "Completado",
  FAILED: "Fallido",
};

export function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function typeLabel(type: string, options = fallbackTypes) {
  return options.find((item) => item.type === type)?.label || type;
}

export function formatFileSize(size?: number | null) {
  if (!size) return "Tamaño no registrado";
  const sizeKb = Math.max(1, Math.round(size / 1024));
  return `${sizeKb} KB`;
}

export function formatDate(value?: string | null) {
  if (!value) return "No registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function fetchBulkImportTypes() {
  const response = await fetch(apiUrl("/bulk-import/types"), {
    headers: authHeaders(),
  });

  if (!response.ok) return fallbackTypes;
  const data = (await response.json()) as BulkImportTypeOption[];
  return Array.isArray(data) && data.length > 0 ? data : fallbackTypes;
}

export async function fetchBulkImportJobs() {
  const response = await fetch(apiUrl("/bulk-import/jobs"), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo cargar el historial");
  const data = (await response.json()) as BulkImportJob[];
  return Array.isArray(data) ? data : [];
}

export async function fetchBulkImportJob(id: string) {
  const response = await fetch(apiUrl(`/bulk-import/jobs/${id}`), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo cargar el detalle");
  return (await response.json()) as BulkImportJob;
}
