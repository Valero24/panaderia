export const realAvailabilityEnabled =
  process.env.NEXT_PUBLIC_ENABLE_REAL_AVAILABILITY === "true";

export const realPaymentsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_REAL_PAYMENTS === "true";

export const operationalStatuses = [
  "ASSIGNED",
  "VALIDATING",
  "AVAILABLE",
  "UNAVAILABLE",
  "PAYMENT_PENDING",
];

export const confirmedStatuses = ["CONFIRMED", "PAID"];

export const statusActions = [
  {
    label: "Validando",
    buttonLabel: "Marcar en validación",
    endpoint: "validating",
    nextStatus: "VALIDATING",
  },
  {
    label: "Disponible",
    buttonLabel: "Marcar disponible",
    endpoint: "available",
    nextStatus: "AVAILABLE",
  },
  {
    label: "No disponible",
    buttonLabel: "Marcar no disponible",
    endpoint: "unavailable",
    nextStatus: "UNAVAILABLE",
  },
  {
    label: "Pendiente pago",
    buttonLabel: "Pasar a pago coordinado",
    endpoint: "payment-pending",
    nextStatus: "PAYMENT_PENDING",
  },
];

export const allowedStatusTransitions: Record<string, string[]> = {
  ASSIGNED: ["VALIDATING", "AVAILABLE", "UNAVAILABLE"],
  VALIDATING: ["AVAILABLE", "UNAVAILABLE"],
  AVAILABLE: ["PAYMENT_PENDING", "VALIDATING", "UNAVAILABLE"],
  UNAVAILABLE: ["VALIDATING"],
  PAYMENT_PENDING: [],
  PAID: [],
  CONFIRMED: [],
  CANCELLED: [],
};

const nextStatusLabel: Record<string, string> = {
  PENDING_ADVISOR: "Primero toma la solicitud.",
  ASSIGNED: "Siguiente acción recomendada: pasar a VALIDATING.",
  VALIDATING: "Siguiente acción recomendada: marcar AVAILABLE o UNAVAILABLE.",
  AVAILABLE: "Siguiente acción recomendada: pasar a PAYMENT_PENDING.",
  UNAVAILABLE: "Revisa fechas/producto y vuelve a VALIDATING si aplica.",
  PAYMENT_PENDING: "Ya puedes generar el link de pago Wompi.",
  PAID: "Pago aprobado. Esperando confirmación final.",
  CONFIRMED: "Reserva confirmada.",
  CANCELLED: "Solicitud cancelada.",
};

const manualNextStatusLabel: Record<string, string> = {
  PENDING_ADVISOR: "Primero toma la solicitud.",
  ASSIGNED:
    "Marca disponibilidad manualmente o pasa a validación si necesitas revisar detalles.",
  VALIDATING:
    "Marca disponible o no disponible según la revisión del asesor.",
  AVAILABLE: "Solicitud disponible. Ya puedes generar la reserva manual.",
  UNAVAILABLE: "Revisa fechas/producto y vuelve a VALIDATING si aplica.",
  PAYMENT_PENDING:
    "Pago coordinado por asesor. También puedes generar la reserva manual.",
  PAID: "Pago aprobado. Esperando confirmación final.",
  CONFIRMED: "Reserva confirmada.",
  CANCELLED: "Solicitud cancelada.",
};

export function getOperationalStatusLabel(status: string) {
  return realAvailabilityEnabled || realPaymentsEnabled
    ? nextStatusLabel[status]
    : manualNextStatusLabel[status];
}
