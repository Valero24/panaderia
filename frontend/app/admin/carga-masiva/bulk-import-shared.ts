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
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type BulkImportTypeOption = {
  type: BulkImportType;
  label: string;
  description: string;
  templateSlug: string;
  enabled: boolean;
  acceptedExtensions: string[];
  importExecutionEnabled: boolean;
};

export type BulkImportStats = {
  total: number;
  completed: number;
  failed: number;
  partial: number;
  cancelled: number;
  totalRowsProcessed: number;
  totalCreatedRows: number;
  totalErrors: number;
  lastJob?: BulkImportJob | null;
  mostImportedType?: string | null;
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
  skippedRows?: number;
  warningRows?: number;
  errorSummary?: unknown;
  warningSummary?: unknown;
  previewSummary?: unknown;
  resultSummary?: unknown;
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
  actions?: {
    canCancel?: boolean;
    canDownloadErrors?: boolean;
    canDownloadResult?: boolean;
    retryAvailable?: boolean;
    retryMessage?: string;
  };
  rowSummary?: Record<string, number>;
  auditTrail?: Array<{
    id: number;
    actorId?: number | null;
    actorRole?: string | null;
    actorName?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    message?: string | null;
    metadata?: unknown;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  validatedAt?: string | null;
  completedAt?: string | null;
};

export type BulkImportHistoryResponse = {
  items: BulkImportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: BulkImportStats;
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
    description: "Crear articulos de blog masivamente desde Excel.",
    templateSlug: "blog",
    enabled: true,
    acceptedExtensions,
    importExecutionEnabled: false,
  },
];

export const statusLabel: Record<BulkImportStatus, string> = {
  DRAFT: "Borrador",
  UPLOADED: "Archivo cargado",
  VALIDATING: "Validando archivo",
  VALIDATED: "Validado",
  FAILED_VALIDATION: "Validacion fallida",
  IMPORTING: "Importando",
  COMPLETED: "Completado",
  PARTIALLY_COMPLETED: "Completado parcialmente",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
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
  if (!size) return "Tamano no registrado";
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

export function buildBulkImportQuery(
  filters: Record<string, string | number | undefined>
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export async function fetchBulkImportTypes() {
  const response = await fetch(apiUrl("/bulk-import/types"), {
    headers: authHeaders(),
  });

  if (!response.ok) return fallbackTypes;
  const data = (await response.json()) as BulkImportTypeOption[];
  return Array.isArray(data) && data.length > 0 ? data : fallbackTypes;
}

export async function fetchBulkImportJobs(
  filters: Record<string, string | number | undefined> = {}
) {
  const query = buildBulkImportQuery(filters);
  const response = await fetch(apiUrl(`/bulk-import/jobs${query ? `?${query}` : ""}`), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo cargar el historial");
  const data = await response.json();

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length || 20,
      totalPages: 1,
    } as BulkImportHistoryResponse;
  }

  return data as BulkImportHistoryResponse;
}

export async function fetchBulkImportJob(id: string) {
  const response = await fetch(apiUrl(`/bulk-import/jobs/${id}`), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo cargar el detalle");
  return (await response.json()) as BulkImportJob;
}

export async function fetchBulkImportStats(
  filters: Record<string, string | number | undefined> = {}
) {
  const query = buildBulkImportQuery(filters);
  const response = await fetch(apiUrl(`/bulk-import/jobs/stats${query ? `?${query}` : ""}`), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo cargar el resumen");
  return (await response.json()) as BulkImportStats;
}

export async function cancelBulkImportJob(id: number | string) {
  const response = await fetch(apiUrl(`/bulk-import/jobs/${id}/cancel`), {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo cancelar la carga");
  }

  return (await response.json()) as BulkImportJob;
}

export async function downloadBulkImportReport(
  id: number | string,
  report: "errors" | "result"
) {
  const response = await fetch(apiUrl(`/bulk-import/jobs/${id}/${report}.xlsx`), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("No se pudo descargar el reporte");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    report === "errors"
      ? `errores-importacion-${id}.xlsx`
      : `resultado-importacion-${id}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
