"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Download,
  Eye,
  History,
  Loader2,
  RotateCcw,
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
import {
  BulkImportJob,
  BulkImportStats,
  BulkImportStatus,
  BulkImportType,
  cancelBulkImportJob,
  downloadBulkImportReport,
  fallbackTypes,
  fetchBulkImportJobs,
  formatDate,
  statusLabel,
  typeLabel,
} from "../bulk-import-shared";

type Filters = {
  type: "" | BulkImportType;
  status: "" | BulkImportStatus;
  fromDate: string;
  toDate: string;
  createdById: string;
  search: string;
  page: number;
};

const emptyFilters: Filters = {
  type: "",
  status: "",
  fromDate: "",
  toDate: "",
  createdById: "",
  search: "",
  page: 1,
};

function statusClass(status: BulkImportStatus) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PARTIALLY_COMPLETED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "FAILED" || status === "FAILED_VALIDATION") return "border-red-200 bg-red-50 text-red-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === "VALIDATED") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-[#D4AF37]/30 bg-[#F8F6F2] text-[#7A5A1A]";
}

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 text-2xl font-bold text-[#0D2B52]">{value}</div>
    </div>
  );
}

export default function BulkImportHistoryPage() {
  const [jobs, setJobs] = useState<BulkImportJob[]>([]);
  const [stats, setStats] = useState<BulkImportStats | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const typeOptions = useMemo(() => fallbackTypes, []);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const response = await fetchBulkImportJobs({
        ...nextFilters,
        limit: 20,
      });
      setJobs(response.items || []);
      setStats(response.summary || null);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch {
      setError("No fue posible cargar el historial de importaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(emptyFilters);
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  }

  async function handleCancel(job: BulkImportJob) {
    if (!job.actions?.canCancel) return;
    setActionMessage("");
    try {
      await cancelBulkImportJob(job.id);
      setActionMessage("Carga cancelada correctamente.");
      await load();
    } catch (error: any) {
      setActionMessage(error?.message || "No fue posible cancelar la carga.");
    }
  }

  async function handleDownload(job: BulkImportJob, report: "errors" | "result") {
    setActionMessage("");
    try {
      await downloadBulkImportReport(job.id, report);
    } catch {
      setActionMessage("No fue posible descargar el reporte.");
    }
  }

  const canPrevious = filters.page > 1;
  const canNext = filters.page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Carga masiva
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Historial de importaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Consulta archivos, resultados, errores y usuario responsable.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/carga-masiva">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total importaciones" value={stats?.total ?? 0} />
        <StatCard label="Completadas" value={stats?.completed ?? 0} />
        <StatCard label="Parciales" value={stats?.partial ?? 0} />
        <StatCard label="Fallidas" value={stats?.failed ?? 0} />
        <StatCard label="Registros creados" value={stats?.totalCreatedRows ?? 0} />
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#0D2B52]">
            <History className="h-5 w-5 text-[#B48A5A]" />
            <h2 className="text-xl font-semibold">Filtros</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value as Filters["type"])}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Todos los tipos</option>
              {typeOptions.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value as Filters["status"])}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusLabel).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
            />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
            />
            <Input
              placeholder="Usuario ID"
              value={filters.createdById}
              onChange={(event) => updateFilter("createdById", event.target.value)}
            />
            <Input
              placeholder="Buscar archivo o usuario"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => load(filters)} className="rounded-xl bg-[#0D2B52]">
              Filtrar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters(emptyFilters);
                load(emptyFilters);
              }}
              className="rounded-xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#0D2B52]">
              {total} importaciones encontradas
            </p>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-[#B48A5A]" />}
          </div>

          {(error || actionMessage) && (
            <p className="mb-4 rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4 text-sm text-[#0D2B52]">
              {error || actionMessage}
            </p>
          )}

          {!loading && jobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
              Aun no hay cargas registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Filas</TableHead>
                  <TableHead>Creadas</TableHead>
                  <TableHead>Fallidas</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                    <TableCell>{typeLabel(job.type, typeOptions)}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium text-[#0D2B52]">
                      {job.originalFileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass(job.status)}>
                        {statusLabel[job.status] || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{job.totalRows}</span>
                      <span className="text-xs text-slate-500">
                        {job.validRows} validas / {job.invalidRows} invalidas
                      </span>
                      <span className="block text-xs text-slate-400">
                        {percent(job.validRows, job.totalRows)} validas
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{job.createdRows}</span>
                      <span className="text-xs text-slate-500">
                        {percent(job.createdRows, job.validRows)} creadas
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{job.failedRows}</span>
                      <span className="text-xs text-slate-500">
                        {percent(job.failedRows, job.validRows)} fallidas
                      </span>
                    </TableCell>
                    <TableCell>
                      {job.createdBy?.email || job.createdByEmail || "No registrado"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/carga-masiva/historial/${job.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(job, "errors")}>
                          <Download className="mr-2 h-4 w-4" />
                          Errores
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(job, "result")}>
                          <Download className="mr-2 h-4 w-4" />
                          Resultado
                        </Button>
                        {job.actions?.canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleCancel(job)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={!canPrevious}
              onClick={() => {
                const next = { ...filters, page: filters.page - 1 };
                setFilters(next);
                load(next);
              }}
            >
              Anterior
            </Button>
            <span className="text-sm text-slate-500">
              Pagina {filters.page} de {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={!canNext}
              onClick={() => {
                const next = { ...filters, page: filters.page + 1 };
                setFilters(next);
                load(next);
              }}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
