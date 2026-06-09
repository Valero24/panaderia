"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Eye,
  EyeOff,
  MailPlus,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
type BookingType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

type Review = {
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
  status: ReviewStatus;
  featured: boolean;
  submittedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  moderatedAt?: string | null;
  booking?: {
    id: number;
    reservationCode?: string | null;
    type: BookingType;
    productName?: string | null;
    checkIn: string;
    checkOut?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
  } | null;
};

type Filters = {
  status: string;
  targetType: string;
  featured: string;
  rating: string;
  search: string;
  from: string;
  to: string;
};

type ReviewStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  featured: number;
  approvedFeatured: number;
  recentApproved: number;
  averageApprovedRating: number;
  approvedDistribution: Record<"5" | "4" | "3" | "2" | "1", number>;
  approvedByType: Record<
    BookingType,
    {
      count: number;
      averageRating: number;
    }
  >;
  aggregateRatingReadiness: {
    enabled: boolean;
    minimumApprovedReviews: number;
    approvedReviews: number;
    eligible: boolean;
    reason?: string;
  };
};

type ReviewRequestSummary = {
  totalFound: number;
  sent: number;
  skipped: number;
  failed: number;
};

type RankingItem = {
  targetType: BookingType;
  id: number;
  title: string;
  slug?: string | null;
  averageRating: number;
  reviewCount: number;
  aggregateRatingReady: boolean;
};

type ReviewRankings = {
  topRatedProperties: RankingItem[];
  topRatedExperiences: RankingItem[];
  topRatedPackages: RankingItem[];
  mostReviewedProperties: RankingItem[];
  mostReviewedExperiences: RankingItem[];
  mostReviewedPackages: RankingItem[];
};

type RecalculateSummary = {
  propertiesUpdated: number;
  experiencesUpdated: number;
  packagesUpdated: number;
  errors: Array<{ targetType: BookingType; targetId: number; message: string }>;
};

const emptyStats: ReviewStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  hidden: 0,
  featured: 0,
  approvedFeatured: 0,
  recentApproved: 0,
  averageApprovedRating: 0,
  approvedDistribution: {
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0,
  },
  approvedByType: {
    PROPERTY: { count: 0, averageRating: 0 },
    EXPERIENCE: { count: 0, averageRating: 0 },
    PACKAGE: { count: 0, averageRating: 0 },
  },
  aggregateRatingReadiness: {
    enabled: false,
    minimumApprovedReviews: 5,
    approvedReviews: 0,
    eligible: false,
    reason: "Sin datos suficientes.",
  },
};

const emptyRankings: ReviewRankings = {
  topRatedProperties: [],
  topRatedExperiences: [],
  topRatedPackages: [],
  mostReviewedProperties: [],
  mostReviewedExperiences: [],
  mostReviewedPackages: [],
};

const initialFilters: Filters = {
  status: "",
  targetType: "",
  featured: "",
  rating: "",
  search: "",
  from: "",
  to: "",
};

const statusOptions = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "HIDDEN", label: "Ocultas" },
];

const targetOptions = [
  { value: "", label: "Todos" },
  { value: "PROPERTY", label: "Alojamientos" },
  { value: "EXPERIENCE", label: "Experiencias" },
  { value: "PACKAGE", label: "Paquetes" },
];

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label || status;
}

function targetLabel(type?: string | null) {
  return targetOptions.find((option) => option.value === type)?.label || "Producto";
}

function statusClass(status: string) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "HIDDEN") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-red-200 bg-red-50 text-red-700";
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

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (!value.trim()) return;
    params.set(key === "featured" ? "isFeatured" : key, value.trim());
  });

  params.set("limit", "50");

  const query = params.toString();
  return query ? `/reviews?${query}` : "/reviews";
}

export default function OpinionesPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [requestSummary, setRequestSummary] = useState<ReviewRequestSummary | null>(null);
  const [requestSummaryLabel, setRequestSummaryLabel] = useState("");
  const [recalculateSummary, setRecalculateSummary] =
    useState<RecalculateSummary | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>(emptyStats);
  const [rankings, setRankings] = useState<ReviewRankings>(emptyRankings);

  const totals = useMemo(() => {
    return {
      count: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejectedOrHidden: stats.rejected + stats.hidden,
      approvedAverage: stats.averageApprovedRating,
      approvedFeatured: stats.approvedFeatured,
      recentApproved: stats.recentApproved,
      aggregateReady: stats.aggregateRatingReadiness,
    };
  }, [stats]);

  async function fetchReviews(nextFilters = filters) {
    try {
      setLoading(true);
      setMessage("");

      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setReviews([]);
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const token = localStorage.getItem("token");
      const [response, statsResponse, rankingsResponse] = await Promise.all([
        fetch(apiUrl(buildQuery(nextFilters)), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(apiUrl("/reviews/stats"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(apiUrl("/reviews/admin/rankings"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);
      const data = await response.json().catch(() => null);
      const statsData = await statsResponse.json().catch(() => null);
      const rankingsData = await rankingsResponse.json().catch(() => null);

      if (!response.ok) {
        setReviews([]);
        setMessage(data?.message || "No se pudieron cargar las opiniones.");
        return;
      }

      if (statsResponse.ok && statsData) {
        setStats({
          ...emptyStats,
          ...statsData,
        });
      }

      if (rankingsResponse.ok && rankingsData) {
        setRankings({
          ...emptyRankings,
          ...rankingsData,
        });
      }

      setReviews(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando opiniones.");
    } finally {
      setLoading(false);
    }
  }

  async function recalculateRatings() {
    try {
      setActionLoading("recalculate-ratings");
      setMessage("");
      setRecalculateSummary(null);

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/reviews/admin/recalculate-ratings"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo recalcular el cache de calificaciones.");
      }

      setRecalculateSummary({
        propertiesUpdated: Number(data?.propertiesUpdated || 0),
        experiencesUpdated: Number(data?.experiencesUpdated || 0),
        packagesUpdated: Number(data?.packagesUpdated || 0),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      setMessage("Cache de calificaciones recalculado correctamente.");
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error recalculando el cache de calificaciones."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function updateStatus(review: Review, status: ReviewStatus) {
    try {
      setActionLoading(`${review.id}:${status}`);
      setMessage("");

      const reason =
        status === "APPROVED"
          ? "Aprobada desde panel de opiniones"
          : status === "REJECTED"
            ? "Rechazada desde panel de opiniones"
            : "Ocultada desde panel de opiniones";
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${review.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar la opinión.");
      }

      setMessage(`Opinión ${statusLabel(status).toLowerCase()} correctamente.`);
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error actualizando opinión.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateFeatured(review: Review, featured: boolean) {
    try {
      setActionLoading(`${review.id}:featured`);
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/reviews/${review.id}/featured`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isFeatured: featured }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar el destacado.");
      }

      setMessage(featured ? "Opinión destacada." : "Opinión retirada de destacados.");
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error actualizando destacado.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteReview(review: Review) {
    if (!window.confirm("¿Eliminar esta opinión? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setActionLoading(`${review.id}:delete`);
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

      setMessage("Opinión eliminada.");
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Error eliminando opinión.");
    } finally {
      setActionLoading("");
    }
  }

  async function sendPendingReviewRequests() {
    try {
      setActionLoading("send-pending-review-requests");
      setMessage("");
      setRequestSummary(null);
      setRequestSummaryLabel("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/reviews/admin/send-pending-requests"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudieron enviar las solicitudes pendientes.");
      }

      setRequestSummary({
        totalFound: Number(data?.totalFound || 0),
        sent: Number(data?.sent || 0),
        skipped: Number(data?.skipped || 0),
        failed: Number(data?.failed || 0),
      });
      setRequestSummaryLabel("Solicitudes iniciales");
      setMessage("Proceso de solicitudes de opinión ejecutado.");
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error enviando solicitudes pendientes."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function sendPendingReviewReminders() {
    try {
      setActionLoading("send-pending-review-reminders");
      setMessage("");
      setRequestSummary(null);
      setRequestSummaryLabel("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/reviews/admin/send-pending-reminders"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No se pudieron enviar los recordatorios pendientes.");
      }

      setRequestSummary({
        totalFound: Number(data?.totalFound || 0),
        sent: Number(data?.sent || 0),
        skipped: Number(data?.skipped || 0),
        failed: Number(data?.failed || 0),
      });
      setRequestSummaryLabel("Recordatorios");
      setMessage("Proceso de recordatorios de opinión ejecutado.");
      await fetchReviews();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error enviando recordatorios pendientes."
      );
    } finally {
      setActionLoading("");
    }
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(initialFilters);
    fetchReviews(initialFilters);
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && role !== "SUPERADMIN") {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700">
            El módulo de opiniones solo está disponible para Superadmin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 sm:p-6 lg:p-0">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
              Reputación verificada
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
              Opiniones
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Modera las reseñas enviadas por clientes después de completar una
              reserva. Solo las aprobadas pueden contar para uso público futuro.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={sendPendingReviewRequests}
              disabled={actionLoading === "send-pending-review-requests"}
              className="rounded-xl border-[#D4AF37]/30 bg-white"
            >
              <MailPlus className="mr-2 h-4 w-4" />
              {actionLoading === "send-pending-review-requests"
                ? "Enviando..."
                : "Enviar solicitudes pendientes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={sendPendingReviewReminders}
              disabled={actionLoading === "send-pending-review-reminders"}
              className="rounded-xl border-[#D4AF37]/30 bg-white"
            >
              <Bell className="mr-2 h-4 w-4" />
              {actionLoading === "send-pending-review-reminders"
                ? "Enviando..."
                : "Enviar recordatorios pendientes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={recalculateRatings}
              disabled={actionLoading === "recalculate-ratings"}
              className="rounded-xl border-[#D4AF37]/30 bg-white"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  actionLoading === "recalculate-ratings" ? "animate-spin" : ""
                }`}
              />
              {actionLoading === "recalculate-ratings"
                ? "Recalculando..."
                : "Recalcular calificaciones"}
            </Button>
            <Button
              type="button"
              onClick={() => fetchReviews()}
              disabled={loading}
              className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </header>

        {requestSummary && (
          <section className="space-y-3">
            {requestSummaryLabel && (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                {requestSummaryLabel}
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Encontradas" value={requestSummary.totalFound} />
              <Metric label="Enviadas" value={requestSummary.sent} />
              <Metric label="Omitidas" value={requestSummary.skipped} />
              <Metric label="Fallidas" value={requestSummary.failed} />
            </div>
          </section>
        )}

        {recalculateSummary && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
              Cache de calificaciones
            </p>
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Alojamientos actualizados" value={recalculateSummary.propertiesUpdated} />
              <Metric label="Experiencias actualizadas" value={recalculateSummary.experiencesUpdated} />
              <Metric label="Paquetes actualizados" value={recalculateSummary.packagesUpdated} />
              <Metric label="Errores" value={recalculateSummary.errors.length} />
            </div>
          </section>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total opiniones" value={totals.count} />
          <Metric label="Pendientes" value={totals.pending} />
          <Metric label="Aprobadas" value={totals.approved} />
          <Metric label="Rechazadas / ocultas" value={totals.rejectedOrHidden} />
          <Metric label="Ocultas" value={stats.hidden} />
          <Metric label="Destacadas" value={stats.featured} />
          <Metric
            label="Promedio aprobado"
            value={totals.approvedAverage ? totals.approvedAverage.toFixed(1) : "Sin datos"}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                Distribución pública
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Solo reseñas aprobadas cuentan para promedio, cantidad y futuro schema.
              </p>
              <div className="mt-4 space-y-3">
                {(["5", "4", "3", "2", "1"] as const).map((rating) => {
                  const value = stats.approvedDistribution?.[rating] || 0;
                  const percent = stats.approved
                    ? Math.round((value / stats.approved) * 100)
                    : 0;

                  return (
                    <div key={rating} className="grid grid-cols-[70px_1fr_44px] items-center gap-3 text-sm">
                      <span className="font-medium text-[#0D2B52]">{rating} estrellas</span>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1E8D0]">
                        <div
                          className="h-full rounded-full bg-[#D4AF37]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-right text-slate-500">{value}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                Por tipo
              </p>
              <div className="mt-4 space-y-3 text-sm">
                {(["PROPERTY", "EXPERIENCE", "PACKAGE"] as const).map((type) => {
                  const item = stats.approvedByType?.[type] || {
                    count: 0,
                    averageRating: 0,
                  };

                  return (
                    <div key={type} className="rounded-xl bg-[#F8F6F2] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-[#0D2B52]">{targetLabel(type)}</span>
                        <span className="text-slate-500">{item.count} aprobadas</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Promedio: {item.averageRating ? item.averageRating.toFixed(1) : "Sin datos"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                Preparación SEO
              </p>
              <p className="mt-3 text-2xl font-semibold text-[#0D2B52]">
                {totals.aggregateReady.eligible ? "Lista" : "En espera"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {totals.aggregateReady.reason ||
                  `Requiere ${totals.aggregateReady.minimumApprovedReviews} reseñas aprobadas reales.`}
              </p>
              <div className="mt-4 grid gap-2 text-sm">
                <InfoPill label="Aprobadas públicas" value={totals.approved} />
                <InfoPill label="Destacadas aprobadas" value={totals.approvedFeatured} />
                <InfoPill label="Aprobadas últimos 30 días" value={totals.recentApproved} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <RankingsCard
            title="Productos mejor calificados"
            groups={[
              { label: "Alojamientos", items: rankings.topRatedProperties },
              { label: "Experiencias", items: rankings.topRatedExperiences },
              { label: "Paquetes", items: rankings.topRatedPackages },
            ]}
          />
          <RankingsCard
            title="Productos con más reseñas"
            groups={[
              { label: "Alojamientos", items: rankings.mostReviewedProperties },
              { label: "Experiencias", items: rankings.mostReviewedExperiences },
              { label: "Paquetes", items: rankings.mostReviewedPackages },
            ]}
          />
        </section>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
          <CardContent className="space-y-4 p-4 lg:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
              <label className="space-y-1 xl:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Buscar
                </span>
                <Input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Cliente, producto, RES..."
                  className="rounded-xl"
                />
              </label>
              <SelectField
                label="Estado"
                value={filters.status}
                onChange={(value) => updateFilter("status", value)}
                options={statusOptions}
              />
              <SelectField
                label="Producto"
                value={filters.targetType}
                onChange={(value) => updateFilter("targetType", value)}
                options={targetOptions}
              />
              <SelectField
                label="Destacada"
                value={filters.featured}
                onChange={(value) => updateFilter("featured", value)}
                options={[
                  { value: "", label: "Todas" },
                  { value: "true", label: "Sí" },
                  { value: "false", label: "No" },
                ]}
              />
              <SelectField
                label="Calificación"
                value={filters.rating}
                onChange={(value) => updateFilter("rating", value)}
                options={[
                  { value: "", label: "Todos" },
                  { value: "5", label: "5 estrellas" },
                  { value: "4", label: "4 estrellas" },
                  { value: "3", label: "3 estrellas" },
                  { value: "2", label: "2 estrellas" },
                  { value: "1", label: "1 estrella" },
                ]}
              />
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Fecha desde
                </span>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(event) => updateFilter("from", event.target.value)}
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Fecha hasta
                </span>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(event) => updateFilter("to", event.target.value)}
                  className="rounded-xl"
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={clearFilters} className="rounded-xl">
                <XCircle className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
              <Button
                type="button"
                onClick={() => fetchReviews()}
                className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {message && (
          <p className="rounded-xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm text-[#0D2B52]">
            {message}
          </p>
        )}

        <Card className="hidden rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviada</TableHead>
                  <TableHead>Destacada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                      Cargando opiniones...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && reviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                      No hay opiniones para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <p className="font-semibold text-[#0D2B52]">
                        {review.publicName || review.customerName || "Cliente"}
                      </p>
                      <p className="text-xs text-slate-500">{maskEmail(review.customerEmail)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[#0D2B52]">
                        {review.booking?.productName || targetLabel(review.targetType)}
                      </p>
                      <p className="text-xs text-slate-500">
                          {review.booking?.reservationCode || `Reserva ${review.bookingId}`}
                      </p>
                    </TableCell>
                    <TableCell>{targetLabel(review.targetType)}</TableCell>
                    <TableCell>
                      <Rating value={review.rating} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={review.status} />
                    </TableCell>
                    <TableCell>{formatDate(review.submittedAt)}</TableCell>
                    <TableCell>
                      {review.featured ? (
                        <Badge variant="outline" className="border-[#D4AF37]/30 bg-[#FFF7D8] text-[#9A6A1F]">
                          Sí
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-500">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReviewActions
                        review={review}
                        loading={actionLoading}
                        onView={() => router.push(`/admin/opiniones/${review.id}`)}
                        onApprove={() => updateStatus(review, "APPROVED")}
                        onReject={() => updateStatus(review, "REJECTED")}
                        onHide={() => updateStatus(review, "HIDDEN")}
                        onFeatured={() => updateFeatured(review, !review.featured)}
                        onDelete={() => deleteReview(review)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <section className="space-y-3 lg:hidden">
          {loading && <div className="h-44 rounded-2xl premium-skeleton" />}
          {!loading && reviews.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white">
              <CardContent className="p-6 text-center text-sm text-slate-500">
                No hay opiniones para los filtros seleccionados.
              </CardContent>
            </Card>
          )}
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              loading={actionLoading}
              onApprove={() => updateStatus(review, "APPROVED")}
              onReject={() => updateStatus(review, "REJECTED")}
              onHide={() => updateStatus(review, "HIDDEN")}
              onFeatured={() => updateFeatured(review, !review.featured)}
              onDelete={() => deleteReview(review)}
              onView={() => router.push(`/admin/opiniones/${review.id}`)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-[#0D2B52]">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F6F2] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#0D2B52]">{value}</span>
    </div>
  );
}

function RankingsCard({
  title,
  groups,
}: {
  title: string;
  groups: Array<{ label: string; items: RankingItem[] }>;
}) {
  const hasItems = groups.some((group) => group.items.length > 0);

  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-4 lg:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
          {title}
        </p>
        {!hasItems && (
          <p className="mt-4 rounded-xl bg-[#F8F6F2] p-4 text-sm text-slate-500">
            Aún no hay productos con reseñas aprobadas.
          </p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.label} className="rounded-2xl bg-[#F8F6F2] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {group.label}
              </p>
              <div className="mt-3 space-y-2">
                {group.items.length === 0 && (
                  <p className="text-xs text-slate-500">Sin datos aprobados.</p>
                )}
                {group.items.slice(0, 3).map((item) => (
                  <div key={`${item.targetType}-${item.id}`} className="rounded-xl bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-[#0D2B52]">
                        {item.title}
                      </p>
                      {item.aggregateRatingReady && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          SEO listo
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{item.reviewCount} aprobadas</span>
                      <span>{item.averageRating ? item.averageRating.toFixed(1) : "0.0"} promedio</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0D2B52] outline-none focus:border-[#B48A5A]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`rounded-md ${statusClass(status)}`}>
      {statusLabel(status)}
    </Badge>
  );
}

function ReviewActions({
  review,
  loading,
  onView,
  onApprove,
  onReject,
  onHide,
  onFeatured,
  onDelete,
}: {
  review: Review;
  loading: string;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onFeatured: () => void;
  onDelete: () => void;
}) {
  const isBusy = loading.startsWith(`${review.id}:`);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onView}
        disabled={isBusy}
        className="rounded-xl"
      >
        <Eye className="mr-2 h-4 w-4" />
        Ver detalle
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onApprove}
        disabled={isBusy || review.status === "APPROVED"}
        className="rounded-xl"
      >
        <ThumbsUp className="mr-2 h-4 w-4" />
        Aprobar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onReject}
        disabled={isBusy || review.status === "REJECTED"}
        className="rounded-xl"
      >
        <ThumbsDown className="mr-2 h-4 w-4" />
        Rechazar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onHide}
        disabled={isBusy || review.status === "HIDDEN"}
        className="rounded-xl"
      >
        <EyeOff className="mr-2 h-4 w-4" />
        Ocultar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onFeatured}
        disabled={isBusy || (review.status !== "APPROVED" && !review.featured)}
        className="rounded-xl"
      >
        <Star className="mr-2 h-4 w-4" />
        {review.featured ? "Quitar destacado" : "Destacar"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onDelete}
        disabled={isBusy}
        className="rounded-xl text-red-700 hover:text-red-800"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
      </Button>
    </div>
  );
}

function ReviewCard({
  review,
  loading,
  onView,
  onApprove,
  onReject,
  onHide,
  onFeatured,
  onDelete,
}: {
  review: Review;
  loading: string;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onFeatured: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B48A5A]">
              Opinión
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#0D2B52]">
              {review.publicName || review.customerName || "Cliente"}
            </h2>
            <p className="text-xs text-slate-500">{maskEmail(review.customerEmail)}</p>
          </div>
          <StatusBadge status={review.status} />
        </div>

        <div className="rounded-xl bg-[#F8F6F2] p-3">
          <p className="text-sm font-semibold text-[#0D2B52]">
            {review.booking?.productName || targetLabel(review.targetType)}
          </p>
          <p className="text-xs text-slate-500">
            {review.booking?.reservationCode || `Reserva ${review.bookingId}`}
          </p>
        </div>

        <Rating value={review.rating} />

        <div>
          <p className="font-medium text-[#0D2B52]">{review.title || "Sin título"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{review.comment}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{formatDate(review.submittedAt)}</span>
          {review.featured && (
            <Badge variant="outline" className="border-[#D4AF37]/30 bg-[#FFF7D8] text-[#9A6A1F]">
              Destacada
            </Badge>
          )}
        </div>

        <ReviewActions
          review={review}
          loading={loading}
          onView={onView}
          onApprove={onApprove}
          onReject={onReject}
          onHide={onHide}
          onFeatured={onFeatured}
          onDelete={onDelete}
        />
      </CardContent>
    </Card>
  );
}
