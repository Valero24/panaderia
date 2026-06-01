import type { PreReservation, User } from "./types";

export function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

export function date(value?: string | null) {
  if (!value) return "Pendiente";

  return new Date(value).toLocaleDateString();
}

export function dateInput(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 10);
}

export function primaryItem(request: PreReservation) {
  return request.items?.[0];
}

export function productLabel(request: PreReservation) {
  const item = primaryItem(request);

  if (!item) return "Producto pendiente";

  return item.name || `${item.type} #${item.referenceId}`;
}

export function guestsLabel(request: PreReservation) {
  return primaryItem(request)?.guests || 1;
}

export function readUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getApiMessage(data: any, fallback: string) {
  if (!data) return fallback;

  if (Array.isArray(data.message)) {
    return data.message.join(" ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (data.message?.message) {
    return data.message.message;
  }

  return fallback;
}
