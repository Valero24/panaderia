"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LeadActivity, crmFetch, formatDate } from "../crm-shared";

export default function CrmActivityPage() {
  const [items, setItems] = useState<(LeadActivity & { lead?: any })[]>([]);
  const [type, setType] = useState("");

  async function load() {
    const query = type ? `?type=${type}` : "";
    setItems(await crmFetch(`/crm/activity${query}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Actividad reciente</h1>
      </div>
      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="flex flex-wrap gap-3 p-5">
          <Input placeholder="Tipo: WHATSAPP, EMAIL, NOTE..." value={type} onChange={(e) => setType(e.target.value)} />
          <Button className="bg-[#0D2B52]" onClick={load}>Filtrar</Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-3 p-5">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Sin actividad registrada.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline">{item.type}</Badge>
                    <p className="mt-2 font-semibold text-[#0D2B52]">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.description || "Sin detalle"}</p>
                {item.lead && (
                  <Link href={`/admin/crm/leads/${item.lead.id}`} className="mt-2 inline-block text-sm text-[#0D2B52] underline">
                    Ver lead: {item.lead.fullName || `#${item.lead.id}`}
                  </Link>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
