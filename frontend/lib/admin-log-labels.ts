const actionLabels: Record<string, string> = {
  ADVISOR_ASSIGNED: "Asesor asignado",
  BOOKING_CONFIRMED: "Reserva confirmada",
  BOOKING_CREATED: "Reserva creada",
  BLOG_POST_CREATED: "Articulo de blog creado",
  BLOG_POST_DELETED: "Articulo de blog eliminado",
  BLOG_POST_PUBLISHED: "Articulo de blog publicado",
  BLOG_POST_UNPUBLISHED: "Articulo de blog despublicado",
  BLOG_POST_UPDATED: "Articulo de blog actualizado",
  CHECKOUT_CURRENCY_APPLIED: "Moneda aplicada en checkout",
  CONTACT_CREATED: "Contacto creado",
  EXCHANGE_RATE_CREATED: "Tasa de cambio creada",
  EXCHANGE_RATE_DISABLED: "Tasa de cambio desactivada",
  EXCHANGE_RATE_UPDATED: "Tasa de cambio actualizada",
  FACTUS_COP_PAYLOAD_PREPARED: "Payload COP preparado para Factus",
  INVOICE_CANCELLED: "Factura cancelada",
  INVOICE_COP_GENERATED: "Factura interna generada",
  INVOICE_CREATED: "Factura interna creada",
  INVOICE_DETAIL_VIEWED: "Detalle de factura consultado",
  INVOICE_DUPLICATE_ATTEMPT: "Intento de factura duplicada",
  INVOICE_GENERATED: "Factura interna generada",
  INVOICE_MARKED_PAID: "Factura marcada como pagada",
  INVOICE_PAYMENT_STATUS_UPDATED: "Estado de pago de factura actualizado",
  INVOICE_STATUS_UPDATED: "Estado de factura actualizado",
  PAYMENT_CURRENCY_SAVED: "Moneda de pago guardada",
  PRE_RESERVATION_CREATED: "Solicitud creada",
  REQUEST_ASSIGNED: "Solicitud asignada",
  REQUEST_STATUS_UPDATED: "Estado de solicitud actualizado",
  SETTINGS_UPDATED: "Configuración actualizada",
  SYSTEM_HEALTH_ERROR: "Error de monitoreo del sistema",
};

const entityLabels: Record<string, string> = {
  AUDIT_LOG: "Registro",
  BOOKING: "Reserva",
  BLOG_POST: "Articulo de blog",
  BlogPost: "Articulo de blog",
  CONTACT: "Contacto",
  EXCHANGE_RATE: "Tasa de cambio",
  INVOICE: "Factura",
  OPERATIONAL_NOTIFICATION: "Notificación operativa",
  PAYMENT: "Pago",
  PRE_RESERVATION: "Solicitud",
  PROPERTY: "Alojamiento",
  SYSTEM: "Sistema",
  SYSTEM_SETTINGS: "Configuración",
  USER: "Usuario",
};

export function readableTechnicalLabel(value?: string | null) {
  if (!value) return "Sin dato";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function auditActionLabel(action?: string | null) {
  if (!action) return "Evento registrado";
  return actionLabels[action] || readableTechnicalLabel(action);
}

export function entityTypeLabel(entityType?: string | null) {
  if (!entityType) return "Entidad";
  return entityLabels[entityType] || readableTechnicalLabel(entityType);
}

export function roleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    ADVISOR: "Asesor",
    PUBLIC: "Público",
    SUPERADMIN: "Superadmin",
  };

  if (!role) return "Sistema";
  return labels[role] || readableTechnicalLabel(role);
}
