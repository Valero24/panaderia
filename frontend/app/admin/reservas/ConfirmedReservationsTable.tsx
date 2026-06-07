"use client";

import { Calendar, Download, Eye, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/admin/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PreReservation, User } from "./types";
import { date, money, productLabel } from "./utils";

export function ConfirmedReservationsTable({
  requests,
  loading,
  emptyText,
  actionLoading,
  onView,
  onInvoice,
}: {
  requests: PreReservation[];
  loading: boolean;
  emptyText: string;
  actionLoading: string;
  onView: (item: PreReservation) => void;
  onInvoice: (item: PreReservation, mode: "view" | "download") => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Cliente</TableHead>
            <TableHead className="text-xs">Producto</TableHead>
            <TableHead className="text-xs">Fechas</TableHead>
            <TableHead className="text-xs">Total</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <TableHead className="text-xs">Código RES</TableHead>
            <TableHead className="text-xs">Asesor</TableHead>
            <TableHead className="text-xs text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <>
              {[1, 2, 3].map((item) => (
                <TableRow key={item}>
                  <TableCell colSpan={8} className="py-4">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr_0.9fr_0.9fr_1.1fr]">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-9 rounded-lg premium-skeleton"
                        />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}

          {!loading && requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center">
                  <FileText className="h-10 w-10 text-[#B48A5A]" />
                  <p className="mt-3 font-medium text-[#0D2B52]">{emptyText}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cuando un asesor genere una reserva, quedará aquí para
                    seguimiento y consulta del comprobante.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            requests.map((item) => {
              const reservationCode =
                item.booking?.reservationCode || "Pendiente";
              const advisorName =
                item.assignedTo?.name ||
                item.booking?.advisorName ||
                "Sin asesor";
              const invoiceAvailable = Boolean(item.booking?.invoicePath);
              const viewLoading =
                actionLoading === `${item.id}:invoice-view`;
              const downloadLoading =
                actionLoading === `${item.id}:invoice-download`;

              return (
                <TableRow
                  key={item.id}
                  className="transition-colors hover:bg-[#F8F6F2]/70"
                >
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="text-left font-medium text-[#0D2B52] transition hover:text-[#B48A5A]"
                    >
                      {item.customerName}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.email}
                    </p>
                  </TableCell>

                  <TableCell>{productLabel(item)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[#B48A5A]" />
                      {date(item.checkIn)} - {date(item.checkOut)}
                    </div>
                  </TableCell>

                  <TableCell>
                    {money(
                      item.booking?.totalPrice ||
                        item.finalTotal ||
                        item.totalEstimate
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-[#0D2B52]">
                      {reservationCode}
                    </span>
                  </TableCell>

                  <TableCell>{advisorName}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onView(item)}
                        className="h-9 rounded-xl px-3"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Ver detalle</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onInvoice(item, "view")}
                        disabled={!invoiceAvailable || viewLoading}
                        className="h-9 rounded-xl px-3"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{viewLoading ? "Abriendo..." : "Ver factura"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onInvoice(item, "download")}
                        disabled={!invoiceAvailable || downloadLoading}
                        className="h-9 rounded-xl px-3"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        <span>
                          {downloadLoading ? "Descargando..." : "Descargar PDF"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
