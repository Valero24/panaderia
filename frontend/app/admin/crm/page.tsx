"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Bell, CalendarDays, ClipboardList, KanbanSquare, MessageSquareText, Plus, TrendingUp, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { crmFetch, sourceLabels, statusLabels } from "./crm-shared";

type Dashboard = {
  total: number;
  newLeads: number;
  reserved: number;
  lost: number;
  overdueFollowUps: number;
  conversionRate: number;
  byStatus: Array<{ status: keyof typeof statusLabels; _count: { _all: number } }>;
  bySource: Array<{ source: keyof typeof sourceLabels; _count: { _all: number } }>;
  topSource?: string | null;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-[#0D2B52]">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function CrmDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    crmFetch<Dashboard>("/crm/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            CRM operativo
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Gestión comercial
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Leads, tareas, seguimientos y embudo de oportunidades asistidas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-xl bg-[#0D2B52]">
            <Link href="/admin/crm/leads/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo lead
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/crm/leads">Ver leads</Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Leads totales" value={data?.total ?? 0} />
        <Metric label="Nuevos" value={data?.newLeads ?? 0} />
        <Metric label="Reservados" value={data?.reserved ?? 0} />
        <Metric label="Perdidos" value={data?.lost ?? 0} />
        <Metric label="Seguimientos vencidos" value={data?.overdueFollowUps ?? 0} />
        <Metric label="Conversión" value={`${data?.conversionRate ?? 0}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white lg:col-span-2">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Embudo por estado</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {(data?.byStatus || []).map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <span className="text-sm text-slate-600">
                    {statusLabels[item.status] || item.status}
                  </span>
                  <Badge variant="outline">{item._count._all}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Accesos rápidos</h2>
            <div className="grid gap-3">
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/productividad">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Productividad
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/leads">
                  <UsersRound className="mr-2 h-4 w-4" />
                  Leads
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/tareas">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Tareas
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/embudo">
                  <KanbanSquare className="mr-2 h-4 w-4" />
                  Embudo
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/actividad">
                  <Activity className="mr-2 h-4 w-4" />
                  Actividad
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/agenda">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Agenda
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/plantillas">
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  Plantillas
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/admin/crm/notificaciones">
                  <Bell className="mr-2 h-4 w-4" />
                  Notificaciones
                </Link>
              </Button>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0D2B52]">Origen más frecuente</p>
              <p className="mt-1 text-sm text-slate-500">
                {data?.topSource ? sourceLabels[data.topSource as keyof typeof sourceLabels] : "Sin datos"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
