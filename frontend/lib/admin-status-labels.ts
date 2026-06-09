export const adminReservationStatusLabels: Record<string, string> = {
  PENDING_ADVISOR: "Pendiente de asesor",
  ASSIGNED: "Asignada",
  VALIDATING: "En validación",
  AVAILABLE: "Disponible",
  UNAVAILABLE: "No disponible",
  PAYMENT_PENDING: "Pendiente de pago",
  PAID: "Pagada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const adminInvoiceStatusLabels: Record<string, string> = {
  GENERATED: "Generada",
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  FAILED: "Fallida",
};

export const adminPaymentStatusLabels: Record<string, string> = {
  APPROVED: "Aprobado",
  CANCELLED: "Cancelado",
  DECLINED: "Rechazado",
  FAILED: "Fallido",
  MANUAL: "Manual",
  PAID: "Pagado",
  PENDING: "Pendiente",
  PENDING_PAYMENT: "Pendiente de pago",
  UNPAID: "Sin pagar",
  PARTIALLY_PAID: "Pago parcial",
  REFUNDED: "Reembolsado",
  VOIDED: "Anulado",
};

export function adminReservationStatusLabel(status?: string | null) {
  return status ? adminReservationStatusLabels[status] || status : "Pendiente";
}

export function adminInvoiceStatusLabel(status?: string | null) {
  return status ? adminInvoiceStatusLabels[status] || status : "Sin estado";
}

export function adminPaymentStatusLabel(status?: string | null) {
  return status ? adminPaymentStatusLabels[status] || status : "Sin estado";
}

export function adminFinancialStatusLabel(status?: string | null) {
  if (!status) return "Sin estado";

  return (
    adminInvoiceStatusLabels[status] ||
    adminPaymentStatusLabels[status] ||
    status
  );
}
