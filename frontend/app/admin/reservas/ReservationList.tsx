"use client";

import { Calendar, Eye, Gem, Trash2, UserCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/admin/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PreReservation, User } from "./types";
import { date, guestsLabel, productLabel } from "./utils";

export function RequestsTable({
  requests,
  loading,
  emptyText,
  action,
  onView,
}: {
  requests: PreReservation[];
  loading: boolean;
  emptyText: string;
  action: (item: PreReservation) => React.ReactNode;
  onView: (item: PreReservation) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Cliente</TableHead>
            <TableHead className="text-xs">Producto</TableHead>
            <TableHead className="text-xs">Fechas</TableHead>
            <TableHead className="text-xs">Huéspedes</TableHead>
            <TableHead className="hidden text-xs 2xl:table-cell">Método</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <TableHead className="hidden text-xs 2xl:table-cell">Creada</TableHead>
            <TableHead className="text-xs text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <>
              {[1, 2, 3].map((item) => (
                <TableRow key={item}>
                  <TableCell colSpan={8} className="py-4">
                    <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.7fr_0.8fr]">
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
                  <Gem className="h-10 w-10 text-[#B48A5A]" />
                  <p className="mt-3 font-medium text-[#0D2B52]">{emptyText}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cuando entre una nueva solicitud, aparecerá aquí lista para
                    gestión personalizada.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            requests.map((item) => (
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
                  <p className="mt-1 text-xs text-slate-500">{item.email}</p>
                </TableCell>

                <TableCell>{productLabel(item)}</TableCell>

                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[#B48A5A]" />
                    {date(item.checkIn)} - {date(item.checkOut)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#B48A5A]" />
                    {guestsLabel(item)}
                  </div>
                </TableCell>

                <TableCell className="hidden 2xl:table-cell">
                  {item.paymentMethodPreferred || "Pendiente"}
                </TableCell>

                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>

                <TableCell className="hidden 2xl:table-cell">
                  {date(item.createdAt)}
                </TableCell>

                <TableCell className="text-right">{action(item)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
