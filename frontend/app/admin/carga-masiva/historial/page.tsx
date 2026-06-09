"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, History, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  fallbackTypes,
  fetchBulkImportJobs,
  formatDate,
  statusLabel,
  typeLabel,
} from "../bulk-import-shared";

export default function BulkImportHistoryPage() {
  const [jobs, setJobs] = useState<BulkImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const typeOptions = useMemo(() => fallbackTypes, []);

  useEffect(() => {
    fetchBulkImportJobs()
      .then(setJobs)
      .catch(() =>
        setError("No fue posible cargar el historial de cargas masivas.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Carga masiva
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Historial de cargas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Consulta archivos registrados, estado, filas y usuario responsable.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/carga-masiva">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#0D2B52]">
              <History className="h-5 w-5 text-[#B48A5A]" />
              <h2 className="text-xl font-semibold">Registros base</h2>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-[#B48A5A]" />}
          </div>

          {error && (
            <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {!loading && jobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
              Aún no hay cargas registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Totales</TableHead>
                  <TableHead>Válidas</TableHead>
                  <TableHead>Inválidas</TableHead>
                  <TableHead>Creadas</TableHead>
                  <TableHead>Fallidas</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{typeLabel(job.type, typeOptions)}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium text-[#0D2B52]">
                      {job.originalFileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {statusLabel[job.status] || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.totalRows}</TableCell>
                    <TableCell>{job.validRows}</TableCell>
                    <TableCell>{job.invalidRows}</TableCell>
                    <TableCell>{job.createdRows}</TableCell>
                    <TableCell>{job.failedRows}</TableCell>
                    <TableCell>
                      {job.createdByEmail || job.createdByRole || "No registrado"}
                    </TableCell>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/carga-masiva/historial/${job.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
