"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auditActionLabel, entityTypeLabel } from "@/lib/admin-log-labels";
import {
  BulkImportJob,
  BulkImportStatus,
  cancelBulkImportJob,
  downloadBulkImportReport,
  fallbackTypes,
  fetchBulkImportJob,
  formatDate,
  formatFileSize,
  statusLabel,
  typeLabel,
} from "../../bulk-import-shared";

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function statusClass(status: BulkImportStatus) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PARTIALLY_COMPLETED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "FAILED" || status === "FAILED_VALIDATION") return "border-red-200 bg-red-50 text-red-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-[#D4AF37]/30 bg-[#F8F6F2] text-[#7A5A1A]";
}

function summaryText(value: unknown) {
  if (!value) return "Sin informacion";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "No fue posible mostrar este resumen.";
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#0D2B52]">{value}</div>
    </div>
  );
}

function SimpleList({
  title,
  items,
  empty,
}: {
  title: string;
  items: any[];
  empty: string;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#0D2B52]">{title}</h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            {empty}
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-auto">
            {items.slice(0, 100).map((item, index) => (
              <div
                key={`${item.row || index}-${item.message || item.slug || index}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm"
              >
                <p className="font-semibold text-[#0D2B52]">
                  Fila {item.row || "N/A"} {item.field || item.column ? `- ${item.field || item.column}` : ""}
                </p>
                <p className="mt-1 text-slate-600">
                  {item.message || item.reason || item.name || item.slug || "Sin detalle"}
                </p>
                {(item.severity || item.status || item.type) && (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.severity || item.status || item.type}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTrailList({ items }: { items: NonNullable<BulkImportJob["auditTrail"]> }) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-[#0D2B52]">
            Actividad de auditoria
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Eventos relacionados con este job, ordenados desde el inicio del proceso.
          </p>
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            No hay eventos de auditoria asociados a esta carga.
          </p>
        ) : (
          <div className="max-h-[32rem] space-y-3 overflow-auto">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0D2B52]">
                      {auditActionLabel(item.action)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entityTypeLabel(item.entityType)} #{item.entityId}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.message || "Evento registrado"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.actorName || "Sistema"} {item.actorRole ? `- ${item.actorRole}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BulkImportDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<BulkImportJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const typeOptions = useMemo(() => fallbackTypes, []);

  async function load() {
    if (!params?.id) return;
    setLoading(true);
    setError("");
    try {
      setJob(await fetchBulkImportJob(params.id));
    } catch {
      setError("No fue posible cargar el detalle de la carga.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params?.id]);

  async function handleDownload(report: "errors" | "result") {
    if (!job) return;
    setMessage("");
    try {
      await downloadBulkImportReport(job.id, report);
    } catch {
      setMessage("No fue posible descargar el reporte.");
    }
  }

  async function handleCancel() {
    if (!job?.actions?.canCancel) return;
    setMessage("");
    try {
      await cancelBulkImportJob(job.id);
      setMessage("Carga cancelada correctamente.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "No fue posible cancelar la carga.");
    }
  }

  const result = (job?.resultSummary || {}) as any;
  const created = asArray(result.created);
  const failed = [
    ...asArray(result.failed),
    ...asArray(job?.errorSummary).filter((item) => item?.code === "IMPORT_ERROR"),
  ];
  const skipped = asArray(result.skipped);
  const errors = asArray(job?.errorSummary);
  const warnings = asArray(job?.warningSummary);
  const preview = asArray(job?.previewSummary);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Historial de importaciones
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Detalle de importacion
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Informacion general, errores, advertencias y resultado final.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/carga-masiva/historial">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al historial
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#B48A5A]" />
          Cargando detalle...
        </div>
      )}

      {(error || message) && (
        <p className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4 text-sm text-[#0D2B52]">
          {error || message}
        </p>
      )}

      {job && (
        <>
          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#F8F6F2] p-3 text-[#B48A5A]">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0D2B52]">
                      {job.originalFileName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {typeLabel(job.type, typeOptions)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={statusClass(job.status)}>
                  {statusLabel[job.status] || job.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleDownload("errors")}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar errores
                </Button>
                <Button variant="outline" onClick={() => handleDownload("result")}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar resultado
                </Button>
                <Button variant="outline" disabled>
                  Reintento no disponible en esta version
                </Button>
                {job.actions?.canCancel && (
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleCancel}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Tipo de carga" value={typeLabel(job.type, typeOptions)} />
                <DetailItem label="Archivo" value={job.originalFileName} />
                <DetailItem label="Tamano" value={formatFileSize(job.fileSize)} />
                <DetailItem label="Estado" value={statusLabel[job.status] || job.status} />
                <DetailItem label="Filas totales" value={job.totalRows} />
                <DetailItem label="Filas validas" value={job.validRows} />
                <DetailItem label="Filas invalidas" value={job.invalidRows} />
                <DetailItem label="Advertencias" value={job.warningRows || warnings.length} />
                <DetailItem label="Filas creadas" value={job.createdRows} />
                <DetailItem label="Filas fallidas" value={job.failedRows} />
                <DetailItem label="Filas omitidas" value={job.skippedRows || skipped.length} />
                <DetailItem
                  label="Usuario responsable"
                  value={
                    job.createdBy?.email ||
                    job.createdByEmail ||
                    job.createdByRole ||
                    "No registrado"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Fechas del proceso
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailItem label="Creado" value={formatDate(job.createdAt)} />
                  <DetailItem label="Archivo cargado" value={formatDate(job.uploadedAt)} />
                  <DetailItem label="Validado" value={formatDate(job.validatedAt)} />
                  <DetailItem label="Inicio importacion" value={formatDate(job.startedAt)} />
                  <DetailItem label="Finalizacion" value={formatDate(job.finishedAt)} />
                  <DetailItem label="Actualizado" value={formatDate(job.updatedAt)} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Vista previa validada
                </h2>
                <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {summaryText(preview.slice(0, 30))}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SimpleList title="Errores" items={errors} empty="No hay errores registrados." />
            <SimpleList
              title="Advertencias"
              items={warnings}
              empty="No hay advertencias registradas."
            />
            <SimpleList
              title="Registros creados"
              items={created}
              empty="No hay registros creados en este job."
            />
            <SimpleList
              title="Filas fallidas u omitidas"
              items={[...failed, ...skipped]}
              empty="No hay filas fallidas u omitidas."
            />
          </div>

          <AuditTrailList items={job.auditTrail || []} />
        </>
      )}
    </div>
  );
}
