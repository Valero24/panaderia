"use client";

import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  SearchCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const reservationStatusMeta = {
  PENDING_ADVISOR: {
    label: "Pendiente de asesor",
    description: "Solicitud recibida, esperando atención del equipo.",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock,
  },
  ASSIGNED: {
    label: "Asignada",
    description: "Un asesor ya tomó la solicitud.",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    icon: UserCheck,
  },
  VALIDATING: {
    label: "En validación",
    description: "Disponibilidad y detalles comerciales en revisión.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: SearchCheck,
  },
  AVAILABLE: {
    label: "Disponible",
    description: "Lista para cotización final y pago.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  UNAVAILABLE: {
    label: "No disponible",
    description: "Hay conflicto de fechas o disponibilidad.",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
  PAYMENT_PENDING: {
    label: "Pendiente de pago",
    description: "Pago coordinado, listo o por gestionar.",
    className: "border-[#D4AF37]/40 bg-[#FFF8E1] text-[#8A651F]",
    icon: CreditCard,
  },
  PAID: {
    label: "Pagada",
    description: "Pago aprobado, preparando confirmación.",
    className: "border-green-200 bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
  CONFIRMED: {
    label: "Confirmada",
    description: "Reserva confirmada y operación cerrada.",
    className: "border-[#0D2B52]/20 bg-[#EAF0F8] text-[#0D2B52]",
    icon: CalendarCheck,
  },
  CANCELLED: {
    label: "Cancelada",
    description: "Solicitud cancelada sin eliminar registros.",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    icon: XCircle,
  },
};

type ReservationStatus = keyof typeof reservationStatusMeta;

export function getReservationStatusMeta(status?: string | null) {
  return (
    reservationStatusMeta[status as ReservationStatus] ||
    reservationStatusMeta.PENDING_ADVISOR
  );
}

export function getReservationStatusLabel(status?: string | null) {
  return getReservationStatusMeta(status).label;
}

export default function StatusBadge({
  status,
  showIcon = true,
}: {
  status?: string | null;
  showIcon?: boolean;
}) {
  const meta = getReservationStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${meta.className}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {meta.label}
    </Badge>
  );
}
