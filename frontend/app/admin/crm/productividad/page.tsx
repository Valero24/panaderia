"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, ClipboardList, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lead,
  crmFetch,
  formatDate,
  healthLabels,
  priorityLabels,
  statusLabels,
} from "../crm-shared";

type Productivity = {
  tasksToday: number;
  overdueTasks: number;
  upcomingFollowUps: number;
  newWithoutContact: number;
  urgentLeads: number;
  staleLeadsCount: number;
  staleLeads: Lead[];
  upcomingTrips: Lead[];
  negotiation: number;
  recentLost: number;
  alerts: string[];
  workload: Array<{
    advisor: { id: number; name: string; email: string };
    activeLeads: number;
    pendingTasks: number;
    overdueTasks: number;
    urgentLeads: number;
  }>;
};

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-[#0D2B52]">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function CrmProductivityPage() {
  const [data, setData] = useState<Productivity | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    crmFetch<Productivity>("/crm/productivity")
      .then(setData)
      .catch((error) => setMessage(error.message));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Productividad comercial
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Prioridades diarias, vencimientos, salud de leads y carga por asesor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/crm/productividad/mi-panel">Mi panel</Link>
          </Button>
          <Button asChild className="bg-[#0D2B52]">
            <Link href="/admin/crm/tareas">Ver tareas</Link>
          </Button>
        </div>
      </div>

      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Tareas hoy" value={data?.tasksToday ?? 0} />
        <Metric label="Tareas vencidas" value={data?.overdueTasks ?? 0} />
        <Metric label="Seguimientos próximos" value={data?.upcomingFollowUps ?? 0} />
        <Metric label="Nuevos sin contacto" value={data?.newWithoutContact ?? 0} />
        <Metric label="Leads urgentes" value={data?.urgentLeads ?? 0} />
        <Metric label="En negociación" value={data?.negotiation ?? 0} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0D2B52]">
              <AlertTriangle className="h-5 w-5 text-[#B48A5A]" />
              Alertas internas
            </h2>
            {data?.alerts?.length ? (
              data.alerts.map((alert) => (
                <p key={alert} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                  {alert}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin alertas críticas por ahora.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white xl:col-span-2">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Leads sin seguimiento</h2>
            {(data?.staleLeads || []).length === 0 ? (
              <p className="text-sm text-slate-500">No hay leads vencidos por seguimiento.</p>
            ) : (
              data?.staleLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0D2B52]">
              <CalendarDays className="h-5 w-5 text-[#B48A5A]" />
              Clientes próximos a viajar
            </h2>
            {(data?.upcomingTrips || []).length === 0 ? (
              <p className="text-sm text-slate-500">Sin viajes próximos asociados a leads.</p>
            ) : (
              data?.upcomingTrips.map((lead) => <LeadRow key={lead.id} lead={lead} />)
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0D2B52]">
              <UserRoundCheck className="h-5 w-5 text-[#B48A5A]" />
              Carga por asesor
            </h2>
            {(data?.workload || []).length === 0 ? (
              <p className="text-sm text-slate-500">Vista disponible para administradores.</p>
            ) : (
              data?.workload.map((item) => (
                <div key={item.advisor.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-semibold text-[#0D2B52]">{item.advisor.name}</p>
                  <p className="text-xs text-slate-500">{item.advisor.email}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <span>Leads {item.activeLeads}</span>
                    <span>Pend. {item.pendingTasks}</span>
                    <span>Venc. {item.overdueTasks}</span>
                    <span>Urg. {item.urgentLeads}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/crm/leads/${lead.id}`} className="font-semibold text-[#0D2B52] underline-offset-2 hover:underline">
          {lead.fullName || `Lead #${lead.id}`}
        </Link>
        <div className="flex gap-2">
          <Badge variant="outline">{statusLabels[lead.status]}</Badge>
          <Badge variant="outline">{priorityLabels[lead.priority]}</Badge>
          <Badge variant="outline">{healthLabels[lead.healthStatus || "GREEN"] || lead.healthStatus}</Badge>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Score {lead.priorityScore ?? 0} · SLA {lead.slaStatus || "AL_DIA"} · Viaje {formatDate(lead.travelStartDate)}
      </p>
    </div>
  );
}
