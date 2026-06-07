"use client";

import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MessageCircle,
  Receipt,
  SearchCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

type TimelinePayment = {
  status?: string;
  paymentLinkUrl?: string | null;
  createdAt?: string;
};

type TimelineBooking = {
  invoicePath?: string | null;
  confirmationEmailSentAt?: string | null;
  confirmationWhatsappSentAt?: string | null;
  cancelledAt?: string | null;
};

export type ReservationTimelineRequest = {
  status: string;
  createdAt?: string;
  assignedToId?: number | null;
  updatedAt?: string;
  cancelledAt?: string | null;
  payments?: TimelinePayment[];
  booking?: TimelineBooking | null;
};

const order = [
  "created",
  "assigned",
  "validating",
  "quoted",
  "payment",
  "paid",
  "confirmed",
  "invoice",
  "whatsapp",
  "cancelled",
];

const realPaymentsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_REAL_PAYMENTS === "true";

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReservationTimeline({
  request,
}: {
  request: ReservationTimelineRequest;
}) {
  const latestPayment = request.payments?.[0];
  const paid =
    latestPayment?.status === "APPROVED" ||
    latestPayment?.status === "PAID" ||
    request.status === "PAID" ||
    request.status === "CONFIRMED";
  const cancelled =
    request.status === "CANCELLED" ||
    Boolean(request.cancelledAt || request.booking?.cancelledAt);

  const completed = new Set<string>(["created"]);

  if (request.assignedToId) completed.add("assigned");
  if (
    ["VALIDATING", "AVAILABLE", "UNAVAILABLE", "PAYMENT_PENDING", "PAID", "CONFIRMED"].includes(
      request.status
    )
  ) {
    completed.add("validating");
  }
  if (
    ["AVAILABLE", "PAYMENT_PENDING", "PAID", "CONFIRMED"].includes(request.status)
  ) {
    completed.add("quoted");
  }
  if (request.status === "PAYMENT_PENDING" || latestPayment) {
    completed.add("payment");
  }
  if (paid) completed.add("paid");
  if (request.status === "CONFIRMED") completed.add("confirmed");
  if (request.booking?.invoicePath) completed.add("invoice");
  if (request.booking?.confirmationEmailSentAt) completed.add("invoice");
  if (request.booking?.confirmationWhatsappSentAt) completed.add("whatsapp");
  if (cancelled) completed.add("cancelled");

  const items = [
    {
      key: "created",
      label: "Solicitud creada",
      description: "El cliente envió la solicitud asistida.",
      icon: Clock,
      date: formatDate(request.createdAt),
    },
    {
      key: "assigned",
      label: "Asesor asignado",
      description: "La solicitud tiene un asesor asignado.",
      icon: UserCheck,
    },
    {
      key: "validating",
      label: "Validación",
      description: "Fechas, disponibilidad y detalles en revisión.",
      icon: SearchCheck,
    },
    {
      key: "quoted",
      label: "Cotización",
      description: "Servicios, impuestos y total final revisados.",
      icon: Receipt,
    },
    {
      key: "payment",
      label: realPaymentsEnabled
        ? "Pendiente de pago"
        : "Pago coordinado",
      description: realPaymentsEnabled
        ? "Link de pago Wompi generado o listo para generar."
        : "Pago gestionado manualmente por el asesor.",
      icon: CreditCard,
    },
    {
      key: "paid",
      label: realPaymentsEnabled ? "Pago aprobado" : "Confirmación manual",
      description: realPaymentsEnabled
        ? "Wompi confirmó el pago."
        : "El equipo confirmó la reserva sin pago real integrado.",
      icon: CheckCircle2,
    },
    {
      key: "confirmed",
      label: "Reserva confirmada",
      description: "Reserva final creada en el sistema.",
      icon: CalendarCheck,
    },
    {
      key: "invoice",
      label: "Factura enviada",
      description: "Factura PDF generada y correo final enviado.",
      icon: FileText,
    },
    {
      key: "whatsapp",
      label: "WhatsApp enviado",
      description: "Mensaje de confirmación enviado al cliente.",
      icon: MessageCircle,
    },
    {
      key: "cancelled",
      label: "Cancelación",
      description: "Registro cancelado por operación.",
      icon: XCircle,
      date: formatDate(request.cancelledAt || request.booking?.cancelledAt),
    },
  ].filter((item) => item.key !== "cancelled" || cancelled);
  const visibleKeys = items.map((item) => item.key);
  const completedVisible = visibleKeys.filter((key) => completed.has(key));
  const progress = Math.round(
    (completedVisible.length / Math.max(visibleKeys.length, 1)) * 100
  );
  const activeKey =
    visibleKeys.find((key) => !completed.has(key)) ||
    completedVisible[completedVisible.length - 1];

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0D2B52]">
            Timeline operativo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {completedVisible.length} de {visibleKeys.length} hitos completados
          </p>
        </div>
        <span className="rounded-md bg-[#F8F6F2] px-2.5 py-1 text-xs font-medium text-[#8A651F]">
          {progress}%
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#B48A5A] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-3">
      {items.map((item, index) => {
        const Icon = item.icon;
        const done = completed.has(item.key);
        const active = item.key === activeKey;
        const isFuture = !done;

        return (
          <div key={item.key} className="relative flex gap-3">
            {index < items.length - 1 && (
              <div className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-[#D4AF37]/25" />
            )}
            <div
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? "border-[#B48A5A] bg-[#FFF8E1] text-[#8A651F]"
                  : active
                    ? "border-[#0D2B52]/30 bg-[#EAF0F8] text-[#0D2B52] ring-4 ring-[#EAF0F8]"
                  : "border-slate-200 bg-white text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className={`pb-4 ${isFuture ? "opacity-55" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[#0D2B52]">{item.label}</p>
                {done && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    Completado
                  </span>
                )}
                {active && !done && (
                  <span className="rounded-md bg-[#EAF0F8] px-2 py-0.5 text-xs text-[#0D2B52]">
                    Siguiente
                  </span>
                )}
                {item.date && (
                  <span className="text-xs text-slate-400">{item.date}</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
