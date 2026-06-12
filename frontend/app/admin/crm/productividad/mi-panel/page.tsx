"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { crmFetch } from "../../crm-shared";

type MyPanel = Record<string, number | null>;

const labels: Record<string, string> = {
  leadsAssigned: "Leads asignados",
  leadsNew: "Leads nuevos",
  leadsContacted: "Contactados",
  leadsQualified: "Calificados",
  proposalsSent: "Propuestas enviadas",
  leadsConverted: "Convertidos a reserva",
  leadsLost: "Perdidos",
  tasksPending: "Tareas pendientes",
  tasksCompleted: "Tareas completadas",
  tasksOverdue: "Tareas vencidas",
  conversionRate: "Tasa de conversión",
  averageFirstContactHours: "Horas promedio primer contacto",
};

export default function MyProductivityPanelPage() {
  const [data, setData] = useState<MyPanel | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    crmFetch<MyPanel>("/crm/productivity/my-panel")
      .then(setData)
      .catch((error) => setMessage(error.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Mi panel comercial</h1>
        <p className="mt-2 text-sm text-slate-500">
          Métricas personales de atención, tareas y conversión.
        </p>
      </div>
      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Object.entries(labels).map(([key, label]) => (
          <Card key={key} className="rounded-2xl border border-[#D4AF37]/20 bg-white">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-[#0D2B52]">
                {key === "conversionRate" ? `${data?.[key] ?? 0}%` : data?.[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
