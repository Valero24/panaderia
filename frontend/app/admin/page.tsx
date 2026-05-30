"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarCheck,
  Clock,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
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

type Metrics = {
  pending: number;
  assigned: number;
  paymentPending: number;
  confirmed: number;
  cancelled: number;
  paymentsPending: number;
  advisorsActive: number;
  unattended: number;
  totalRevenue: number;
  bookingsConfirmed: number;
  occupancy: number;
};

type Advisor = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  metrics: {
    totalAssigned: number;
    confirmed: number;
    pending: number;
  };
};

const emptyMetrics: Metrics = {
  pending: 0,
  assigned: 0,
  paymentPending: 0,
  confirmed: 0,
  cancelled: 0,
  paymentsPending: 0,
  advisorsActive: 0,
  unattended: 0,
  totalRevenue: 0,
  bookingsConfirmed: 0,
  occupancy: 0,
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role;
  } catch {
    return null;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const role = readRole();

      if (role === "ADVISOR") {
        router.replace("/admin/reservas");
        return;
      }

      if (!token || role !== "SUPERADMIN") {
        setMessage("Acceso exclusivo para Super Admin.");
        return;
      }

      const [dashboardRes, advisorsRes] = await Promise.all([
        fetch(apiUrl("/admin-operations/dashboard"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl("/admin-operations/advisors"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dashboard = await dashboardRes.json();
      const advisorsData = await advisorsRes.json();

      if (!dashboardRes.ok || !advisorsRes.ok) {
        setMessage(dashboard.message || "No se pudo cargar el dashboard.");
        return;
      }

      setMetrics(dashboard);
      setAdvisors(Array.isArray(advisorsData) ? advisorsData : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdvisor(advisor: Advisor) {
    const token = localStorage.getItem("token");
    const res = await fetch(
      apiUrl(`/admin-operations/advisors/${advisor.id}/status`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !advisor.isActive }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message || "No se pudo actualizar el asesor.");
      return;
    }

    await fetchDashboard();
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
        <div className="premium-enter premium-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
                Super Admin
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] sm:text-4xl">
                Centro de control operativo
              </h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                Visión operativa global de solicitudes, pagos, asesores e ingresos.
              </p>
            </div>

            <Button
              type="button"
              onClick={fetchDashboard}
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

          <div className="mt-6 grid gap-3 border-t border-[#D4AF37]/15 pt-5 sm:grid-cols-3">
            <PulseTile label="Sin atender" value={metrics.unattended} tone="amber" />
            <PulseTile label="Confirmadas" value={metrics.confirmed} tone="blue" />
            <PulseTile label="Ocupacion" value={`${metrics.occupancy || 0}%`} tone="green" />
          </div>
        </div>

        {message && (
          <div className="premium-enter rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard loading={loading} icon={Clock} label="Pendientes" value={metrics.pending} />
          <MetricCard loading={loading} icon={UserCheck} label="Asignadas" value={metrics.assigned} />
          <MetricCard loading={loading} icon={CreditCard} label="Pendiente pago" value={metrics.paymentPending} />
          <MetricCard loading={loading} icon={CalendarCheck} label="Confirmadas" value={metrics.confirmed} />
          <MetricCard loading={loading} icon={Banknote} label="Ingresos" value={money(metrics.totalRevenue)} />
          <MetricCard loading={loading} icon={CreditCard} label="Pagos pendientes" value={metrics.paymentsPending} />
          <MetricCard loading={loading} icon={Users} label="Asesores activos" value={metrics.advisorsActive} />
          <MetricCard loading={loading} icon={ShieldCheck} label="Canceladas" value={metrics.cancelled} />
        </div>

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  Gestión de asesores
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estado operativo y rendimiento básico por asesor.
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-md border-[#D4AF37]/30 bg-[#F8F6F2]">
                {advisors.length} perfiles
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignadas</TableHead>
                  <TableHead>Confirmadas</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <>
                    {[1, 2, 3].map((item) => (
                      <TableRow key={item}>
                        <TableCell colSpan={6} className="py-4">
                          <div className="h-12 rounded-xl premium-skeleton" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {!loading && advisors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <Users className="h-9 w-9 text-[#B48A5A]" />
                        <p className="mt-3 font-medium text-[#0D2B52]">
                          No hay asesores registrados
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Cuando crees asesores, su operación aparecerá aquí.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {advisors.map((advisor) => (
                  <TableRow key={advisor.id} className="transition-colors hover:bg-[#F8F6F2]/70">
                    <TableCell>
                      <p className="font-medium text-[#0D2B52]">{advisor.name}</p>
                      <p className="text-xs text-slate-500">{advisor.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={advisor.isActive ? "default" : "secondary"}>
                        {advisor.isActive ? "Activo" : "Bloqueado"}
                      </Badge>
                    </TableCell>
                    <TableCell>{advisor.metrics.totalAssigned}</TableCell>
                    <TableCell>{advisor.metrics.confirmed}</TableCell>
                    <TableCell>{advisor.metrics.pending}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleAdvisor(advisor)}
                        className="rounded-xl premium-focus"
                      >
                        {advisor.isActive ? "Bloquear" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <Card className="premium-enter premium-surface rounded-2xl">
      <CardContent className="p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F6F2]">
          <Icon className="h-5 w-5 text-[#B48A5A]" />
        </div>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-3 h-9 w-24 rounded-lg premium-skeleton" />
        ) : (
          <h2 className="mt-2 text-3xl font-semibold text-[#0D2B52]">{value}</h2>
        )}
      </CardContent>
    </Card>
  );
}

function PulseTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "amber" | "blue" | "green";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-[#EAF0F8] text-[#0D2B52] border-[#0D2B52]/15",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
