"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  History,
  Lock,
  MapPin,
  ReceiptText,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { auditActionLabel, roleLabel } from "@/lib/admin-log-labels";

type InvoiceDetail = {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  preReservationId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerIdentification?: string | null;
  issueDate: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
  lastStatusChangeAt: string;
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  currency: string;
  subtotalCop?: number | null;
  taxCop?: number | null;
  discountCop?: number | null;
  totalCop?: number | null;
  displayCurrency?: string | null;
  displayTotal?: number | null;
  exchangeRate?: number | null;
  exchangeRateSource?: string | null;
  exchangeRateDate?: string | null;
  status: string;
  paymentStatus: string;
  provider: string;
  mode: string;
  pdfUrl?: string | null;
  notes?: string | null;
  auditLogs?: InvoiceAuditLog[];
  booking?: {
    id: number;
    reservationCode?: string | null;
    productName?: string | null;
    type?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    guests?: number | null;
    adults?: number | null;
    children?: number | null;
    infants?: number | null;
    status?: string | null;
    advisorName?: string | null;
    invoicePath?: string | null;
    billingLegalOrganizationType?: string | null;
    billingIdentificationDocumentType?: string | null;
    billingIdentificationNumber?: string | null;
    billingVerificationDigit?: string | null;
    billingCustomerName?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    billingDepartment?: string | null;
    billingMunicipalityName?: string | null;
    billingAddress?: string | null;
    billingTaxResponsibility?: string | null;
    billingTributeId?: string | null;
    billingDataAccepted?: boolean;
    billingIsComplete?: boolean;
  } | null;
  preReservation?: {
    id: string;
    status: string;
    customerName: string;
    email?: string | null;
    customerPhone?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    assignedTo?: {
      id: number;
      name: string;
      email: string;
    } | null;
    items?: {
      type: string;
      referenceId: number;
      name?: string | null;
      guests?: number | null;
    }[];
  } | null;
};

type InvoiceAuditLog = {
  id: number;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  message?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  GENERATED: "Generada",
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  FAILED: "Fallida",
};

const paymentLabels: Record<string, string> = {
  UNPAID: "Sin pagar",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagado",
  REFUNDED: "Reembolsado",
};

const productTypeLabels: Record<string, string> = {
  PROPERTY: "Alojamiento",
  EXPERIENCE: "Experiencia",
  PACKAGE: "Paquete",
};

const bookingStatusLabels: Record<string, string> = {
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

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function money(value: number, currency = "COP") {
  return `${currency} ${Number(value || 0).toLocaleString("es-CO")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin dato";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING_PAYMENT") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELLED" || status === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[#D4AF37]/25 bg-[#F8F6F2] text-[#0D2B52]";
}

function bookingStatusLabel(status?: string | null) {
  return status ? bookingStatusLabels[status] || status : "Sin dato";
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    INVOICE_GENERATED: "Factura creada",
    INVOICE_COP_GENERATED: "Factura interna generada",
    INVOICE_CREATED: "Factura interna creada",
    INVOICE_DETAIL_VIEWED: "Detalle consultado",
    INVOICE_DUPLICATE_ATTEMPT: "Intento duplicado",
    INVOICE_STATUS_UPDATED: "Estado actualizado",
    INVOICE_PAYMENT_STATUS_UPDATED: "Pago actualizado",
    INVOICE_MARKED_PAID: "Marcada como pagada",
    INVOICE_CANCELLED: "Cancelada",
  };

  return labels[action] || auditActionLabel(action);
}

function readLogObject(value: unknown) {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function statusFromLog(value: unknown) {
  const logValue = readLogObject(value);
  const status = logValue.status || logValue.paymentStatus;

  return typeof status === "string" ? status : "";
}

export default function FacturaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState("");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");

  const reservationItem = invoice?.preReservation?.items?.[0];
  const productType =
    invoice?.booking?.type || reservationItem?.type || "Reserva";
  const productName =
    invoice?.booking?.productName || reservationItem?.name || "Producto reservado";
  const advisorName =
    invoice?.booking?.advisorName ||
    invoice?.preReservation?.assignedTo?.name ||
    "Sin asesor";

  const billingRows = useMemo<[string, string | number | boolean | null | undefined][]>(() => {
    const booking = invoice?.booking;
    const rows: [string, string | number | boolean | null | undefined][] = [
      ["Tipo persona", booking?.billingLegalOrganizationType],
      ["Tipo documento", booking?.billingIdentificationDocumentType],
      ["Identificación", booking?.billingIdentificationNumber],
      ["Dígito verificación", booking?.billingVerificationDigit],
      ["Nombre/Razón social", booking?.billingCustomerName],
      ["Correo facturación", booking?.billingEmail],
      ["Teléfono facturación", booking?.billingPhone],
      ["Departamento", booking?.billingDepartment],
      ["Municipio", booking?.billingMunicipalityName],
      ["Dirección fiscal", booking?.billingAddress],
      ["Responsabilidad tributaria", booking?.billingTaxResponsibility],
      ["Tributo", booking?.billingTributeId],
    ];

    return rows.filter(([, value]) => Boolean(value));
  }, [invoice]);

  async function fetchInvoice() {
    try {
      setLoading(true);
      setMessage("");

      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/invoices/${params.id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.message || "No se pudo cargar la factura.");
        setInvoice(null);
        return;
      }

      setInvoice(data);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando la factura.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    if (!invoice) return;

    try {
      setActionLoading(status);
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/invoices/${invoice.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar la factura.");
      }

      if (status === "PAID") {
        await updatePaymentStatus("PAID", false);
      } else if (status === "PENDING_PAYMENT") {
        await updatePaymentStatus("UNPAID", false);
      }

      setInvoice(data);
      setMessage(`Factura ${data.invoiceNumber} actualizada.`);
      await fetchInvoice();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error de conexión actualizando la factura."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function updatePaymentStatus(paymentStatus: string, refresh = true) {
    if (!invoice) return null;

    const token = localStorage.getItem("token");
    const response = await fetch(apiUrl(`/invoices/${invoice.id}/payment-status`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentStatus }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "No se pudo actualizar el estado de pago.");
    }

    if (refresh) {
      setInvoice(data);
      setMessage(`Estado de pago actualizado para ${data.invoiceNumber}.`);
    }

    return data;
  }

  async function openInternalPdf() {
    if (!invoice?.preReservationId) return;

    const targetWindow = window.open("", "_blank");

    try {
      setActionLoading("pdf");
      setMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/pre-reservations/${invoice.preReservationId}/invoice/view`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        targetWindow?.close();
        setMessage(errorText || "No se pudo abrir el PDF interno.");
        return;
      }

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);

      if (targetWindow) {
        targetWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, "_blank");
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error) {
      console.error(error);
      targetWindow?.close();
      setMessage("Error de conexión abriendo PDF interno.");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!loading && role !== "SUPERADMIN") {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700">
            El detalle de facturas solo está disponible para Superadmin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 sm:p-6 lg:p-0">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/facturas")}
            className="w-fit rounded-xl bg-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a facturas
          </Button>
          {invoice?.preReservationId && (
            <Button
              type="button"
              onClick={() =>
                router.push(`/admin/reservas?preReservationId=${invoice.preReservationId}`)
              }
              className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              Ir a reserva
            </Button>
          )}
        </div>

        {message && (
          <p className="rounded-xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm text-[#0D2B52]">
            {message}
          </p>
        )}

        {loading || !invoice ? (
          <div className="h-[520px] rounded-3xl premium-skeleton" />
        ) : (
          <>
            <header className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm lg:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
                    Detalle de factura interna
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
                    {invoice.invoiceNumber}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Factura operativa asociada a una reserva confirmada. No es
                    factura electrónica DIAN.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={statusLabels[invoice.status] || invoice.status}
                    status={invoice.status}
                  />
                  <StatusBadge
                    label={paymentLabels[invoice.paymentStatus] || invoice.paymentStatus}
                    status={invoice.paymentStatus}
                  />
                </div>
              </div>
            </header>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-6">
                <InfoSection
                  icon={ReceiptText}
                  title="Informacion general"
                  rows={[
                    ["Numero factura", invoice.invoiceNumber],
                    ["Estado", statusLabels[invoice.status] || invoice.status],
                    ["Estado de pago", paymentLabels[invoice.paymentStatus] || invoice.paymentStatus],
                    ["Fecha generacion", formatDate(invoice.issueDate)],
                    ["Último cambio", formatDate(invoice.lastStatusChangeAt)],
                    ["Proveedor", invoice.provider],
                    ["Modo", invoice.mode],
                  ]}
                />

                <InfoSection
                  icon={UserRound}
                  title="Cliente"
                  rows={[
                    ["Nombre", invoice.booking?.billingCustomerName || invoice.customerName],
                    ["Correo", invoice.booking?.billingEmail || invoice.customerEmail || "Sin correo"],
                    ["Teléfono", invoice.booking?.billingPhone || invoice.customerPhone || "Sin teléfono"],
                    [
                      "Cédula/NIT",
                      invoice.booking?.billingIdentificationNumber ||
                        invoice.customerIdentification ||
                        "Sin dato",
                    ],
                    ...billingRows,
                  ]}
                  emptyText="No hay datos fiscales adicionales registrados."
                />

                <InfoSection
                  icon={MapPin}
                  title="Reserva asociada"
                  rows={[
                    ["Codigo RES", invoice.booking?.reservationCode || "Sin codigo"],
                    ["Tipo", productTypeLabels[productType] || productType],
                    ["Producto", productName],
                    ["Fechas", `${formatDate(invoice.booking?.checkIn || invoice.preReservation?.checkIn)} - ${formatDate(invoice.booking?.checkOut || invoice.preReservation?.checkOut)}`],
                    ["Huespedes", String(invoice.booking?.guests || reservationItem?.guests || "Sin dato")],
                    ["Asesor", advisorName],
                    ["Estado reserva", bookingStatusLabel(invoice.booking?.status)],
                  ]}
                />
              </div>

              <aside className="space-y-6">
                <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[#B48A5A]" />
                      <h2 className="text-xl font-semibold text-[#0D2B52]">
                        Valores
                      </h2>
                    </div>
                    <ValueRow label="Subtotal" value={money(invoice.subtotalCop ?? invoice.subtotal, "COP")} />
                    <ValueRow label="Impuestos" value={money(invoice.taxCop ?? invoice.taxes, "COP")} />
                    <ValueRow label="Descuentos" value={money(invoice.discountCop ?? invoice.discounts, "COP")} />
                    <div className="rounded-2xl bg-[#0D2B52] px-4 py-4 text-white">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                        Total
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {money(invoice.totalCop ?? invoice.total, "COP")}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        Moneda fiscal: COP
                      </p>
                      {invoice.displayCurrency && invoice.displayCurrency !== "COP" ? (
                        <p className="mt-1 text-xs text-white/70">
                          Ref. visual: {money(invoice.displayTotal || 0, invoice.displayCurrency)}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <h2 className="text-xl font-semibold text-[#0D2B52]">
                      Acciones
                    </h2>
                    <Button
                      type="button"
                      onClick={() => updateStatus("PAID")}
                      disabled={Boolean(actionLoading) || invoice.status === "PAID"}
                      className="w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                    >
                      Marcar pagada
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateStatus("PENDING_PAYMENT")}
                      disabled={Boolean(actionLoading) || invoice.status === "PENDING_PAYMENT"}
                      className="w-full rounded-xl"
                    >
                      Marcar pendiente
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateStatus("CANCELLED")}
                      disabled={Boolean(actionLoading) || invoice.status === "CANCELLED"}
                      className="w-full rounded-xl text-red-700 hover:text-red-800"
                    >
                      Cancelar factura
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openInternalPdf}
                      disabled={Boolean(actionLoading) || !invoice.preReservationId}
                      className="w-full rounded-xl"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir PDF interno
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-dashed border-[#D4AF37]/40 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8F6F2]">
                        <Lock className="h-5 w-5 text-[#B48A5A]" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#B48A5A]">
                          Futuro Factus
                        </p>
                        <h2 className="text-lg font-semibold text-[#0D2B52]">
                          DIAN pendiente
                        </h2>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      Factura electrónica DIAN pendiente de integración. Esta
                      vista no llama Factus, no envía datos a DIAN y no activa
                      facturación real.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </section>

            <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-[#B48A5A]" />
                  <h2 className="text-xl font-semibold text-[#0D2B52]">
                    Historial de factura
                  </h2>
                </div>

                {!invoice.auditLogs || invoice.auditLogs.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-[#F8F6F2] px-4 py-4 text-sm text-slate-500">
                    No hay movimientos registrados para esta factura.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {invoice.auditLogs.map((log) => {
                      const previousStatus = statusFromLog(log.previousValue);
                      const newStatus = statusFromLog(log.newValue);

                      return (
                        <div
                          key={log.id}
                          className="rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-[#0D2B52]">
                                {actionLabel(log.action)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {log.message || "Movimiento registrado"}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDate(log.createdAt)}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                            <HistoryInfo
                              label="Usuario"
                              value={log.actorName || roleLabel(log.actorRole) || "Sistema"}
                            />
                            <HistoryInfo
                              label="Estado anterior"
                              value={
                                previousStatus
                                  ? statusLabels[previousStatus] ||
                                    paymentLabels[previousStatus] ||
                                    previousStatus
                                  : "Sin cambio"
                              }
                            />
                            <HistoryInfo
                              label="Estado nuevo"
                              value={
                                newStatus
                                  ? statusLabels[newStatus] ||
                                    paymentLabels[newStatus] ||
                                    newStatus
                                  : "Sin cambio"
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  return (
    <Badge variant="outline" className={`rounded-md ${statusClass(status)}`}>
      {label}
    </Badge>
  );
}

function InfoSection({
  icon: Icon,
  title,
  rows,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rows: [string, string | number | boolean | null | undefined][];
  emptyText?: string;
}) {
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[#B48A5A]" />
          <h2 className="text-xl font-semibold text-[#0D2B52]">{title}</h2>
        </div>

        {visibleRows.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#F8F6F2] px-4 py-4 text-sm text-slate-500">
            {emptyText || "Sin información registrada."}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleRows.map(([label, value]) => (
              <div
                key={`${label}-${String(value)}`}
                className="rounded-2xl bg-[#F8F6F2] px-4 py-3"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 break-words font-medium text-[#0D2B52]">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-[#F8F6F2] px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#0D2B52]">{value}</span>
    </div>
  );
}

function HistoryInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-[#0D2B52]">{value}</p>
    </div>
  );
}
