"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LeadPriority,
  LeadSource,
  ProductType,
  crmFetch,
  priorityLabels,
  productTypeLabels,
  sourceLabels,
} from "../../crm-shared";

export default function NewLeadPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    preferredLanguage: "es",
    source: "MANUAL" as LeadSource,
    priority: "MEDIUM" as LeadPriority,
    interestedProductType: "" as "" | ProductType,
    interestedProductId: "",
    travelStartDate: "",
    travelEndDate: "",
    guests: "",
    budget: "",
    message: "",
    notes: "",
    nextFollowUpAt: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const created = await crmFetch<{ id: number }>("/crm/leads", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          interestedProductType: form.interestedProductType || undefined,
          interestedProductId: form.interestedProductId
            ? Number(form.interestedProductId)
            : undefined,
          guests: form.guests ? Number(form.guests) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          nextFollowUpAt: form.nextFollowUpAt || undefined,
          travelStartDate: form.travelStartDate || undefined,
          travelEndDate: form.travelEndDate || undefined,
        }),
      });
      router.push(`/admin/crm/leads/${created.id}`);
    } catch (error: any) {
      setMessage(error.message || "No se pudo crear el lead.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Nuevo lead</h1>
          <p className="mt-2 text-sm text-slate-500">
            Registra una oportunidad comercial manualmente.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/crm/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {message && (
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </p>
      )}

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <Input placeholder="Nombre completo" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          <Input placeholder="Teléfono / WhatsApp" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          <Input placeholder="Correo" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          <Input placeholder="País" value={form.country} onChange={(e) => update("country", e.target.value)} />
          <Input placeholder="Ciudad" value={form.city} onChange={(e) => update("city", e.target.value)} />
          <Input placeholder="Idioma preferido" value={form.preferredLanguage} onChange={(e) => update("preferredLanguage", e.target.value)} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.source} onChange={(e) => update("source", e.target.value)}>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.priority} onChange={(e) => update("priority", e.target.value)}>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.interestedProductType} onChange={(e) => update("interestedProductType", e.target.value)}>
            <option value="">Producto de interés</option>
            {Object.entries(productTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <Input placeholder="ID producto" value={form.interestedProductId} onChange={(e) => update("interestedProductId", e.target.value)} />
          <Input type="date" value={form.travelStartDate} onChange={(e) => update("travelStartDate", e.target.value)} />
          <Input type="date" value={form.travelEndDate} onChange={(e) => update("travelEndDate", e.target.value)} />
          <Input placeholder="Huéspedes" value={form.guests} onChange={(e) => update("guests", e.target.value)} />
          <Input placeholder="Presupuesto COP" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
          <Input type="datetime-local" value={form.nextFollowUpAt} onChange={(e) => update("nextFollowUpAt", e.target.value)} />
          <div />
          <Textarea className="md:col-span-2" placeholder="Mensaje inicial" value={form.message} onChange={(e) => update("message", e.target.value)} />
          <Textarea className="md:col-span-2" placeholder="Notas internas" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </CardContent>
      </Card>

      <Button className="rounded-xl bg-[#0D2B52]" type="submit">
        <Save className="mr-2 h-4 w-4" />
        Guardar lead
      </Button>
    </form>
  );
}
