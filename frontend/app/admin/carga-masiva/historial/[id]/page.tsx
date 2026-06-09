"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BulkImportJob,
  fallbackTypes,
  fetchBulkImportJob,
  formatDate,
  formatFileSize,
  statusLabel,
  typeLabel,
} from "../../bulk-import-shared";

function summaryText(value: unknown) {
  if (!value) return "Sin información";

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
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-[#0D2B52]">{value}</div>
    </div>
  );
}

export default function BulkImportDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<BulkImportJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const typeOptions = useMemo(() => fallbackTypes, []);

  useEffect(() => {
    if (!params?.id) return;

    fetchBulkImportJob(params.id)
      .then(setJob)
      .catch(() => setError("No fue posible cargar el detalle de la carga."))
      .finally(() => setLoading(false));
  }, [params?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Historial de cargas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Detalle de carga
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Información general, resumen de filas, fechas y usuario creador.
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

      {error && (
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
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
                <Badge variant="outline">
                  {statusLabel[job.status] || job.status}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Tipo de carga" value={typeLabel(job.type, typeOptions)} />
                <DetailItem label="Archivo" value={job.originalFileName} />
                <DetailItem label="Tamaño" value={formatFileSize(job.fileSize)} />
                <DetailItem label="Estado" value={statusLabel[job.status] || job.status} />
                <DetailItem label="Filas totales" value={job.totalRows} />
                <DetailItem label="Filas válidas" value={job.validRows} />
                <DetailItem label="Filas inválidas" value={job.invalidRows} />
                <DetailItem label="Filas creadas" value={job.createdRows} />
                <DetailItem label="Filas fallidas" value={job.failedRows} />
                <DetailItem
                  label="Usuario creador"
                  value={
                    job.createdBy?.email ||
                    job.createdByEmail ||
                    job.createdByRole ||
                    "No registrado"
                  }
                />
                <DetailItem label="Creado" value={formatDate(job.createdAt)} />
                <DetailItem label="Actualizado" value={formatDate(job.updatedAt)} />
                <DetailItem label="Inicio" value={formatDate(job.startedAt)} />
                <DetailItem label="Finalización" value={formatDate(job.finishedAt)} />
                <DetailItem label="Validado" value={formatDate(job.validatedAt)} />
                <DetailItem label="Completado" value={formatDate(job.completedAt)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Resumen de validación
                </h2>
                <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {summaryText(job.validationSummary)}
                </pre>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Errores
                </h2>
                <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {summaryText(job.errorSummary)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
