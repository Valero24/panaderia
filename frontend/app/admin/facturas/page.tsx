"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";
import {
  adminInvoiceStatusLabel,
  adminPaymentStatusLabel,
} from "@/lib/admin-status-labels";

type Invoice = {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  preReservationId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerIdentification?: string | null;
  billingIdentificationNumber?: string | null;
  billingCustomerName?: string | null;
  issueDate: string;
  dueDate?: string | null;
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
  status:
    | "GENERATED"
    | "PENDING_PAYMENT"
    | "PAID"
    | "CANCELLED"
    | "FAILED"
    | string;
  paymentStatus:
    | "UNPAID"
    | "PARTIALLY_PAID"
    | "PAID"
    | "REFUNDED"
    | string;
  provider: string;
  mode: string;
  pdfUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Filters = {
  invoiceNumber: string;
  customerIdentification: string;
  status: string;
  paymentStatus: string;
  from: string;
  to: string;
};

const initialFilters: Filters = {
  invoiceNumber: "",
  customerIdentification: "",
  status: "",
  paymentStatus: "",
  from: "",
  to: "",
};

const statusOptions = [
  { value: "", label: "Todos" },
  { value: "GENERATED", label: "Generada" },
  { value: "PENDING_PAYMENT", label: "Pendiente de pago" },
  { value: "PAID", label: "Pagada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "FAILED", label: "Fallida" },
];

const paymentStatusOptions = [
  { value: "", label: "Todos" },
  { value: "UNPAID", label: "Sin pagar" },
  { value: "PARTIALLY_PAID", label: "Pago parcial" },
  { value: "PAID", label: "Pagado" },
  { value: "REFUNDED", label: "Reembolsado" },
];

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

function statusLabel(status: string) {
  return adminInvoiceStatusLabel(status);
}

function paymentStatusLabel(status: string) {
  return adminPaymentStatusLabel(status);
}

function statusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING_PAYMENT") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELLED" || status === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[#D4AF37]/25 bg-[#F8F6F2] text-[#0D2B52]";
}

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });

  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

export default function FacturasPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const totals = useMemo(
    () => ({
      count: invoices.length,
      total: invoices.reduce((sum, invoice) => sum + Number(invoice.totalCop ?? invoice.total ?? 0), 0),
      paid: invoices.filter((invoice) => invoice.status === "PAID").length,
      pending: invoices.filter((invoice) => invoice.status === "PENDING_PAYMENT").length,
    }),
    [invoices]
  );

  async function fetchInvoices(nextFilters = filters) {
    try {
      setLoading(true);
      setMessage("");

      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setInvoices([]);
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(buildQuery(nextFilters)), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setInvoices([]);
        setMessage(data?.message || "No se pudieron cargar las facturas.");
        return;
      }

      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando facturas.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(invoice: Invoice, status: string) {
    try {
      setActionLoading(`${invoice.id}:${status}`);
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
        await updatePaymentStatus(data, "PAID", false);
      } else if (status === "PENDING_PAYMENT") {
        await updatePaymentStatus(data, "UNPAID", false);
      }

      setMessage(`Factura ${data.invoiceNumber} actualizada.`);
      await fetchInvoices();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error de conexión actualizando factura."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function updatePaymentStatus(
    invoice: Invoice,
    paymentStatus: string,
    refresh = true
  ) {
    const token = localStorage.getItem("token");
    const response = await fetch(
      apiUrl(`/invoices/${invoice.id}/payment-status`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus }),
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "No se pudo actualizar el estado de pago.");
    }

    if (refresh) {
      setMessage(`Pago de ${data.invoiceNumber} actualizado.`);
      await fetchInvoices();
    }

    return data;
  }

  async function openInternalPdf(invoice: Invoice) {
    if (!invoice.preReservationId) return;

    const targetWindow = window.open("", "_blank");

    try {
      setActionLoading(`${invoice.id}:pdf`);
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

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(initialFilters);
    fetchInvoices(initialFilters);
  }

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && role !== "SUPERADMIN") {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700">
            El módulo de facturas internas solo está disponible para Superadmin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 sm:p-6 lg:p-0">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
              Finanzas internas
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
              Facturas internas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Control operativo de facturas generadas desde reservas confirmadas.
              No conecta Factus ni activa pagos reales.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => fetchInvoices()}
            disabled={loading}
            className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Facturas" value={totals.count} />
          <Metric label="Valor listado" value={money(totals.total)} />
          <Metric label="Pagadas" value={totals.paid} />
          <Metric label="Pendientes" value={totals.pending} />
        </section>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
          <CardContent className="space-y-4 p-4 lg:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-1 xl:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Número factura
                </span>
                <Input
                  value={filters.invoiceNumber}
                  onChange={(event) =>
                    updateFilter("invoiceNumber", event.target.value)
                  }
                  placeholder="INV-2026-000001"
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1 xl:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Cédula/NIT
                </span>
                <Input
                  value={filters.customerIdentification}
                  onChange={(event) =>
                    updateFilter("customerIdentification", event.target.value)
                  }
                  placeholder="Identificación"
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Estado
                </span>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilter("status", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0D2B52] outline-none focus:border-[#B48A5A]"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Pago
                </span>
                <select
                  value={filters.paymentStatus}
                  onChange={(event) =>
                    updateFilter("paymentStatus", event.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0D2B52] outline-none focus:border-[#B48A5A]"
                >
                  {paymentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Desde
                </span>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(event) => updateFilter("from", event.target.value)}
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Hasta
                </span>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(event) => updateFilter("to", event.target.value)}
                  className="rounded-xl"
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="rounded-xl"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
              <Button
                type="button"
                onClick={() => fetchInvoices()}
                className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {message && (
          <p className="rounded-xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm text-[#0D2B52]">
            {message}
          </p>
        )}

        <Card className="hidden rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cédula/NIT</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Fecha generación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Último cambio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">
                      Cargando facturas...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">
                      No hay facturas internas para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-semibold text-[#0D2B52]">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.billingCustomerName || invoice.customerName}</TableCell>
                    <TableCell>
                      {invoice.billingIdentificationNumber ||
                        invoice.customerIdentification ||
                        "Sin dato"}
                    </TableCell>
                    <TableCell>{invoice.customerEmail || "Sin correo"}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge value={statusLabel(invoice.status)} status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        value={paymentStatusLabel(invoice.paymentStatus)}
                        status={invoice.paymentStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[#0D2B52]">
                        {money(invoice.totalCop ?? invoice.total, "COP")}
                      </p>
                      {invoice.displayCurrency && invoice.displayCurrency !== "COP" ? (
                        <p className="text-xs text-slate-500">
                          Ref. {money(invoice.displayTotal || 0, invoice.displayCurrency)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatDate(invoice.lastStatusChangeAt)}</TableCell>
                    <TableCell>
                      <InvoiceActions
                        invoice={invoice}
                        loading={actionLoading}
                        onView={() => router.push(`/admin/facturas/${invoice.id}`)}
                        onPaid={() => updateStatus(invoice, "PAID")}
                        onPending={() => updateStatus(invoice, "PENDING_PAYMENT")}
                        onCancel={() => updateStatus(invoice, "CANCELLED")}
                        onPdf={() => openInternalPdf(invoice)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <section className="space-y-3 lg:hidden">
          {loading && <div className="h-44 rounded-2xl premium-skeleton" />}
          {!loading && invoices.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white">
              <CardContent className="p-6 text-center text-sm text-slate-500">
                No hay facturas internas para los filtros seleccionados.
              </CardContent>
            </Card>
          )}
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              loading={actionLoading}
              onView={() => router.push(`/admin/facturas/${invoice.id}`)}
              onPaid={() => updateStatus(invoice, "PAID")}
              onPending={() => updateStatus(invoice, "PENDING_PAYMENT")}
              onCancel={() => updateStatus(invoice, "CANCELLED")}
              onPdf={() => openInternalPdf(invoice)}
            />
          ))}
        </section>

      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-[#0D2B52]">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ value, status }: { value: string; status: string }) {
  return (
    <Badge variant="outline" className={`rounded-md ${statusClass(status)}`}>
      {value}
    </Badge>
  );
}

function InvoiceActions({
  invoice,
  loading,
  onView,
  onPaid,
  onPending,
  onCancel,
  onPdf,
}: {
  invoice: Invoice;
  loading: string;
  onView: () => void;
  onPaid: () => void;
  onPending: () => void;
  onCancel: () => void;
  onPdf: () => void;
}) {
  const isBusy = loading.startsWith(`${invoice.id}:`);
  const pdfAvailable = Boolean(invoice.preReservationId);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button type="button" variant="outline" onClick={onView} className="rounded-xl">
        <Eye className="mr-2 h-4 w-4" />
        Ver detalle
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPaid}
        disabled={isBusy || invoice.status === "PAID"}
        className="rounded-xl"
      >
        Marcar pagada
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPending}
        disabled={isBusy || invoice.status === "PENDING_PAYMENT"}
        className="rounded-xl"
      >
        Marcar pendiente
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isBusy || invoice.status === "CANCELLED"}
        className="rounded-xl text-red-700 hover:text-red-800"
      >
        Cancelar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPdf}
        disabled={isBusy || !pdfAvailable}
        className="rounded-xl"
        title={pdfAvailable ? "Abrir PDF interno" : "Sin PDF interno disponible"}
      >
        <FileText className="mr-2 h-4 w-4" />
        PDF interno
      </Button>
    </div>
  );
}

function InvoiceCard({
  invoice,
  loading,
  onView,
  onPaid,
  onPending,
  onCancel,
  onPdf,
}: {
  invoice: Invoice;
  loading: string;
  onView: () => void;
  onPaid: () => void;
  onPending: () => void;
  onCancel: () => void;
  onPdf: () => void;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B48A5A]">
              Factura
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#0D2B52]">
              {invoice.invoiceNumber}
            </h2>
          </div>
          <StatusBadge value={statusLabel(invoice.status)} status={invoice.status} />
        </div>

        <div className="grid gap-2 text-sm">
          <Info label="Cliente" value={invoice.billingCustomerName || invoice.customerName} />
          <Info
            label="Cédula/NIT"
            value={
              invoice.billingIdentificationNumber ||
              invoice.customerIdentification ||
              "Sin dato"
            }
          />
          <Info label="Correo" value={invoice.customerEmail || "Sin correo"} />
          <Info label="Fecha" value={formatDate(invoice.issueDate)} />
          <Info label="Pago" value={paymentStatusLabel(invoice.paymentStatus)} />
          <Info label="Total" value={money(invoice.totalCop ?? invoice.total, "COP")} />
          {invoice.displayCurrency && invoice.displayCurrency !== "COP" ? (
            <Info
              label="Referencia visual"
              value={money(invoice.displayTotal || 0, invoice.displayCurrency)}
            />
          ) : null}
          <Info label="Último cambio" value={formatDate(invoice.lastStatusChangeAt)} />
        </div>

        <InvoiceActions
          invoice={invoice}
          loading={loading}
          onView={onView}
          onPaid={onPaid}
          onPending={onPending}
          onCancel={onCancel}
          onPdf={onPdf}
        />
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-xl bg-[#F8F6F2] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-[#0D2B52]">{value}</span>
    </div>
  );
}
