"use client";

import { useEffect, useMemo, useState } from "react";

import { apiUrl } from "@/lib/api";
import ReservationsWorkspace from "./ReservationsWorkspace";
import {
  allowedStatusTransitions,
  confirmedStatuses,
  getOperationalStatusLabel,
  getReservationStatusLabel,
  operationalStatuses,
  realPaymentsEnabled,
} from "./constants";
import type {
  AdvisorOption,
  OperationalLog,
  OperationalNotification,
  PaymentRecord,
  PreReservation,
  PropertyOption,
  User,
} from "./types";
import { getApiMessage, readUser } from "./utils";

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
  const [selectedLogs, setSelectedLogs] = useState<OperationalLog[]>([]);
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

  async function fetchRequestLogs(requestId: string) {
    const token = localStorage.getItem("token");
    const storedUser = readUser();

    if (!token || storedUser?.role !== "SUPERADMIN") {
      setSelectedLogs([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        entityType: "PreReservation",
        entityId: requestId,
        take: "50",
      });
      const res = await fetch(apiUrl(`/operational-logs?${params}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setSelectedLogs([]);
        return;
      }

      setSelectedLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("No se pudo cargar historial operativo", error);
      setSelectedLogs([]);
    }
  }

  async function openRequestDetail(request: PreReservation) {
    setSelected(request);
    void fetchRequestLogs(request.id);

    const fresh = await fetchRequestById(request.id);

    if (fresh) {
      replaceRequest(fresh);
      setSelected(fresh);
      void fetchRequestLogs(fresh.id);
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
      setMessage("Error de conexión cargando la factura.");
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
          void fetchRequestLogs(fresh.id);
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
      void fetchRequestLogs(updated.id);
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
        `No se puede pasar de ${getReservationStatusLabel(current)} a ${getReservationStatusLabel(status)}. ${getOperationalStatusLabel(current) || ""}`
      );
      return;
    }

    return performAction(
      requestId,
      `status/${endpoint}`,
      `Solicitud actualizada a ${getReservationStatusLabel(status)}.`
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
      void fetchRequestLogs(updated.id);
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
        void fetchRequestLogs(fresh.id);
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
        void fetchRequestLogs(fresh.id);
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

  async function resendEmail(requestId: string, templateKey: string) {
    try {
      setActionLoading(`${requestId}:email-resend:${templateKey}`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/email/pre-reservations/${requestId}/resend`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateKey }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo reenviar el correo."));
        return;
      }

      const fresh = await fetchRequestById(requestId);

      if (fresh) {
        replaceRequest(fresh);
        setSelected(fresh);
        void fetchRequestLogs(fresh.id);
      }

      const results = Array.isArray(data) ? data : [data];
      const sent = results.some((item) => item?.status === "sent");
      const skipped = results.find((item) => item?.status === "skipped");
      const failed = results.find((item) => item?.status === "failed");

      if (sent) {
        setMessage("Correo reenviado correctamente.");
      } else if (failed) {
        setMessage(failed.reason || "El reenvio del correo fallo.");
      } else {
        setMessage(skipped?.reason || "Correo procesado sin envio real.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión reenviando correo.");
    } finally {
      setActionLoading("");
    }
  }

  async function sendReviewRequest(requestId: string, bookingId: number) {
    try {
      setActionLoading(`${requestId}:review-request`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/reviews/admin/bookings/${bookingId}/send-request`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo enviar el link de reseña."));
        return;
      }

      const fresh = await fetchRequestById(requestId);

      if (fresh) {
        replaceRequest(fresh);
        setSelected(fresh);
        void fetchRequestLogs(fresh.id);
      }

      if (data?.status === "already-sent") {
        setMessage("El link de reseña ya habia sido enviado para esta reserva.");
      } else if (data?.email === "sent") {
        setMessage("Link de reseña enviado por correo.");
      } else if (data?.whatsapp === "prepared") {
        setMessage("Link de reseña preparado para WhatsApp. No se llamo ninguna API externa.");
      } else {
        setMessage(data?.reason || "Solicitud de reseña procesada.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión enviando link de reseña.");
    } finally {
      setActionLoading("");
    }
  }

  async function sendReviewReminder(requestId: string, bookingId: number) {
    try {
      setActionLoading(`${requestId}:review-reminder`);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/reviews/admin/bookings/${bookingId}/send-reminder`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(getApiMessage(data, "No se pudo enviar el recordatorio de reseña."));
        return;
      }

      const fresh = await fetchRequestById(requestId);

      if (fresh) {
        replaceRequest(fresh);
        setSelected(fresh);
        void fetchRequestLogs(fresh.id);
      }

      if (data?.email === "sent") {
        setMessage("Recordatorio de reseña enviado por correo.");
      } else if (data?.whatsapp === "prepared") {
        setMessage("Recordatorio de reseña preparado para WhatsApp. No se llamo ninguna API externa.");
      } else {
        setMessage(data?.reason || "Recordatorio de reseña procesado.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión enviando recordatorio de reseña.");
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
      void fetchRequestLogs(data.id);
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
      void fetchRequestLogs(data.id);
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
      setMessage("Error de conexión archivando solicitud.");
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
      `Motivo de cancelación para ${request.customerName || "esta solicitud"} (opcional):`,
      ""
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      "Esta acción no elimina físicamente el registro. Se marcará como Cancelada y quedará trazabilidad. ¿Continuar?"
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
      "El registro quedará oculto de la tabla operativa, pero se conserva en la base de datos. ¿Continuar?"
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
    <ReservationsWorkspace
      pendingRequests={pendingRequests}
      myRequests={myRequests}
      confirmedRequests={confirmedRequests}
      loading={loading}
      notificationsLoading={notificationsLoading}
      actionLoading={actionLoading}
      message={message}
      user={user}
      selected={selected}
      properties={properties}
      advisors={advisors}
      operationalNotifications={operationalNotifications}
      selectedLogs={selectedLogs}
      manualBookingResult={manualBookingResult}
      fetchRequests={fetchRequests}
      fetchOperationalNotifications={fetchOperationalNotifications}
      openRequestDetail={openRequestDetail}
      takeRequest={takeRequest}
      confirmCancelRequest={confirmCancelRequest}
      openInvoiceFromList={openInvoiceFromList}
      closeSelected={() => setSelected(null)}
      changeStatus={changeStatus}
      saveQuote={saveQuote}
      generatePaymentLink={generatePaymentLink}
      generateManualBooking={generateManualBooking}
      sendManualNotification={sendManualNotification}
      resendEmail={resendEmail}
      sendReviewRequest={sendReviewRequest}
      sendReviewReminder={sendReviewReminder}
      reassignRequest={reassignRequest}
      cancelRequest={cancelRequest}
    />
  );
}


