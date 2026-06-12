"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { auditActionLabel, roleLabel } from "@/lib/admin-log-labels";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
type BookingType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

type AuditLog = {
  id: number;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  message?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

type ReviewDetail = {
  id: number;
  bookingId: number;
  targetType: BookingType;
  targetId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCountry?: string | null;
  publicName?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  categoryRatings?: unknown;
  status: ReviewStatus;
  featured: boolean;
  submittedAt: string;
  approvedAt?: string | null;
  approvedById?: number | null;
  approvedByName?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  moderatedAt?: string | null;
  booking?: {
    id: number;
    reservationCode?: string | null;
    type: BookingType;
    productName?: string | null;
    checkIn: string;
    checkOut?: string | null;
    guests?: number | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    advisorId?: number | null;
    advisorName?: string | null;
  } | null;
  auditLogs?: AuditLog[];
};

const statusLabels: Record<ReviewStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  HIDDEN: "Oculta",
};

const typeLabels: Record<BookingType, string> = {
  PROPERTY: "Alojamiento",
  EXPERIENCE: "Experiencia",
  PACKAGE: "Paquete",
};

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sin dato";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "Sin correo";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function statusClass(status: ReviewStatus) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "HIDDEN") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function categoryEntries(value: unknown) {
  const record = asRecord(value);
  return Object.entries(record).filter(([, entryValue]) => entryValue !== null && entryValue !== undefined);
}

function statusHistoryLabel(status: string) {
  return statusLabels[status as ReviewStatus] || status;
}

export default function OpinionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewId = params.id;
  const [role, setRole] = useState("");
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");

  const categories = useMemo(
    () => categoryEntries(review?.categoryRatings),
    [review?.categoryRatings]
  );

  async function fetchReview() {
    try {
      setLoading(true);
      setMessage("");

      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setReview(null);
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${reviewId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setReview(null);
        setMessage(data?.message || "No se pudo cargar la opinión.");
        return;
      }

      setReview(data);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando la opinión.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: ReviewStatus) {
    if (!review) return;

    try {
      setActionLoading(status);
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${review.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          reason: `Actualizada desde detalle de opiniones a ${statusLabels[status]}`,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar el estado.");
      }

      setMessage("Estado actualizado correctamente.");
      await fetchReview();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error actualizando estado.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateFeatured(nextFeatured: boolean) {
    if (!review) return;

    try {
      setActionLoading("featured");
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${review.id}/featured`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isFeatured: nextFeatured }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar el destacado.");
      }

      setMessage(nextFeatured ? "Opinión destacada." : "Opinión retirada de destacados.");
      await fetchReview();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error actualizando destacado.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteReview() {
    if (!review || !window.confirm("¿Eliminar esta opinión? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setActionLoading("delete");
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${review.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo eliminar la opinión.");
      }

      router.push("/admin/opiniones");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error eliminando opinión.");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    fetchReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  if (!loading && role !== "SUPERADMIN") {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700">
            El detalle de opiniones solo está disponible para Superadmin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 sm:p-6 lg:p-0">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
                Reputación verificada
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
                Detalle de opinión
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Revisa, modera y deja trazabilidad sobre la opinión enviada por el cliente.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/opiniones")}
                className="rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button
                type="button"
                onClick={fetchReview}
                disabled={loading}
                className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </header>

        {message && (
          <p className="rounded-xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm text-[#0D2B52]">
            {message}
          </p>
        )}

        {loading && <div className="h-72 rounded-3xl premium-skeleton" />}

        {!loading && review && (
          <>
            <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={review.status} />
                    <Badge variant="outline" className="border-[#D4AF37]/30 text-[#9A6A1F]">
                      {review.featured ? "Destacada" : "No destacada"}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                      Comentario
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0D2B52]">
                      {review.title || "Sin título"}
                    </h2>
                    <div className="mt-3">
                      <Rating value={review.rating} />
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {review.comment}
                    </p>
                  </div>

                  <InfoGrid
                    items={[
                      ["Cliente", review.publicName || review.customerName || "Cliente"],
                      ["Correo", maskEmail(review.customerEmail)],
                      ["País", review.customerCountry || "Sin país registrado"],
                      ["Teléfono", review.customerPhone || "Sin teléfono"],
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <h2 className="text-lg font-semibold text-[#0D2B52]">
                    Acciones
                  </h2>
                  <ActionButton
                    label="Aprobar"
                    icon={<ThumbsUp className="mr-2 h-4 w-4" />}
                    disabled={actionLoading !== "" || review.status === "APPROVED"}
                    onClick={() => updateStatus("APPROVED")}
                  />
                  <ActionButton
                    label="Rechazar"
                    icon={<ThumbsDown className="mr-2 h-4 w-4" />}
                    disabled={actionLoading !== "" || review.status === "REJECTED"}
                    onClick={() => updateStatus("REJECTED")}
                  />
                  <ActionButton
                    label="Ocultar"
                    icon={<EyeOff className="mr-2 h-4 w-4" />}
                    disabled={actionLoading !== "" || review.status === "HIDDEN"}
                    onClick={() => updateStatus("HIDDEN")}
                  />
                  <ActionButton
                    label={review.featured ? "Quitar destacado" : "Destacar"}
                    icon={<Star className="mr-2 h-4 w-4" />}
                    disabled={
                      actionLoading !== "" ||
                      (review.status !== "APPROVED" && !review.featured)
                    }
                    onClick={() => updateFeatured(!review.featured)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={deleteReview}
                    disabled={actionLoading !== ""}
                    className="w-full rounded-xl text-red-700 hover:text-red-800"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold text-[#0D2B52]">
                    Reserva asociada
                  </h2>
                  <InfoGrid
                    items={[
                      ["Producto", review.booking?.productName || "Producto"],
                      ["Tipo", typeLabels[review.targetType]],
                      ["Reserva", `#${review.booking?.id || review.bookingId}`],
                      ["Código RES", review.booking?.reservationCode || "Sin código"],
                      ["Inicio", formatDate(review.booking?.checkIn)],
                      ["Fin", formatDate(review.booking?.checkOut)],
                      ["Huéspedes", String(review.booking?.guests || "Sin dato")],
                      ["Asesor", review.booking?.advisorName || "Sin asesor"],
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold text-[#0D2B52]">
                    Moderación
                  </h2>
                  <InfoGrid
                    items={[
                      ["Estado", statusLabels[review.status]],
                      ["Fecha de envío", formatDate(review.submittedAt)],
                      ["Aprobada", formatDate(review.approvedAt)],
                      ["Aprobada por", review.approvedByName || "Sin aprobador"],
                      ["Rechazada", formatDate(review.rejectedAt)],
                      ["Razón de rechazo", review.rejectionReason || "Sin razón registrada"],
                      ["Última moderación", formatDate(review.moderatedAt)],
                      ["Destacada", review.featured ? "Sí" : "No"],
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-semibold text-[#0D2B52]">
                  Calificaciones por categoría
                </h2>
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Esta opinión no tiene calificaciones por categoría.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {categories.map(([key, value]) => (
                      <div key={key} className="rounded-xl bg-[#F8F6F2] p-3">
                        <p className="text-xs font-medium text-slate-500">{key}</p>
                        <p className="mt-1 text-sm font-semibold text-[#0D2B52]">
                          {String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-semibold text-[#0D2B52]">
                  Historial básico
                </h2>
                {!review.auditLogs || review.auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay eventos de auditoría asociados a esta opinión.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {review.auditLogs.map((log) => (
                      <AuditItem key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge variant="outline" className={`rounded-md ${statusClass(status)}`}>
      {statusLabels[status]}
    </Badge>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[#B48A5A]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < value ? "fill-current" : "text-slate-300"}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-[#0D2B52]">{value}/5</span>
    </div>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#0D2B52]">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl"
    >
      {icon}
      {label}
    </Button>
  );
}

function AuditItem({ log }: { log: AuditLog }) {
  const previous = asRecord(log.previousValue);
  const next = asRecord(log.newValue);
  const previousStatus = typeof previous.status === "string" ? previous.status : "";
  const nextStatus = typeof next.status === "string" ? next.status : "";
  const statusChange =
    previousStatus && nextStatus
      ? `${statusHistoryLabel(previousStatus)} -> ${statusHistoryLabel(nextStatus)}`
      : "";

  return (
    <div className="rounded-xl border border-slate-100 bg-[#F8F6F2] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[#0D2B52]">
            {auditActionLabel(log.action)}
          </p>
          <p className="text-sm text-slate-500">
            {log.message || "Evento registrado"}
          </p>
        </div>
        <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>{log.actorName || roleLabel(log.actorRole) || "Sistema"}</span>
        {statusChange && <span>Estado: {statusChange}</span>}
      </div>
    </div>
  );
}
