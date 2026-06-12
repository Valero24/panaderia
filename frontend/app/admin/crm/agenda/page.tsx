"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lead, LeadTask, crmFetch, formatDate } from "../crm-shared";

type Agenda = {
  tasks: (LeadTask & { lead?: any })[];
  followUps: Lead[];
  trips: Lead[];
};

export default function CrmAgendaPage() {
  const [view, setView] = useState("week");
  const [data, setData] = useState<Agenda>({ tasks: [], followUps: [], trips: [] });

  async function load(next = view) {
    setData(await crmFetch<Agenda>(`/crm/agenda?view=${next}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Agenda comercial</h1>
        </div>
        <div className="flex gap-2">
          {[
            ["day", "Día"],
            ["week", "Semana"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={view === value ? "default" : "outline"}
              className={view === value ? "bg-[#0D2B52]" : ""}
              onClick={() => {
                setView(value);
                load(value);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <AgendaColumn title="Tareas" items={data.tasks} dateKey="dueAt" />
        <AgendaColumn title="Seguimientos" items={data.followUps} dateKey="nextFollowUpAt" />
        <AgendaColumn title="Viajes próximos" items={data.trips} dateKey="travelStartDate" />
      </div>
    </div>
  );
}

function AgendaColumn({
  title,
  items,
  dateKey,
}: {
  title: string;
  items: any[];
  dateKey: string;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-3 p-5">
        <h2 className="text-xl font-semibold text-[#0D2B52]">{title}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Sin registros.</p>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Link href={`/admin/crm/leads/${item.leadId || item.id}`} className="font-semibold text-[#0D2B52] underline">
                {item.title || item.fullName || `Lead #${item.id}`}
              </Link>
              <p className="mt-2 text-xs text-slate-500">{formatDate(item[dateKey])}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
