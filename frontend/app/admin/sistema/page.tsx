"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  ShieldAlert,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";

type SystemHealth = {
  status: "ok" | "degraded" | string;
  app: string;
  timestamp: string;
  backend: {
    status: string;
    uptime: number;
    environment: string;
    nodeVersion: string;
    appVersion: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  database: {
    status: "ok" | "error" | string;
    latencyMs: number;
    errorMessage?: string;
  };
  counts: {
    users: number;
    activeAdvisors: number;
    activeProducts: {
      properties: number;
      experiences: number;
      packages: number;
    };
    pendingPreReservations: number;
    confirmedBookings: number;
    contacts: number;
    auditLogsLast24h: number;
    pendingOperationalNotifications: number;
  };
  flags: {
    demoModeEnabled: boolean;
    realPaymentsEnabled: boolean;
    realAvailabilityEnabled: boolean;
    whatsappNotificationsEnabled: boolean;
    dianMode: string;
    wompiEnabled: boolean;
    factusEnabled: boolean;
  };
  lastMigration?: {
    migration_name: string;
    finished_at?: string | null;
  } | null;
  criticalLogs: {
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    message?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
    createdAt: string;
  }[];
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

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const criticalActionLabels: Record<string, string> = {
  ERROR: "Error",
  FAILED: "Fallo",
  INVOICE_COP_GENERATED: "Factura interna generada",
  INVOICE_CREATED: "Factura interna creada",
  INVOICE_DUPLICATE_ATTEMPT: "Intento de factura duplicada",
  INVOICE_STATUS_UPDATED: "Estado de factura actualizado",
  INVOICE_PAYMENT_STATUS_UPDATED: "Estado de pago actualizado",
  SETTINGS_UPDATED: "Configuración actualizada",
  SYSTEM_HEALTH_ERROR: "Error de monitoreo",
  REVIEW_APPROVED: "Opinión aprobada",
  REVIEW_DELETED: "Opinion eliminada",
  REVIEW_HIDDEN: "Opinion oculta",
  REVIEW_RANKINGS_VIEWED: "Rankings internos de opiniones consultados",
  REVIEW_RATING_CACHE_UPDATED: "Cache de calificacion de producto actualizado",
  REVIEW_REJECTED: "Opinion rechazada",
  TRANSLATION_COMPLETED: "Traducción completada",
  TRANSLATION_FAILED: "Traduccion fallida",
  TRANSLATION_STARTED: "Traduccion iniciada",
  BULK_IMPORT_COMPLETED: "Importación masiva completada",
  BULK_IMPORT_FAILED: "Importacion masiva fallida",
};

const entityTypeLabels: Record<string, string> = {
  AUDIT_LOG: "Registro",
  BOOKING: "Reserva",
  CONTACT: "Contacto",
  EXCHANGE_RATE: "Tasa de cambio",
  INVOICE: "Factura",
  PAYMENT: "Pago",
  PRE_RESERVATION: "Solicitud",
  PROPERTY: "Alojamiento",
  SYSTEM_SETTINGS: "Configuración",
  USER: "Usuario",
};

function readableTechnicalLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function criticalActionLabel(action: string) {
  return criticalActionLabels[action] || readableTechnicalLabel(action);
}

function entityTypeLabel(entityType: string) {
  return entityTypeLabels[entityType] || readableTechnicalLabel(entityType);
}

export default function SistemaPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");

  async function fetchHealth() {
    try {
      setLoading(true);
      setMessage("");

      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/system-health"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "No se pudo cargar el estado del sistema.");
        return;
      }

      setHealth(data);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión consultando el estado del sistema.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
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
            El monitoreo técnico solo está disponible para Superadmin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Monitoreo del sistema
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Estado del sistema
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Vista técnica segura para revisar demo, base de datos, integraciones y actividad crítica.
          </p>
        </div>
        <Button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar estado
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      {loading || !health ? (
        <div className="h-96 rounded-2xl premium-skeleton" />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon={Server}
              label="Servidor backend"
              value="OK"
              status={health.backend.status}
              detail={`${health.backend.environment} - ${formatUptime(health.backend.uptime)}`}
            />
            <StatusCard
              icon={Database}
              label="Base de datos"
              value={health.database.status === "ok" ? "OK" : "Error"}
              status={health.database.status}
              detail={`${health.database.latencyMs} ms`}
            />
            <StatusCard
              icon={Activity}
              label="Modo demo"
              value={health.flags.demoModeEnabled ? "Activo" : "Inactivo"}
              status={health.flags.demoModeEnabled ? "ok" : "warning"}
              detail={`Consulta ${formatDate(health.timestamp)}`}
            />
            <StatusCard
              icon={CheckCircle2}
              label="Sistema"
              value={health.status === "ok" ? "Operativo" : "Revisar"}
              status={health.status}
              detail={health.app}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="p-5">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Estado de APIs
                </h2>
                <div className="mt-5 space-y-3">
                  <IntegrationRow
                    icon={WalletCards}
                    label="Wompi"
                    value={health.flags.wompiEnabled ? "Activo" : "Desactivado/demo"}
                    active={health.flags.wompiEnabled}
                  />
                  <IntegrationRow
                    icon={ShieldAlert}
                    label="Factus / DIAN"
                    value={health.flags.factusEnabled ? "Activo" : health.flags.dianMode || "mock"}
                    active={health.flags.factusEnabled}
                  />
                  <IntegrationRow
                    icon={Smartphone}
                    label="WhatsApp"
                    value={health.flags.whatsappNotificationsEnabled ? "Activo" : "Simulado/desactivado"}
                    active={health.flags.whatsappNotificationsEnabled}
                  />
                  <IntegrationRow
                    icon={Database}
                    label="Disponibilidad externa"
                    value={health.flags.realAvailabilityEnabled ? "Activa" : "Manual"}
                    active={health.flags.realAvailabilityEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="p-5">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Métricas rápidas
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Metric label="Usuarios" value={health.counts.users} />
                  <Metric label="Asesores activos" value={health.counts.activeAdvisors} />
                  <Metric
                    label="Productos activos"
                    value={`${health.counts.activeProducts.properties}/${health.counts.activeProducts.experiences}/${health.counts.activeProducts.packages}`}
                    hint="Aloj./Exp./Paq."
                  />
                  <Metric label="Solicitudes pendientes" value={health.counts.pendingPreReservations} />
                  <Metric label="Reservas confirmadas" value={health.counts.confirmedBookings} />
                  <Metric label="Contactos" value={health.counts.contacts} />
                  <Metric label="Registros 24h" value={health.counts.auditLogsLast24h} />
                  <Metric label="Notificaciones pendientes" value={health.counts.pendingOperationalNotifications} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="p-5">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Información técnica segura
                </h2>
                <div className="mt-5 space-y-3 text-sm">
                  <TechRow label="Entorno" value={health.backend.environment} />
                  <TechRow label="Tiempo activo" value={formatUptime(health.backend.uptime)} />
                  <TechRow label="Uso de memoria RSS" value={`${health.backend.memory.rssMb} MB`} />
                  <TechRow label="Heap usado" value={`${health.backend.memory.heapUsedMb} MB`} />
                  <TechRow label="Versión de Node" value={health.backend.nodeVersion} />
                  <TechRow label="Versión de la app" value={health.backend.appVersion} />
                  <TechRow
                    label="Última migración"
                    value={
                      health.lastMigration
                        ? `${health.lastMigration.migration_name} - ${formatDate(health.lastMigration.finished_at)}`
                        : "Sin dato"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#0D2B52]">
                    Últimos eventos críticos
                  </h2>
                  <Badge variant="outline" className="rounded-md">
                    {health.criticalLogs.length}
                  </Badge>
                </div>

                {health.criticalLogs.length === 0 ? (
                  <p className="mt-5 rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F2] px-4 py-5 text-center text-sm text-slate-500">
                    No hay eventos críticos recientes.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {health.criticalLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="rounded-md bg-white">
                            {criticalActionLabel(log.action)}
                          </Badge>
                          <span className="text-xs text-amber-700">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-[#0D2B52]">
                          {log.message || "Evento crítico registrado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entityTypeLabel(log.entityType)} #{log.entityId} - {log.actorName || "Sistema"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  status: string;
}) {
  const ok = status === "ok";

  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F6F2]">
            <Icon className="h-5 w-5 text-[#B48A5A]" />
          </div>
          <Badge
            variant="outline"
            className={`rounded-md ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
          >
            {ok ? "OK" : "Revisar"}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        <h2 className="mt-1 text-2xl font-semibold text-[#0D2B52]">{value}</h2>
        <p className="mt-2 text-xs text-slate-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

function IntegrationRow({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F6F2] px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#B48A5A]" />
        <span className="font-medium text-[#0D2B52]">{label}</span>
      </div>
      <Badge variant="outline" className={`rounded-md ${active ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-600"}`}>
        {value}
      </Badge>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#0D2B52]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-xl bg-[#F8F6F2] px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-[#0D2B52]">{value}</span>
    </div>
  );
}
