"use client";

import { useEffect, useState } from "react";
import { Bell, Calculator, CheckCircle2, Clock, Copy, CreditCard, Download, Edit3, Eye, FileText, Gem, Mail, Phone, RefreshCw, Save, UserCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReservationTimeline from "@/components/admin/reservation-timeline";
import StatusBadge, {
  getReservationStatusMeta,
} from "@/components/admin/status-badge";
import { auditActionLabel, roleLabel } from "@/lib/admin-log-labels";
import { apiUrl } from "@/lib/api";
import { InfoTile } from "./components";
import { allowedStatusTransitions, getOperationalStatusLabel, getReservationStatusLabel, realAvailabilityEnabled, realPaymentsEnabled, statusActions } from "./constants";
import type { AdvisorOption, InvoiceRecord, OperationalLog, PreReservation, PropertyOption, QuoteForm, User } from "./types";
import { date, dateInput, guestsLabel, money, primaryItem, productLabel } from "./utils";

type BillingForm = {
  billingLegalOrganizationType: string;
  billingIdentificationDocumentType: string;
  billingIdentificationNumber: string;
  billingVerificationDigit: string;
  billingCustomerName: string;
  billingEmail: string;
  billingPhone: string;
  billingDepartment: string;
  billingMunicipalityName: string;
  billingAddress: string;
  billingTaxResponsibility: string;
  billingDataAccepted: boolean;
};

function billingFormFromRequest(request: PreReservation): BillingForm {
  return {
    billingLegalOrganizationType:
      request.billingLegalOrganizationType || "PERSONA_NATURAL",
    billingIdentificationDocumentType:
      request.billingIdentificationDocumentType || "CC",
    billingIdentificationNumber: request.billingIdentificationNumber || "",
    billingVerificationDigit: request.billingVerificationDigit || "",
    billingCustomerName: request.billingCustomerName || request.customerName || "",
    billingEmail: request.billingEmail || request.email || "",
    billingPhone: request.billingPhone || request.customerPhone || "",
    billingDepartment: request.billingDepartment || "",
    billingMunicipalityName: request.billingMunicipalityName || "",
    billingAddress: request.billingAddress || "",
    billingTaxResponsibility:
      request.billingTaxResponsibility || "No responsable de IVA",
    billingDataAccepted: Boolean(request.billingDataAccepted),
  };
}

export function RequestDetail({
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
  operationalLogs,
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
  operationalLogs: OperationalLog[];
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
  const [internalInvoice, setInternalInvoice] = useState<InvoiceRecord | null>(
    request.booking?.invoices?.[0] || null
  );
  const [internalInvoiceLoading, setInternalInvoiceLoading] = useState(false);
  const [internalInvoiceMessage, setInternalInvoiceMessage] = useState("");
  const [billingForm, setBillingForm] = useState<BillingForm>(
    billingFormFromRequest(request)
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
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
  const canManageInternalInvoice =
    currentUser?.role === "SUPERADMIN" &&
    Boolean(confirmedBooking?.id) &&
    (confirmedBooking?.status === "CONFIRMED" || request.status === "CONFIRMED");
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
    setInternalInvoice(request.booking?.invoices?.[0] || null);
    setInternalInvoiceMessage("");
    setBillingForm(billingFormFromRequest(request));
    setBillingMessage("");
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

  function updateBillingForm(key: keyof BillingForm, value: string | boolean) {
    setBillingForm((current) => ({
      ...current,
      [key]: value,
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

  async function generateInternalInvoice() {
    if (!confirmedBooking?.id) return;

    try {
      setInternalInvoiceLoading(true);
      setInternalInvoiceMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/invoices/from-booking/${confirmedBooking.id}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo generar la factura interna.");
      }

      setInternalInvoice(data);
      setInternalInvoiceMessage(
        `Factura interna ${data.invoiceNumber} generada correctamente.`
      );
    } catch (error) {
      console.error(error);
      setInternalInvoiceMessage(
        error instanceof Error
          ? error.message
          : "Error de conexión generando factura interna."
      );
    } finally {
      setInternalInvoiceLoading(false);
    }
  }

  async function saveBillingData() {
    try {
      setBillingLoading(true);
      setBillingMessage("");

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/pre-reservations/${request.id}/billing`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(billingForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setBillingMessage(data?.message || "No se pudieron guardar los datos fiscales.");
        return;
      }

      setBillingForm(billingFormFromRequest(data));
      setBillingMessage(
        data.billingIsComplete
          ? "Datos de facturación completos y guardados."
          : "Datos de facturación guardados como incompletos."
      );
    } catch (error) {
      console.error(error);
      setBillingMessage("Error de conexión guardando datos fiscales.");
    } finally {
      setBillingLoading(false);
    }
  }

  const billingIsComplete =
    Boolean(billingForm.billingDataAccepted) &&
    [
      billingForm.billingLegalOrganizationType,
      billingForm.billingIdentificationDocumentType,
      billingForm.billingIdentificationNumber,
      billingForm.billingIdentificationDocumentType === "NIT"
        ? billingForm.billingVerificationDigit
        : "no-aplica",
      billingForm.billingCustomerName,
      billingForm.billingEmail,
      billingForm.billingPhone,
      billingForm.billingDepartment,
      billingForm.billingMunicipalityName,
      billingForm.billingAddress,
      billingForm.billingTaxResponsibility,
    ].every((value) => String(value || "").trim());

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
          <InfoTile icon={CreditCard} label="Método preferido" value={request.paymentMethodPreferred || "Pendiente"} />
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
                  <span className="text-slate-500">Huéspedes:</span>{" "}
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

            <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                    <FileText className="h-4 w-4 text-[#B48A5A]" />
                    Datos de facturación
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Información preparada para una futura factura electrónica
                    DIAN. Factus permanece desactivado.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    billingIsComplete
                      ? "w-fit rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "w-fit rounded-md border-amber-200 bg-amber-50 text-amber-700"
                  }
                >
                  {billingIsComplete ? "Completa" : "Incompleta"}
                </Badge>
              </div>

              {!billingIsComplete && (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Faltan datos para emitir factura electrónica cuando se active
                  la integración DIAN.
                </p>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Tipo de persona</span>
                  <select
                    value={billingForm.billingLegalOrganizationType}
                    onChange={(event) =>
                      updateBillingForm(
                        "billingLegalOrganizationType",
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-[#0D2B52]"
                  >
                    <option value="PERSONA_NATURAL">Persona natural</option>
                    <option value="PERSONA_JURIDICA">Persona juridica</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">Tipo de documento</span>
                  <select
                    value={billingForm.billingIdentificationDocumentType}
                    onChange={(event) =>
                      updateBillingForm(
                        "billingIdentificationDocumentType",
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-[#0D2B52]"
                  >
                    <option value="CC">Cedula de ciudadania</option>
                    <option value="CE">Cedula de extranjeria</option>
                    <option value="NIT">NIT</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="FOREIGN_ID">Documento extranjero</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>

                <Input
                  placeholder="Numero de identificacion"
                  value={billingForm.billingIdentificationNumber}
                  onChange={(event) =>
                    updateBillingForm(
                      "billingIdentificationNumber",
                      event.target.value
                    )
                  }
                />
                <Input
                  placeholder="Digito de verificacion si aplica"
                  value={billingForm.billingVerificationDigit}
                  onChange={(event) =>
                    updateBillingForm(
                      "billingVerificationDigit",
                      event.target.value
                    )
                  }
                />
                <Input
                  placeholder="Nombre completo o razon social"
                  value={billingForm.billingCustomerName}
                  onChange={(event) =>
                    updateBillingForm("billingCustomerName", event.target.value)
                  }
                />
                <Input
                  type="email"
                  placeholder="Correo de facturación"
                  value={billingForm.billingEmail}
                  onChange={(event) =>
                    updateBillingForm("billingEmail", event.target.value)
                  }
                />
                <Input
                  placeholder="Teléfono de facturación"
                  value={billingForm.billingPhone}
                  onChange={(event) =>
                    updateBillingForm("billingPhone", event.target.value)
                  }
                />
                <Input
                  placeholder="Departamento"
                  value={billingForm.billingDepartment}
                  onChange={(event) =>
                    updateBillingForm("billingDepartment", event.target.value)
                  }
                />
                <Input
                  placeholder="Municipio / ciudad"
                  value={billingForm.billingMunicipalityName}
                  onChange={(event) =>
                    updateBillingForm(
                      "billingMunicipalityName",
                      event.target.value
                    )
                  }
                />
                <Input
                  placeholder="Direccion fiscal"
                  value={billingForm.billingAddress}
                  onChange={(event) =>
                    updateBillingForm("billingAddress", event.target.value)
                  }
                />
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-500">
                    Responsabilidad tributaria
                  </span>
                  <select
                    value={billingForm.billingTaxResponsibility}
                    onChange={(event) =>
                      updateBillingForm(
                        "billingTaxResponsibility",
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-[#0D2B52]"
                  >
                    <option>No responsable de IVA</option>
                    <option>Responsable de IVA</option>
                    <option>Regimen simple</option>
                    <option>Otro</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-xl bg-[#F8F6F2] p-4 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={billingForm.billingDataAccepted}
                  onChange={(event) =>
                    updateBillingForm("billingDataAccepted", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0D2B52]"
                />
                Autorizo el uso de estos datos para la emision de factura
                electrónica si la reserva es confirmada.
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {billingMessage && (
                  <p className="text-sm text-slate-600">{billingMessage}</p>
                )}
                <Button
                  type="button"
                  onClick={saveBillingData}
                  disabled={billingLoading}
                  className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d] sm:ml-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {billingLoading ? "Guardando..." : "Guardar datos fiscales"}
                </Button>
              </div>
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

            {currentUser?.role === "SUPERADMIN" && (
              <section className="rounded-2xl border border-[#D4AF37]/20 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                  <Clock className="h-4 w-4 text-[#B48A5A]" />
                  Historial operativo
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Cambios registrados sobre esta solicitud.
                </p>

                {operationalLogs.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-[#F8F6F2] px-3 py-2 text-sm text-slate-500">
                    No hay eventos visibles para esta solicitud.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {operationalLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="rounded-md bg-white">
                            {auditActionLabel(log.action)}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {date(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-[#0D2B52]">
                          {log.message || "Evento registrado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {log.actorName || "Sistema"} · {roleLabel(log.actorRole || "PUBLIC")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

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
                        ? `Pasar a ${getReservationStatusLabel(action.nextStatus)}`
                        : `No disponible desde ${getReservationStatusLabel(request.status)}`
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
                  Control Superadmin
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
                    <span>{getReservationStatusLabel(confirmedBooking.status || "CONFIRMED")}</span>
                  </div>

                  {canManageInternalInvoice && (
                    <div className="space-y-3 rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
                            Factura interna
                          </p>
                          {internalInvoice ? (
                            <p className="mt-1 text-sm font-semibold text-[#0D2B52]">
                              {internalInvoice.invoiceNumber}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-600">
                              Aún no se ha generado factura interna para esta
                              reserva.
                            </p>
                          )}
                        </div>
                        {internalInvoice && (
                          <Badge
                            variant="outline"
                            className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            {internalInvoice.status}
                          </Badge>
                        )}
                      </div>

                      {!billingIsComplete && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Datos fiscales incompletos para factura electrónica
                          futura.
                        </p>
                      )}

                      {internalInvoice ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openInvoice("view")}
                          disabled={!invoiceAvailable || Boolean(invoiceLoading)}
                          className="w-full rounded-xl bg-white"
                          title={
                            invoiceAvailable
                              ? "Abrir comprobante PDF asociado"
                              : "La reserva no tiene PDF interno disponible"
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {invoiceLoading === "view"
                            ? "Abriendo..."
                            : "Ver factura"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={generateInternalInvoice}
                          disabled={internalInvoiceLoading}
                          className="w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {internalInvoiceLoading
                            ? "Generando..."
                            : "Generar factura interna"}
                        </Button>
                      )}

                      {internalInvoiceMessage && (
                        <p
                          className={`rounded-lg px-3 py-2 text-xs ${
                            internalInvoice
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {internalInvoiceMessage}
                        </p>
                      )}
                    </div>
                  )}

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
                          Notificación manual
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
                                ? "Cliente sin teléfono"
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
                                : "sin teléfono"}
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
                    : `Disponible solo desde Disponible o Pendiente de pago`
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
                      : `No disponible en estado ${getReservationStatusLabel(request.status)}`
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
