"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Gem,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ReservationTimeline from "@/components/admin/reservation-timeline";
import StatusBadge, {
  getReservationStatusMeta,
} from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

const realAvailabilityEnabled =
  process.env.NEXT_PUBLIC_ENABLE_REAL_AVAILABILITY === "true";
const realPaymentsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_REAL_PAYMENTS === "true";

type User = {
  id: number;
  email: string;
  role: string;
};

type PreReservationItem = {
  id: number;
  type: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
  referenceId: number;
  name?: string | null;
  unitPrice?: number | null;
  guests?: number;
  totalPrice?: number | null;
};

type SelectedExtra = {
  id: number;
  name?: string;
  description?: string | null;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
};

type PreReservation = {
  id: string;
  customerName: string;
  email: string;
  customerPhone?: string | null;
  customerCountry?: string | null;
  paymentMethodPreferred?: string | null;
  specialRequests?: string | null;
  selectedExtras?: SelectedExtra[] | null;
  totalEstimate?: number | null;
  discountAmount?: number | null;
  taxesAmount?: number | null;
  manualAdjustmentAmount?: number | null;
  finalTotal?: number | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  internalNotes?: string | null;
  advisorNotes?: string | null;
  status: string;
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  items?: PreReservationItem[];
  payments?: PaymentRecord[];
  booking?: {
    id: number;
    preReservationId?: string | null;
    reservationCode?: string | null;
    invoicePath?: string | null;
    customerName?: string | null;
    totalPrice?: number | null;
    status?: string | null;
    advisorName?: string | null;
    confirmationEmailSentAt?: string | null;
    confirmationWhatsappSentAt?: string | null;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
    cancelledById?: number | null;
  } | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledById?: number | null;
  archiveReason?: string | null;
  archivedAt?: string | null;
  archivedById?: number | null;
  createdAt: string;
  updatedAt?: string;
};

type PaymentRecord = {
  id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paymentLinkUrl?: string | null;
  wompiReference?: string | null;
  wompiPaymentLinkId?: string | null;
  createdAt: string;
};

type ExtraOption = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
};

type PropertyOption = {
  id: number;
  title: string;
  pricePerNight: number;
  maxGuests: number;
  maxCapacity: number;
  extras?: ExtraOption[];
};

type AdvisorOption = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
};

type QuoteForm = {
  referenceId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  infants: string;
  discountAmount: string;
  taxesAmount: string;
  manualAdjustmentAmount: string;
  advisorNotes: string;
  internalNotes: string;
  selectedExtras: {
    id: number;
    quantity: number;
  }[];
};

type OperationalNotification = {
  id: number;
  channel: string;
  recipient: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | string;
  provider?: string | null;
  error?: string | null;
  createdAt: string;
  sentAt?: string | null;
  preReservation?: {
    id: string;
    customerName: string;
    status: string;
    items?: {
      type: string;
      referenceId: number;
      name?: string | null;
    }[];
  } | null;
};

const operationalStatuses = [
  "ASSIGNED",
  "VALIDATING",
  "AVAILABLE",
  "UNAVAILABLE",
  "PAYMENT_PENDING",
];

const confirmedStatuses = ["CONFIRMED", "PAID"];

const statusActions = [
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

const allowedStatusTransitions: Record<string, string[]> = {
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

function getOperationalStatusLabel(status: string) {
  return realAvailabilityEnabled || realPaymentsEnabled
    ? nextStatusLabel[status]
    : manualNextStatusLabel[status];
}

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

function date(value?: string | null) {
  if (!value) return "Pendiente";

  return new Date(value).toLocaleDateString();
}

function dateInput(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 10);
}

function primaryItem(request: PreReservation) {
  return request.items?.[0];
}

function productLabel(request: PreReservation) {
  const item = primaryItem(request);

  if (!item) return "Producto pendiente";

  return item.name || `${item.type} #${item.referenceId}`;
}

function guestsLabel(request: PreReservation) {
  return primaryItem(request)?.guests || 1;
}

function readUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getApiMessage(data: any, fallback: string) {
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

export default function ReservasPage() {
  const [requests, setRequests] = useState<PreReservation[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [selected, setSelected] = useState<PreReservation | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [manualBookingResult, setManualBookingResult] = useState<any>(null);
  const [operationalNotifications, setOperationalNotifications] = useState<
    OperationalNotification[]
  >([]);

  const pendingRequests = useMemo(() => {
    return requests.filter((item) => item.status === "PENDING_ADVISOR");
  }, [requests]);

  const myRequests = useMemo(() => {
    return requests.filter((item) => {
      if (user?.role === "SUPERADMIN") {
        return operationalStatuses.includes(item.status);
      }

      if (!operationalStatuses.includes(item.status)) return false;

      return item.assignedToId === user?.id;
    });
  }, [requests, user]);

  const confirmedRequests = useMemo(() => {
    return requests.filter((item) => {
      const visibleHistoryStatuses =
        user?.role === "SUPERADMIN"
          ? [...confirmedStatuses, "CANCELLED"]
          : confirmedStatuses;

      if (!visibleHistoryStatuses.includes(item.status)) return false;

      if (user?.role === "SUPERADMIN") return true;

      return item.assignedToId === user?.id;
    });
  }, [requests, user]);

  function replaceRequest(updated: PreReservation) {
    setRequests((current) => {
      const exists = current.some((item) => item.id === updated.id);

      if (!exists) {
        return [updated, ...current];
      }

      return current.map((item) =>
        item.id === updated.id ? updated : item
      );
    });
  }

  async function fetchRequests() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const storedUser = readUser();
      setUser(storedUser);

      if (!token) {
        setMessage("No hay sesion activa. Inicia sesion nuevamente.");
        setRequests([]);
        return;
      }

      const res = await fetch(apiUrl("/pre-reservations"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar las solicitudes.");
        setRequests([]);
        return;
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequestById(requestId: string) {
    const token = localStorage.getItem("token");

    if (!token) return null;

    const res = await fetch(apiUrl(`/pre-reservations/${requestId}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("No se pudo refrescar solicitud", requestId, data);
      return null;
    }

    return data as PreReservation;
  }

  async function openRequestDetail(request: PreReservation) {
    setSelected(request);

    const fresh = await fetchRequestById(request.id);

    if (fresh) {
      replaceRequest(fresh);
      setSelected(fresh);
    }
  }

  async function fetchProperties() {
    try {
      const res = await fetch(apiUrl("/properties"));
      const data = await res.json();

      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchAdvisors() {
    try {
      const token = localStorage.getItem("token");
      const storedUser = readUser();

      if (storedUser?.role !== "SUPERADMIN") return;

      const res = await fetch(apiUrl("/admin-operations/advisors"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      setAdvisors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchOperationalNotifications() {
    try {
      const token = localStorage.getItem("token");
      const storedUser = readUser();

      if (!token || storedUser?.role !== "SUPERADMIN") {
        setOperationalNotifications([]);
        return;
      }

      setNotificationsLoading(true);

      const res = await fetch(
        apiUrl("/pre-reservations/operational-notifications"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (!res.ok) {
        console.warn("No se pudieron cargar notificaciones operativas", data);
        return;
      }

      setOperationalNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function openInvoiceFromList(
    request: PreReservation,
    mode: "view" | "download"
  ) {
    if (!request.booking?.invoicePath) {
      setMessage("Esta reserva todavia no tiene factura disponible.");
      return;
    }

    const targetWindow = mode === "view" ? window.open("", "_blank") : null;

    try {
      setActionLoading(`${request.id}:invoice-${mode}`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/pre-reservations/${request.id}/invoice/${mode}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        targetWindow?.close();
        setMessage(errorText || "No se pudo cargar el PDF de la factura.");
        return;
      }

      const blob = await res.blob();
      const pdfUrl = URL.createObjectURL(blob);
      const filename = `${request.booking.reservationCode || "factura-reserva"}.pdf`;

      if (mode === "view") {
        if (targetWindow) {
          targetWindow.location.href = pdfUrl;
        } else {
          window.open(pdfUrl, "_blank");
        }
      } else {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error) {
      console.error(error);
      targetWindow?.close();
      setMessage("Error de conexion cargando la factura.");
    } finally {
      setActionLoading("");
    }
  }

  async function performAction(
    requestId: string,
    endpoint: string,
    successMessage: string
  ) {
    try {
      setActionLoading(`${requestId}:${endpoint}`);
      setMessage("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        apiUrl(`/pre-reservations/${requestId}/${endpoint}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.info("Transicion de estado", {
        requestId,
        endpoint,
        ok: res.ok,
        response: data,
      });

      if (!res.ok) {
        const conflicts = data.conflicts || data.message?.conflicts;
        const conflictText = Array.isArray(conflicts)
          ? ` Conflictos detectados: ${conflicts.length}.`
          : "";
        const fresh = await fetchRequestById(requestId);

        if (fresh) {
          replaceRequest(fresh);
          setSelected(fresh);
        }

        setMessage(
          `${getApiMessage(data, "No se pudo completar la acción.")}${conflictText}`
        );
        await fetchRequests();
        return;
      }

      setMessage(successMessage);
      const fresh = await fetchRequestById(requestId);
      const updated = fresh || data;

      replaceRequest(updated);
      setSelected(updated);
      await fetchRequests();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión ejecutando la acción.");
    } finally {
      setActionLoading("");
    }
  }

  function takeRequest(requestId: string) {
    return performAction(
      requestId,
      "assign-me",
      "Solicitud tomada correctamente."
    );
  }

  function changeStatus(requestId: string, endpoint: string, status: string) {
    const current = selected?.id === requestId
      ? selected.status
      : requests.find((item) => item.id === requestId)?.status;
    const allowed = current
      ? allowedStatusTransitions[current]?.includes(status)
      : true;

    if (current && !allowed) {
      setMessage(
        `No se puede pasar de ${current} a ${status}. ${getOperationalStatusLabel(current) || ""}`
      );
      return;
    }

    return performAction(
      requestId,
      `status/${endpoint}`,
      `Solicitud actualizada a ${status}.`
    );
  }

  async function saveQuote(
    requestId: string,
    payload: Record<string, unknown>
  ) {
    try {
      setActionLoading(`${requestId}:quote`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/pre-reservations/${requestId}/quote`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo actualizar la cotizacion."));
        return;
      }

      const fresh = await fetchRequestById(requestId);
      const updated = fresh || data;

      replaceRequest(updated);
      setSelected(updated);
      await fetchRequests();
      setMessage("Cotización actualizada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando la cotización.");
    } finally {
      setActionLoading("");
    }
  }

  async function generatePaymentLink(requestId: string) {
    if (!realPaymentsEnabled) {
      setMessage(
        "Pago real pendiente de integración. Usa Generar reserva para confirmar manualmente."
      );
      return;
    }

    try {
      setActionLoading(`${requestId}:payment-link`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/payments/wompi/pre-reservations/${requestId}/link`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo generar el link de pago."));
        return;
      }

      await fetchRequests();
      setSelected((current) => {
        if (!current || current.id !== requestId) return current;

        const existingPayments = current.payments || [];
        const payment = data.payment as PaymentRecord;
        const withoutDuplicated = existingPayments.filter(
          (item) => item.id !== payment.id
        );

        return {
          ...current,
          payments: [payment, ...withoutDuplicated],
        };
      });
      setMessage(
        data.reused
          ? "Ya existia un link de pago pendiente."
          : "Link de pago Wompi generado correctamente."
      );
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión generando link de pago.");
    } finally {
      setActionLoading("");
    }
  }

  async function generateManualBooking(requestId: string) {
    try {
      setActionLoading(`${requestId}:generate-booking`);
      setMessage("");
      setManualBookingResult(null);

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/pre-reservations/${requestId}/generate-booking`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo generar la reserva."));
        return;
      }

      const fresh = await fetchRequestById(requestId);

      if (fresh) {
        replaceRequest(fresh);
        setSelected(fresh);
      }

      setManualBookingResult(data);
      await fetchRequests();
      setMessage(
        data.idempotent
          ? "La reserva ya estaba confirmada."
          : "Reserva confirmada manualmente."
      );
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión generando la reserva.");
    } finally {
      setActionLoading("");
    }
  }

  async function sendManualNotification(
    requestId: string,
    channel: "email" | "whatsapp"
  ) {
    try {
      setActionLoading(`${requestId}:notify-${channel}`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/pre-reservations/${requestId}/notifications/${channel}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          getApiMessage(data, "No se pudo enviar la notificación.")
        );
        return;
      }

      const fresh = await fetchRequestById(requestId);

      if (fresh) {
        replaceRequest(fresh);
        setSelected(fresh);
      }

      if (data.sent) {
        setMessage(
          channel === "email"
            ? "Comprobante enviado por correo."
            : "Resumen enviado por WhatsApp."
        );
      } else if (data.status === "already-sent") {
        setMessage(
          channel === "email"
            ? "El comprobante por correo ya habia sido enviado."
            : "El resumen por WhatsApp ya habia sido enviado."
        );
      } else {
        setMessage(
          data.reason ||
            (channel === "email"
              ? "No se envio el correo."
              : "No se envio el WhatsApp.")
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión enviando notificación.");
    } finally {
      setActionLoading("");
    }
  }

  async function reassignRequest(requestId: string, advisorId: number) {
    try {
      setActionLoading(`${requestId}:reassign`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/admin-operations/pre-reservations/${requestId}/reassign`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ advisorId }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo reasignar la solicitud."));
        return;
      }

      await fetchRequests();
      setSelected(data);
      setMessage("Solicitud reasignada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión reasignando solicitud.");
    } finally {
      setActionLoading("");
    }
  }

  async function cancelRequest(requestId: string, reason: string) {
    try {
      setActionLoading(`${requestId}:cancel`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/admin-operations/pre-reservations/${requestId}/cancel`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo cancelar la solicitud."));
        return;
      }

      await fetchRequests();
      setSelected((current) => (current?.id === data.id ? data : current));
      setMessage("Solicitud cancelada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cancelando solicitud.");
    } finally {
      setActionLoading("");
    }
  }

  async function archiveRequest(requestId: string, reason: string) {
    try {
      setActionLoading(`${requestId}:archive`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/admin-operations/pre-reservations/${requestId}/archive`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo archivar la solicitud."));
        return;
      }

      setRequests((current) => current.filter((item) => item.id !== requestId));
      setSelected((current) => (current?.id === requestId ? null : current));
      setMessage("Registro archivado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion archivando solicitud.");
    } finally {
      setActionLoading("");
    }
  }

  function confirmCancelRequest(request: PreReservation) {
    if (user?.role !== "SUPERADMIN") return;

    if (request.status === "CANCELLED") {
      confirmArchiveRequest(request);
      return;
    }

    const reason = window.prompt(
      `Motivo de cancelacion para ${request.customerName || "esta solicitud"} (opcional):`,
      ""
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      "Esta accion no elimina fisicamente el registro. Se marcara como CANCELLED y quedara trazabilidad. ¿Continuar?"
    );

    if (!confirmed) return;

    cancelRequest(request.id, reason);
  }

  function confirmArchiveRequest(request: PreReservation) {
    if (user?.role !== "SUPERADMIN") return;

    if (request.status !== "CANCELLED") {
      setMessage("Primero cancela la solicitud antes de archivarla.");
      return;
    }

    const reason = window.prompt(
      `Motivo para archivar ${request.customerName || "esta solicitud"} (opcional):`,
      ""
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      "El registro quedara oculto de la tabla operativa, pero se conserva en la base de datos. ¿Continuar?"
    );

    if (!confirmed) return;

    archiveRequest(request.id, reason);
  }

  useEffect(() => {
    fetchRequests();
    fetchProperties();
    fetchAdvisors();
    fetchOperationalNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
        <div className="premium-enter premium-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm tracking-[0.25em] uppercase text-[#B48A5A] font-medium">
                Gestión de reservas
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] sm:text-4xl">
                Solicitudes asistidas
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Toma solicitudes pendientes y gestiona la validación comercial
                antes de cualquier pago.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                fetchRequests();
                fetchOperationalNotifications();
              }}
              variant="outline"
              disabled={loading}
              className="h-12 rounded-xl bg-white premium-focus"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {message && (
          <div className="premium-enter rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <OperationMetricCard
            icon={Clock}
            label="Pendientes"
            value={pendingRequests.length}
            loading={loading}
            tone="amber"
          />
          <OperationMetricCard
            icon={UserCheck}
            label={user?.role === "SUPERADMIN" ? "En gestion" : "Mis solicitudes"}
            value={myRequests.length}
            loading={loading}
            tone="blue"
          />
          <OperationMetricCard
            icon={CheckCircle2}
            label="Confirmadas"
            value={confirmedRequests.length}
            loading={loading}
            tone="green"
          />
        </div>

        {user?.role === "SUPERADMIN" && (
          <OperationalNotificationsPanel
            notifications={operationalNotifications}
            loading={notificationsLoading}
            onRefresh={fetchOperationalNotifications}
          />
        )}

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  Bandeja pendiente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Solicitudes sin asesor asignado.
                </p>
              </div>
              <Badge variant="outline" className="rounded-md">
                PENDING_ADVISOR
              </Badge>
            </div>

            <RequestsTable
              requests={pendingRequests}
              loading={loading}
              emptyText="No hay solicitudes pendientes."
              onView={openRequestDetail}
              action={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => takeRequest(item.id)}
                    disabled={Boolean(item.assignedToId) || actionLoading === `${item.id}:assign-me`}
                    className="h-9 rounded-xl bg-[#0D2B52] px-3 hover:bg-[#12396d]"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    <span>Tomar</span>
                  </Button>

                  {user?.role === "SUPERADMIN" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => confirmCancelRequest(item)}
                      disabled={
                        actionLoading === `${item.id}:cancel` ||
                        actionLoading === `${item.id}:archive`
                      }
                      className="h-9 rounded-xl border-red-200 px-3 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>
                        {actionLoading === `${item.id}:cancel`
                          ? "Eliminando..."
                          : "Eliminar"}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0D2B52]">
                {user?.role === "SUPERADMIN" ? "Solicitudes en gestion" : "Mis solicitudes"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gestión operativa antes de generar cualquier link de pago.
              </p>
            </div>

            <RequestsTable
              requests={myRequests}
              loading={loading}
              emptyText="No hay solicitudes asignadas."
              onView={openRequestDetail}
              action={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => openRequestDetail(item)}
                    className="h-9 rounded-xl px-3"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Ver</span>
                  </Button>

                  {user?.role === "SUPERADMIN" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => confirmCancelRequest(item)}
                      disabled={
                        actionLoading === `${item.id}:cancel` ||
                        actionLoading === `${item.id}:archive`
                      }
                      className="h-9 rounded-xl border-red-200 px-3 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>
                        {actionLoading === `${item.id}:archive`
                          ? "Archivando..."
                          : item.status === "CANCELLED"
                            ? "Archivar"
                            : actionLoading === `${item.id}:cancel`
                              ? "Eliminando..."
                              : "Eliminar"}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  Reservas confirmadas / Historial
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Seguimiento de reservas generadas, codigos RES y comprobantes PDF.
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-md">
                CONFIRMED
              </Badge>
            </div>

            <ConfirmedReservationsTable
              requests={confirmedRequests}
              loading={loading}
              actionLoading={actionLoading}
              emptyText="No hay reservas confirmadas para mostrar."
              onView={openRequestDetail}
              onInvoice={openInvoiceFromList}
            />
          </CardContent>
        </Card>

        {selected && (
          <RequestDetail
            request={selected}
            properties={properties}
            advisors={advisors}
            currentUser={user}
            actionLoading={actionLoading}
            onClose={() => setSelected(null)}
            onStatusChange={changeStatus}
            onQuoteSave={saveQuote}
            onGeneratePaymentLink={generatePaymentLink}
            onGenerateManualBooking={generateManualBooking}
            onSendManualNotification={sendManualNotification}
            manualBookingResult={manualBookingResult}
            onReassign={reassignRequest}
            onCancel={cancelRequest}
          />
        )}
      </div>
    </div>
  );
}

function OperationalNotificationsPanel({
  notifications,
  loading,
  onRefresh,
}: {
  notifications: OperationalNotification[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const recent = notifications.slice(0, 6);

  return (
    <Card className="premium-enter premium-surface rounded-2xl">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
              Alertas comerciales
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#0D2B52]">
              Notificaciones operativas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Solicitudes nuevas registradas para aviso interno. Con WhatsApp
              real desactivado quedan como pendientes/simuladas.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-10 rounded-xl bg-white"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar alertas
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 rounded-2xl premium-skeleton" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white p-5 text-sm text-slate-500">
            No hay notificaciones operativas recientes.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {recent.map((notification) => {
              const product =
                notification.preReservation?.items?.[0]?.name ||
                notification.preReservation?.items?.[0]?.type ||
                "Solicitud asistida";

              return (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Bell className="h-4 w-4 text-[#B48A5A]" />
                        <p className="font-semibold text-[#0D2B52]">
                          {notification.preReservation?.customerName ||
                            "Cliente pendiente"}
                        </p>
                        <Badge variant="outline" className="rounded-md">
                          {notification.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{product}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {notification.channel} a {notification.recipient}
                        {notification.provider
                          ? ` · ${notification.provider}`
                          : ""}
                      </p>
                      {notification.error && (
                        <p className="mt-2 text-xs text-red-600">
                          {notification.error}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-slate-400">
                      {date(notification.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestsTable({
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
            <TableHead className="text-xs">Huespedes</TableHead>
            <TableHead className="hidden text-xs 2xl:table-cell">Metodo</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <TableHead className="hidden text-xs 2xl:table-cell">Creada</TableHead>
            <TableHead className="text-xs text-right">Accion</TableHead>
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

function ConfirmedReservationsTable({
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
            <TableHead className="text-xs">Codigo RES</TableHead>
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
                    Cuando un asesor genere una reserva, quedara aqui para
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

function OperationMetricCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  loading: boolean;
  tone: "amber" | "blue" | "green";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-[#EAF0F8] text-[#0D2B52] border-[#0D2B52]/15",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];

  return (
    <Card className="premium-enter premium-surface rounded-2xl">
      <CardContent className="p-6">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-3 h-9 w-28 rounded-lg premium-skeleton" />
        ) : (
          <h3 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            {value}
          </h3>
        )}
      </CardContent>
    </Card>
  );
}

function RequestDetail({
  request,
  properties,
  advisors,
  currentUser,
  actionLoading,
  onClose,
  onStatusChange,
  onQuoteSave,
  onGeneratePaymentLink,
  onGenerateManualBooking,
  onSendManualNotification,
  manualBookingResult,
  onReassign,
  onCancel,
}: {
  request: PreReservation;
  properties: PropertyOption[];
  advisors: AdvisorOption[];
  currentUser: User | null;
  actionLoading: string;
  onClose: () => void;
  onStatusChange: (id: string, endpoint: string, status: string) => void;
  onQuoteSave: (id: string, payload: Record<string, unknown>) => void;
  onGeneratePaymentLink: (id: string) => void;
  onGenerateManualBooking: (id: string) => void;
  onSendManualNotification: (
    id: string,
    channel: "email" | "whatsapp"
  ) => void;
  manualBookingResult: any;
  onReassign: (id: string, advisorId: number) => void;
  onCancel: (id: string, reason: string) => void;
}) {
  const extras = Array.isArray(request.selectedExtras)
    ? request.selectedExtras
    : [];
  const item = primaryItem(request);
  const initialAdults =
    request.adults ?? Math.max(Number(item?.guests || 1), 1);
  const [form, setForm] = useState<QuoteForm>({
    referenceId: String(item?.referenceId || ""),
    checkIn: dateInput(request.checkIn),
    checkOut: dateInput(request.checkOut),
    adults: String(initialAdults),
    children: String(request.children || 0),
    infants: String(request.infants || 0),
    discountAmount: String(request.discountAmount || 0),
    taxesAmount: String(request.taxesAmount || 0),
    manualAdjustmentAmount: String(request.manualAdjustmentAmount || 0),
    advisorNotes: request.advisorNotes || "",
    internalNotes: request.internalNotes || "",
    selectedExtras: extras.map((extra) => ({
      id: extra.id,
      quantity: Math.max(Number(extra.quantity || 1), 1),
    })),
  });
  const [reassignAdvisorId, setReassignAdvisorId] = useState(
    String(request.assignedToId || "")
  );
  const [cancelReason, setCancelReason] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState<"" | "view" | "download">("");
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const selectedProperty = properties.find(
    (property) => property.id === Number(form.referenceId)
  );
  const availableExtras = (selectedProperty?.extras || []).filter(
    (extra) => extra.active
  );
  const isQuoteSaving = actionLoading === `${request.id}:quote`;
  const latestWompiPayment = (request.payments || []).find(
    (payment) => payment.provider === "WOMPI"
  );
  const canGenerateManualBooking =
    ["AVAILABLE", "PAYMENT_PENDING"].includes(request.status) &&
    Number(request.finalTotal || request.totalEstimate || 0) > 0;
  const isManualBookingLoading =
    actionLoading === `${request.id}:generate-booking`;
  const canGeneratePayment =
    realPaymentsEnabled &&
    request.status === "PAYMENT_PENDING" &&
    Number(request.finalTotal || request.totalEstimate || 0) > 0;
  const isPaymentLinkLoading =
    actionLoading === `${request.id}:payment-link`;
  const statusMeta = getReservationStatusMeta(request.status);
  const StatusIcon = statusMeta.icon;
  const allowedNextStatuses = allowedStatusTransitions[request.status] || [];
  const manualBookingForRequest =
    manualBookingResult?.booking?.preReservationId === request.id
      ? manualBookingResult.booking
      : null;
  const confirmedBooking = manualBookingForRequest || request.booking;
  const confirmedReservationCode =
    manualBookingForRequest?.reservationCode ||
    request.booking?.reservationCode;
  const invoiceAvailable = Boolean(confirmedBooking?.invoicePath);
  const isEmailSending =
    actionLoading === `${request.id}:notify-email`;
  const isWhatsappSending =
    actionLoading === `${request.id}:notify-whatsapp`;
  const emailSentAt = confirmedBooking?.confirmationEmailSentAt;
  const whatsappSentAt = confirmedBooking?.confirmationWhatsappSentAt;

  useEffect(() => {
    const primary = primaryItem(request);
    const requestExtras = Array.isArray(request.selectedExtras)
      ? request.selectedExtras
      : [];

    setForm({
      referenceId: String(primary?.referenceId || ""),
      checkIn: dateInput(request.checkIn),
      checkOut: dateInput(request.checkOut),
      adults: String(request.adults ?? Math.max(Number(primary?.guests || 1), 1)),
      children: String(request.children || 0),
      infants: String(request.infants || 0),
      discountAmount: String(request.discountAmount || 0),
      taxesAmount: String(request.taxesAmount || 0),
      manualAdjustmentAmount: String(request.manualAdjustmentAmount || 0),
      advisorNotes: request.advisorNotes || "",
      internalNotes: request.internalNotes || "",
      selectedExtras: requestExtras.map((extra) => ({
        id: extra.id,
        quantity: Math.max(Number(extra.quantity || 1), 1),
      })),
    });
    setReassignAdvisorId(String(request.assignedToId || ""));
    setInvoiceMessage("");
  }, [request]);

  function updateForm(key: keyof QuoteForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleExtra(extraId: number, checked: boolean) {
    setForm((current) => {
      const selectedExtras = checked
        ? [
            ...current.selectedExtras,
            { id: extraId, quantity: 1 },
          ]
        : current.selectedExtras.filter((extra) => extra.id !== extraId);

      return {
        ...current,
        selectedExtras,
      };
    });
  }

  function updateExtraQuantity(extraId: number, quantity: string) {
    setForm((current) => ({
      ...current,
      selectedExtras: current.selectedExtras.map((extra) =>
        extra.id === extraId
          ? {
              ...extra,
              quantity: Math.max(Number(quantity || 1), 1),
            }
          : extra
      ),
    }));
  }

  function submitQuote() {
    const adults = Number(form.adults || 0);
    const children = Number(form.children || 0);
    const infants = Number(form.infants || 0);

    onQuoteSave(request.id, {
      type: "PROPERTY",
      referenceId: Number(form.referenceId),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults,
      children,
      infants,
      guests: adults + children + infants,
      selectedExtras: form.selectedExtras,
      discountAmount: Number(form.discountAmount || 0),
      taxesAmount: Number(form.taxesAmount || 0),
      manualAdjustmentAmount: Number(form.manualAdjustmentAmount || 0),
      advisorNotes: form.advisorNotes,
      internalNotes: form.internalNotes,
    });
  }

  async function copyPaymentLink() {
    if (!latestWompiPayment?.paymentLinkUrl) return;

    await navigator.clipboard.writeText(latestWompiPayment.paymentLinkUrl);
  }

  async function openInvoice(mode: "view" | "download") {
    if (!invoiceAvailable) return;

    const targetWindow = mode === "view" ? window.open("", "_blank") : null;

    try {
      setInvoiceLoading(mode);
      setInvoiceMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/pre-reservations/${request.id}/invoice/${mode}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        targetWindow?.close();
        setInvoiceMessage(
          errorText || "No se pudo cargar el PDF de la factura."
        );
        return;
      }

      const blob = await res.blob();
      const pdfUrl = URL.createObjectURL(blob);
      const filename = `${confirmedReservationCode || "factura-reserva"}.pdf`;

      if (mode === "view") {
        if (targetWindow) {
          targetWindow.location.href = pdfUrl;
        } else {
          window.open(pdfUrl, "_blank");
        }
      } else {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error) {
      console.error(error);
      targetWindow?.close();
      setInvoiceMessage("Error de conexión cargando la factura.");
    } finally {
      setInvoiceLoading("");
    }
  }

  return (
    <Card className="premium-enter rounded-2xl border border-[#D4AF37]/30 bg-white shadow-sm">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
              Detalle de solicitud
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
              {request.customerName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Referencia {request.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={request.status} />
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${statusMeta.className}`}>
          <div className="flex items-start gap-3">
            <StatusIcon className="mt-1 h-5 w-5" />
            <div>
              <p className="font-semibold">{statusMeta.label}</p>
              <p className="mt-1 text-sm leading-6">{statusMeta.description}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile icon={Mail} label="Correo" value={request.email} />
          <InfoTile icon={Phone} label="WhatsApp" value={request.customerPhone || "Pendiente"} />
          <InfoTile icon={CreditCard} label="Metodo preferido" value={request.paymentMethodPreferred || "Pendiente"} />
          <InfoTile icon={Clock} label="Creada" value={date(request.createdAt)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="font-semibold text-[#0D2B52]">Producto</h3>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="text-slate-500">Seleccionado:</span>{" "}
                  {productLabel(request)}
                </p>
                <p>
                  <span className="text-slate-500">Tipo:</span>{" "}
                  {primaryItem(request)?.type || "Pendiente"}
                </p>
                <p>
                  <span className="text-slate-500">Fechas:</span>{" "}
                  {date(request.checkIn)} - {date(request.checkOut)}
                </p>
                <p>
                  <span className="text-slate-500">Huespedes:</span>{" "}
                  {guestsLabel(request)}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                  <Edit3 className="h-4 w-4 text-[#B48A5A]" />
                  Ajuste del asesor
                </h3>
                <Badge variant="outline" className="rounded-md">
                  Cotización editable
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Alojamiento</span>
                  <select
                    value={form.referenceId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        referenceId: event.target.value,
                        selectedExtras: [],
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-[#0D2B52]"
                  >
                    <option value="">Seleccionar alojamiento</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Check-in</span>
                  <Input
                    type="date"
                    value={form.checkIn}
                    onChange={(event) =>
                      updateForm("checkIn", event.target.value)
                    }
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Check-out</span>
                  <Input
                    type="date"
                    value={form.checkOut}
                    onChange={(event) =>
                      updateForm("checkOut", event.target.value)
                    }
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-500">Adultos</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.adults}
                      onChange={(event) =>
                        updateForm("adults", event.target.value)
                      }
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-slate-500">Ninos</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.children}
                      onChange={(event) =>
                        updateForm("children", event.target.value)
                      }
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-slate-500">Bebes</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.infants}
                      onChange={(event) =>
                        updateForm("infants", event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-[#0D2B52]">
                  <Gem className="h-4 w-4 text-[#B48A5A]" />
                  Servicios premium disponibles
                </p>

                {availableExtras.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Este alojamiento no tiene servicios premium activos.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableExtras.map((extra) => {
                      const selectedExtra = form.selectedExtras.find(
                        (item) => item.id === extra.id
                      );

                      return (
                        <div
                          key={extra.id}
                          className="rounded-xl bg-[#F8F6F2] p-4 text-sm"
                        >
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedExtra)}
                              onChange={(event) =>
                                toggleExtra(extra.id, event.target.checked)
                              }
                              className="mt-1"
                            />
                            <span className="flex-1">
                              <span className="block font-medium text-[#0D2B52]">
                                {extra.name}
                              </span>
                              <span className="block text-slate-500">
                                {money(extra.price)}
                              </span>
                            </span>
                          </label>

                          {selectedExtra && (
                            <Input
                              type="number"
                              min="1"
                              value={selectedExtra.quantity}
                              onChange={(event) =>
                                updateExtraQuantity(
                                  extra.id,
                                  event.target.value
                                )
                              }
                              className="mt-3"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Descuento</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.discountAmount}
                    onChange={(event) =>
                      updateForm("discountAmount", event.target.value)
                    }
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Impuestos</span>
                  <Input
                    type="number"
                    min="0"
                    value={form.taxesAmount}
                    onChange={(event) =>
                      updateForm("taxesAmount", event.target.value)
                    }
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Ajuste manual</span>
                  <Input
                    type="number"
                    value={form.manualAdjustmentAmount}
                    onChange={(event) =>
                      updateForm("manualAdjustmentAmount", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Notas para cliente</span>
                  <Textarea
                    value={form.advisorNotes}
                    onChange={(event) =>
                      updateForm("advisorNotes", event.target.value)
                    }
                    rows={4}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Notas internas</span>
                  <Textarea
                    value={form.internalNotes}
                    onChange={(event) =>
                      updateForm("internalNotes", event.target.value)
                    }
                    rows={4}
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={submitQuote}
                  disabled={isQuoteSaving}
                  className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cotizacion
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                <Gem className="h-4 w-4 text-[#B48A5A]" />
                Servicios premium
              </h3>

              {extras.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Sin servicios premium seleccionados.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex justify-between gap-4 rounded-xl bg-[#F8F6F2] p-4 text-sm"
                    >
                      <div>
                        <p className="font-medium text-[#0D2B52]">
                          {extra.name || `Servicio #${extra.id}`}
                        </p>
                        <p className="mt-1 text-slate-500">
                          Cantidad {extra.quantity || 1} x {money(extra.unitPrice)}
                        </p>
                      </div>
                      <span className="font-semibold text-[#B48A5A]">
                        {money(extra.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="font-semibold text-[#0D2B52]">Comentarios</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {request.specialRequests || "Sin comentarios adicionales."}
              </p>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                <Calculator className="h-4 w-4 text-[#B48A5A]" />
                Resumen estimado
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{money(request.totalEstimate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Descuento</span>
                  <span>-{money(request.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Impuestos</span>
                  <span>{money(request.taxesAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ajuste manual</span>
                  <span>{money(request.manualAdjustmentAmount)}</span>
                </div>
                <div className="border-t border-[#D4AF37]/20 pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total final</span>
                    <span>{money(request.finalTotal || request.totalEstimate)}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="font-semibold text-[#0D2B52]">
                Timeline de reserva
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Progreso operativo visible para el equipo.
              </p>
              <div className="mt-5">
                <ReservationTimeline request={request} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="font-semibold text-[#0D2B52]">
                Marcar disponibilidad
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {getOperationalStatusLabel(request.status) ||
                  "Revisa el estado actual antes de continuar."}
              </p>
              {!realAvailabilityEnabled && (
                <p className="mt-2 rounded-xl bg-[#F8F6F2] px-3 py-2 text-xs font-medium text-[#0D2B52]">
                  Validación manual por asesor. No se consulta Airbnb/iCal en
                  esta fase.
                </p>
              )}

              <div className="mt-4 grid gap-2">
                {statusActions.map((action) => (
                  (() => {
                    const allowed = allowedNextStatuses.includes(action.nextStatus);
                    const isLoading =
                      actionLoading === `${request.id}:status/${action.endpoint}`;

                    return (
                  <Button
                    key={action.endpoint}
                    type="button"
                    variant="outline"
                    disabled={
                      request.status === action.nextStatus ||
                      !allowed ||
                      isLoading
                    }
                    onClick={() =>
                      onStatusChange(
                        request.id,
                        action.endpoint,
                        action.nextStatus
                      )
                    }
                    className="justify-start rounded-xl"
                    title={
                      allowed
                        ? `Pasar a ${action.nextStatus}`
                        : `No disponible desde ${request.status}`
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isLoading
                      ? "Actualizando..."
                      : action.buttonLabel || `Pasar a ${action.label}`}
                  </Button>
                    );
                  })()
                ))}
              </div>
            </section>

            {currentUser?.role === "SUPERADMIN" && (
              <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
                <h3 className="font-semibold text-[#0D2B52]">
                  Control Super Admin
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Reasigna o cancela sin eliminar registros.
                </p>

                <label className="mt-4 block space-y-2 text-sm">
                  <span className="text-slate-500">Asesor asignado</span>
                  <select
                    value={reassignAdvisorId}
                    onChange={(event) =>
                      setReassignAdvisorId(event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-[#0D2B52]"
                  >
                    <option value="">Sin asesor</option>
                    {advisors
                      .filter((advisor) => advisor.isActive)
                      .map((advisor) => (
                        <option key={advisor.id} value={advisor.id}>
                          {advisor.name} - {advisor.email}
                        </option>
                      ))}
                  </select>
                </label>

                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    !reassignAdvisorId ||
                    actionLoading === `${request.id}:reassign`
                  }
                  onClick={() =>
                    onReassign(request.id, Number(reassignAdvisorId))
                  }
                  className="mt-3 w-full rounded-xl"
                >
                  Reasignar solicitud
                </Button>

                <label className="mt-5 block space-y-2 text-sm">
                  <span className="text-slate-500">Motivo de cancelación</span>
                  <Textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    rows={3}
                  />
                </label>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    request.status === "CANCELLED" ||
                    !cancelReason.trim() ||
                    actionLoading === `${request.id}:cancel`
                  }
                  onClick={() => onCancel(request.id, cancelReason)}
                  className="mt-3 w-full rounded-xl"
                >
                  Cancelar reserva
                </Button>
              </section>
            )}

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                <CheckCircle2 className="h-4 w-4 text-[#B48A5A]" />
                Confirmación de reserva
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                El asesor confirma la reserva luego de marcar disponibilidad.
                El pago real queda pendiente para una fase posterior.
              </p>

              {confirmedReservationCode && (
                <div className="mt-4 rounded-xl bg-[#F8F6F2] p-4 text-sm">
                  <p className="text-slate-500">Código de reserva</p>
                  <p className="mt-1 text-xl font-semibold text-[#0D2B52]">
                    {confirmedReservationCode}
                  </p>
                </div>
              )}

              {confirmedBooking && (
                <div className="mt-4 space-y-3 rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm">
                  <p className="font-semibold text-[#0D2B52]">
                    Reserva confirmada
                  </p>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Código</span>
                    <span>{confirmedReservationCode}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Cliente</span>
                    <span>
                      {confirmedBooking.customerName || request.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Total</span>
                    <span>
                      {money(
                        confirmedBooking.totalPrice ||
                          request.finalTotal ||
                          request.totalEstimate ||
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Estado</span>
                    <span>{confirmedBooking.status || "CONFIRMED"}</span>
                  </div>

                  {invoiceAvailable && (
                    <div className="space-y-3 pt-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openInvoice("view")}
                          disabled={Boolean(invoiceLoading)}
                          className="rounded-xl"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {invoiceLoading === "view"
                            ? "Abriendo..."
                            : "Ver factura"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openInvoice("download")}
                          disabled={Boolean(invoiceLoading)}
                          className="rounded-xl"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {invoiceLoading === "download"
                            ? "Descargando..."
                            : "Descargar PDF"}
                        </Button>
                      </div>

                      <div className="min-w-0 rounded-xl bg-[#F8F6F2] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
                          Notificacion manual
                        </p>
                        <div className="mt-3 grid min-w-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              onSendManualNotification(request.id, "email")
                            }
                            disabled={
                              isEmailSending ||
                              !request.email ||
                              Boolean(emailSentAt)
                            }
                            className="min-h-11 w-full min-w-0 justify-center rounded-xl bg-white px-3 py-2 text-center text-xs leading-snug whitespace-normal sm:text-sm"
                            title={
                              !request.email
                                ? "Cliente sin correo"
                                : emailSentAt
                                  ? "El correo ya fue enviado"
                                  : "Enviar comprobante PDF al correo"
                            }
                          >
                            <Mail className="mr-2 h-4 w-4 shrink-0" />
                            <span className="min-w-0 break-words">
                              {isEmailSending
                                ? "Enviando..."
                                : "Enviar comprobante por correo"}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              onSendManualNotification(request.id, "whatsapp")
                            }
                            disabled={
                              isWhatsappSending ||
                              !request.customerPhone ||
                              Boolean(whatsappSentAt)
                            }
                            className="min-h-11 w-full min-w-0 justify-center rounded-xl bg-white px-3 py-2 text-center text-xs leading-snug whitespace-normal sm:text-sm"
                            title={
                              !request.customerPhone
                                ? "Cliente sin telefono"
                                : whatsappSentAt
                                  ? "El WhatsApp ya fue enviado"
                                  : "Enviar resumen de reserva por WhatsApp"
                            }
                          >
                            <Phone className="mr-2 h-4 w-4 shrink-0" />
                            <span className="min-w-0 break-words">
                              {isWhatsappSending
                                ? "Enviando..."
                                : "Enviar resumen por WhatsApp"}
                            </span>
                          </Button>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <p>
                            Correo:{" "}
                            {emailSentAt
                              ? `enviado ${date(emailSentAt)}`
                              : request.email
                                ? "pendiente"
                                : "sin correo"}
                          </p>
                          <p>
                            WhatsApp:{" "}
                            {whatsappSentAt
                              ? `enviado ${date(whatsappSentAt)}`
                              : request.customerPhone
                                ? "pendiente"
                                : "sin telefono"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {invoiceMessage && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {invoiceMessage}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                onClick={() => onGenerateManualBooking(request.id)}
                disabled={
                  request.status === "CONFIRMED" ||
                  !canGenerateManualBooking ||
                  isManualBookingLoading
                }
                className="mt-4 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                title={
                  canGenerateManualBooking
                    ? "Generar reserva confirmada"
                    : `Disponible solo desde AVAILABLE o PAYMENT_PENDING`
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isManualBookingLoading ? "Generando..." : "Generar reserva"}
              </Button>
            </section>

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                <CreditCard className="h-4 w-4 text-[#B48A5A]" />
                {realPaymentsEnabled
                  ? "Link de pago Wompi"
                  : "Pago gestionado manualmente"}
              </h3>
              {!realPaymentsEnabled && (
                <p className="mt-2 rounded-xl bg-[#F8F6F2] px-3 py-2 text-xs font-medium text-[#0D2B52]">
                  Pago real pendiente de integración. Por ahora el asesor
                  coordina el pago y confirma con Generar reserva.
                </p>
              )}
              <p
                className={`mt-2 text-sm text-slate-500 ${
                  realPaymentsEnabled ? "" : "hidden"
                }`}
              >
                {request.status === "PAYMENT_PENDING"
                  ? "Flujo secundario pendiente. Puedes usar confirmación manual."
                  : "Wompi queda pendiente para integración posterior."}
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado pago</span>
                  <Badge variant="outline">
                    {latestWompiPayment?.status || "Sin link"}
                  </Badge>
                </div>

                {latestWompiPayment?.wompiReference && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Referencia</span>
                    <span className="text-right text-[#0D2B52]">
                      {latestWompiPayment.wompiReference}
                    </span>
                  </div>
                )}

                {latestWompiPayment?.paymentLinkUrl && (
                  <div className="rounded-xl bg-[#F8F6F2] p-3">
                    <p className="break-all text-[#0D2B52]">
                      {latestWompiPayment.paymentLinkUrl}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyPaymentLink}
                      className="mt-3 w-full rounded-xl"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar link
                    </Button>
                  </div>
                )}
              </div>

              {realPaymentsEnabled ? (
                <Button
                  type="button"
                  onClick={() => onGeneratePaymentLink(request.id)}
                  disabled={!canGeneratePayment || isPaymentLinkLoading}
                  className="mt-4 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                  title={
                    canGeneratePayment
                      ? "Generar link Wompi"
                      : `No disponible en estado ${request.status}`
                  }
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Generar link de pago
                </Button>
              ) : (
                <p className="mt-4 rounded-xl bg-[#F8F6F2] px-4 py-3 text-sm text-slate-600">
                  Link Wompi desactivado por configuración. El flujo principal
                  es Generar reserva.
                </p>
              )}
            </section>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 p-4">
      <Icon className="h-4 w-4 text-[#B48A5A]" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium text-[#0D2B52]">{value}</p>
    </div>
  );
}
