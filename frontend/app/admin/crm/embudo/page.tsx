"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lead,
  LeadStatus,
  crmFetch,
  formatDate,
  priorityLabels,
  productTypeLabels,
  statusLabels,
} from "../crm-shared";

const funnelStatuses: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "RESERVED",
  "LOST",
];

export default function CrmFunnelPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await crmFetch<{ items: Lead[] }>("/crm/leads?limit=200");
      setLeads(data.items);
    } catch (error: any) {
      setMessage(error.message || "No se pudo cargar el embudo.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    return Object.fromEntries(
      funnelStatuses.map((status) => [
        status,
        leads.filter((lead) => lead.status === status),
      ])
    ) as Record<LeadStatus, Lead[]>;
  }, [leads]);

  async function moveLead(lead: Lead, status: LeadStatus) {
    const lostReason =
      status === "LOST" ? window.prompt("Motivo de pérdida") || "" : undefined;
    if (status === "LOST" && !lostReason) return;
    await crmFetch(`/crm/leads/${lead.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, lostReason }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Embudo comercial</h1>
        <p className="mt-2 text-sm text-slate-500">
          Oportunidades por etapa comercial. El cambio de etapa se realiza desde cada tarjeta.
        </p>
      </div>

      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-7">
        {funnelStatuses.map((status) => (
          <Card key={status} className="rounded-2xl border border-[#D4AF37]/20 bg-white">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#0D2B52]">
                  {statusLabels[status]}
                </h2>
                <Badge variant="outline">{grouped[status]?.length || 0}</Badge>
              </div>
              {(grouped[status] || []).map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <Link href={`/admin/crm/leads/${lead.id}`} className="font-semibold text-[#0D2B52] underline-offset-2 hover:underline">
                    {lead.fullName || `Lead #${lead.id}`}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.interestedProductType
                      ? `${productTypeLabels[lead.interestedProductType]} #${lead.interestedProductId || ""}`
                      : "Sin producto"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.assignedAdvisor?.name || "Sin asesor"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge variant="outline">{priorityLabels[lead.priority]}</Badge>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(lead.nextFollowUpAt)}
                    </span>
                  </div>
                  <select
                    className="mt-3 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={lead.status}
                    onChange={(event) => moveLead(lead, event.target.value as LeadStatus)}
                  >
                    {funnelStatuses.map((option) => (
                      <option key={option} value={option}>
                        {statusLabels[option]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
