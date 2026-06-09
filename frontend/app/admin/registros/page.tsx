"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Filter, ShieldAlert } from "lucide-react";
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
import { auditActionLabel, entityTypeLabel, roleLabel } from "@/lib/admin-log-labels";
import { adminSystemMessages, adminTableLabels } from "@/lib/admin-ui-labels";

type AuditLog = {
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

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function removeEmptyLogValues(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(removeEmptyLogValues)
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, removeEmptyLogValues(item)] as const)
        .filter(([, item]) => item !== undefined)
    );
  }

  return value;
}

function parseLogValue(value: unknown) {
  if (!value) return "";

  try {
    let parsedValue = value;

    for (let index = 0; index < 2; index += 1) {
      if (typeof parsedValue !== "string") break;

      const trimmed = parsedValue.trim();
      if (
        !trimmed.startsWith("{") &&
        !trimmed.startsWith("[") &&
        !trimmed.startsWith('"')
      ) {
        break;
      }

      parsedValue = JSON.parse(trimmed);
    }

    return removeEmptyLogValues(parsedValue);
  } catch {
    return typeof value === "string" ? value : "";
  }
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatLogItem(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString("es-CO");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return formatDate(value);
    }

    return value;
  }
  if (Array.isArray(value)) return `${value.length} item(s)`;

  return "Ver detalle";
}

function formatLogDetail(log: AuditLog) {
  const parsed = parseLogValue(log.newValue || log.metadata || log.previousValue);

  if (!parsed) return "";
  if (typeof parsed !== "object") return String(parsed);
  if (Array.isArray(parsed)) return `${parsed.length} item(s) registrados`;

  const entries = Object.entries(parsed as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 8);

  if (!entries.length) return "";

  return entries
    .map(([key, value]) => `${humanizeKey(key)}: ${formatLogItem(value)}`)
    .join(" · ");
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    entityType: "",
    entityId: "",
    action: "",
    actorId: "",
  });

  const user = useMemo(() => readUser(), []);
  const isSuperAdmin = user?.role === "SUPERADMIN";

  async function fetchLogs() {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ take: "120" });

      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });

      const res = await fetch(apiUrl(`/operational-logs?${params}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "No se pudo cargar el historial.");
        setLogs([]);
        return;
      }

      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Ocurrió un error cargando historial operativo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700">
            Solo Superadmin puede consultar el historial operativo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Trazabilidad
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Historial operativo
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Acciones administrativas, cambios de estado y eventos críticos del flujo asistido.
          </p>
        </div>
        <Button
          type="button"
          onClick={fetchLogs}
          className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
        >
          <Activity className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Entidad: PreReservation"
              value={filters.entityType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  entityType: event.target.value,
                }))
              }
            />
            <Input
              placeholder="ID entidad"
              value={filters.entityId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  entityId: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Acción"
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  action: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Actor ID"
              value={filters.actorId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  actorId: event.target.value,
                }))
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={fetchLogs}>
              <Filter className="mr-2 h-4 w-4" />
              {adminTableLabels.applyFilters}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setFilters({
                  entityType: "",
                  entityId: "",
                  action: "",
                  actorId: "",
                })
              }
            >
              {adminTableLabels.clearFilters}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {adminTableLabels.showingResults}: {logs.length} registros
          </p>
        </CardContent>
      </Card>

      {message && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      {adminSystemMessages.loading}
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No hay eventos para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="min-w-40 text-xs text-slate-500">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-md">
                          {auditActionLabel(log.action)}
                        </Badge>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Código: {log.action}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium text-[#0D2B52]">{entityTypeLabel(log.entityType)}</p>
                        <p className="text-xs text-slate-500">{log.entityId}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p>{log.actorName || "Sistema"}</p>
                        <p className="text-xs text-slate-500">
                          {roleLabel(log.actorRole || "PUBLIC")} {log.actorId ? `#${log.actorId}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-slate-600">
                        {log.message || "Evento registrado"}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="line-clamp-3 break-words text-xs text-slate-500">
                          {formatLogDetail(log) || "Sin detalle adicional"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
