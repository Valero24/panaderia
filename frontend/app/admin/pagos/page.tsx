"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";
import { adminPaymentStatusLabel } from "@/lib/admin-status-labels";

type Payment = {
  id: number;
  amount: number;
  amountCop?: number | null;
  currency: string;
  displayCurrency?: string | null;
  displayAmount?: number | null;
  exchangeRate?: number | null;
  exchangeRateSource?: string | null;
  provider: string;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  providerReference?: string | null;
  providerStatus?: string | null;
  paidAt?: string | null;
  status: string;
  wompiReference?: string | null;
  stripePaymentIntentId?: string | null;
  createdAt: string;
  preReservation?: {
    customerName: string;
    email: string;
    paymentMethodPreferred?: string | null;
    assignedTo?: {
      name: string;
    } | null;
  } | null;
};

function money(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString("es-CO")}`;
}

function paymentAmount(payment: Payment) {
  return money(payment.amountCop ?? payment.amount, "COP");
}

function paymentStatusLabel(status?: string | null) {
  return adminPaymentStatusLabel(status);
}

function paymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    CARD: "Tarjeta",
    CASH: "Efectivo",
    MANUAL: "Manual",
    PSE: "PSE",
    TRANSFER: "Transferencia",
    WOMPI: "Wompi",
  };

  return method ? labels[method] || method : "No aplica";
}

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  async function fetchPayments() {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const storedRole = JSON.parse(localStorage.getItem("user") || "{}")?.role;

      if (!["SUPERADMIN", "ADMIN"].includes(storedRole)) {
        setRole(storedRole || "");
        setMessage("Acceso reservado para Superadmin.");
        setPayments([]);
        return;
      }

      setRole(storedRole || "");
      const res = await fetch(apiUrl("/admin-operations/payments"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar los pagos.");
        setPayments([]);
        return;
      }

      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando pagos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  if (role && !["SUPERADMIN", "ADMIN"].includes(role)) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-[#B48A5A]">
            Permisos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Panel de pagos restringido
          </h1>
          <p className="mt-3 text-slate-500">
            Tu rol permite gestionar solicitudes asignadas. La vista global de
            pagos está reservada para Superadmin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Finanzas
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[#0D2B52]">
              Panel de pagos
            </h1>
            <p className="mt-2 text-slate-500">
              Seguimiento operativo de pagos Wompi y registros heredados.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={fetchPayments}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52]">
            {message}
          </div>
        )}

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      Cargando pagos...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No hay pagos registrados.
                    </TableCell>
                  </TableRow>
                )}
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-medium text-[#0D2B52]">
                        {payment.preReservation?.customerName || "Cliente"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.preReservation?.email || "Sin correo"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {payment.preReservation?.assignedTo?.name || "Sin asesor"}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[#0D2B52]">
                        {paymentAmount(payment)}
                      </p>
                      {payment.displayCurrency && payment.displayCurrency !== "COP" ? (
                        <p className="text-xs text-slate-500">
                          Aprox. {money(payment.displayAmount || 0, payment.displayCurrency)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabel(payment.paymentProvider || payment.provider)} /{" "}
                      {paymentMethodLabel(payment.paymentMethod || payment.preReservation?.paymentMethodPreferred)}
                    </TableCell>
                    <TableCell>
                      {payment.providerReference ||
                        payment.wompiReference ||
                        payment.stripePaymentIntentId ||
                        `#${payment.id}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "FAILED" ? "destructive" : "outline"}>
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
