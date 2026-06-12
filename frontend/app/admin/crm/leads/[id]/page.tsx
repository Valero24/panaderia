"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, MessageCircle, Phone, Plus, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Lead,
  LeadActivityType,
  LeadStatus,
  CrmMessageTemplate,
  crmFetch,
  formatDate,
  healthLabels,
  priorityLabels,
  productTypeLabels,
  sourceLabels,
  statusLabels,
} from "../../crm-shared";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [message, setMessage] = useState("");
  const [activity, setActivity] = useState({ type: "NOTE" as LeadActivityType, title: "", description: "" });
  const [task, setTask] = useState({ title: "", description: "", dueAt: "" });
  const [bookingId, setBookingId] = useState("");
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const productLabel = useMemo(() => {
    if (!lead?.interestedProductType) return "Sin producto relacionado";
    return `${productTypeLabels[lead.interestedProductType]} #${lead.interestedProductId || ""}`;
  }, [lead]);

  async function load() {
    if (!params?.id) return;
    try {
      setLead(await crmFetch<Lead>(`/crm/leads/${params.id}`));
    } catch (error: any) {
      setMessage(error.message || "No se pudo cargar el lead.");
    }
  }

  useEffect(() => {
    load();
    crmFetch<CrmMessageTemplate[]>("/crm/templates").then(setTemplates).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function addActivity(type?: LeadActivityType, title?: string) {
    if (!lead) return;
    const payload = {
      type: type || activity.type,
      title: title || activity.title || "Actividad",
      description: activity.description || undefined,
    };
    await crmFetch(`/crm/leads/${lead.id}/activities`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setActivity({ type: "NOTE", title: "", description: "" });
    await load();
  }

  async function addTask() {
    if (!lead || !task.title.trim()) return;
    await crmFetch(`/crm/leads/${lead.id}/tasks`, {
      method: "POST",
      body: JSON.stringify({ ...task, dueAt: task.dueAt || undefined }),
    });
    setTask({ title: "", description: "", dueAt: "" });
    await load();
  }

  async function completeTask(id: number) {
    await crmFetch(`/crm/tasks/${id}/complete`, { method: "PATCH" });
    await load();
  }

  async function changeStatus(status: LeadStatus) {
    if (!lead) return;
    const lostReason = status === "LOST" ? window.prompt("Motivo de pérdida") || "" : undefined;
    if (status === "LOST" && !lostReason) return;
    await crmFetch(`/crm/leads/${lead.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, lostReason }),
    });
    await load();
  }

  async function convertToBooking() {
    if (!lead || !bookingId.trim()) return;
    await crmFetch(`/crm/leads/${lead.id}/convert`, {
      method: "PATCH",
      body: JSON.stringify({ bookingId: Number(bookingId) }),
    });
    await load();
  }

  async function openWhatsapp() {
    if (!lead?.phone) return;
    let textBody = `Hola ${lead.fullName || ""}, soy asesor de Cartagena Tailored Travel. Te escribo para ayudarte con tu solicitud sobre ${productLabel}.`;
    if (selectedTemplateId) {
      const used = await crmFetch<{ content: string }>(`/crm/templates/${selectedTemplateId}/use`, {
        method: "POST",
        body: JSON.stringify({ leadId: lead.id }),
      });
      textBody = used.content;
    } else {
      await addActivity("WHATSAPP", "Contacto por WhatsApp");
    }
    const phone = lead.phone.replace(/\D/g, "");
    const text = encodeURIComponent(textBody);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  async function registerEmail() {
    if (!lead?.email) return;
    let body = "";
    if (selectedTemplateId) {
      const used = await crmFetch<{ content: string }>(`/crm/templates/${selectedTemplateId}/use`, {
        method: "POST",
        body: JSON.stringify({ leadId: lead.id }),
      });
      body = used.content;
    } else {
      await addActivity("EMAIL", "Correo enviado");
    }
    window.location.href = `mailto:${lead.email}?body=${encodeURIComponent(body)}`;
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500">
        {message || "Cargando lead..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            {lead.fullName || "Lead sin nombre"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{productLabel}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/crm/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <Info label="Teléfono" value={lead.phone || "Sin teléfono"} />
          <Info label="Correo" value={lead.email || "Sin correo"} />
          <Info label="Origen" value={sourceLabels[lead.source]} />
          <Info label="Estado" value={statusLabels[lead.status]} />
          <Info label="Prioridad" value={priorityLabels[lead.priority]} />
          <Info label="Asesor" value={lead.assignedAdvisor?.name || "Sin asignar"} />
          <Info label="Viaje" value={`${formatDate(lead.travelStartDate)} - ${formatDate(lead.travelEndDate)}`} />
          <Info label="Huéspedes" value={lead.guests || "Sin dato"} />
          <Info label="Presupuesto" value={lead.budget ? `$${lead.budget}` : "Sin dato"} />
          <Info label="Score sugerido" value={lead.priorityScore ?? 0} />
          <Info label="Salud del lead" value={healthLabels[lead.healthStatus || "GREEN"] || lead.healthStatus} />
          <Info label="SLA comercial" value={lead.slaStatus || "AL_DIA"} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            <option value="">Usar mensaje manual sin plantilla</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.channel}
              </option>
            ))}
          </select>
          <Link href="/admin/crm/plantillas" className="rounded-md border border-slate-200 px-4 py-2 text-sm text-[#0D2B52]">
            Gestionar plantillas
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => addActivity("CALL", "Llamada registrada")}>
          <Phone className="mr-2 h-4 w-4" />
          Registrar llamada
        </Button>
        <Button variant="outline" onClick={openWhatsapp} disabled={!lead.phone}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Contactar por WhatsApp
        </Button>
        <Button variant="outline" onClick={registerEmail} disabled={!lead.email}>
          <Mail className="mr-2 h-4 w-4" />
          Registrar correo enviado
        </Button>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={lead.status}
          onChange={(event) => changeStatus(event.target.value as LeadStatus)}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Nueva actividad</h2>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={activity.type}
              onChange={(e) => setActivity({ ...activity, type: e.target.value as LeadActivityType })}
            >
              {["NOTE", "FOLLOW_UP", "PROPOSAL", "CALL", "WHATSAPP", "EMAIL"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <Input placeholder="Título" value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} />
            <Textarea placeholder="Detalle" value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} />
            <Button className="bg-[#0D2B52]" onClick={() => addActivity()}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar actividad
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Nueva tarea</h2>
            <Input placeholder="Título" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
            <Input type="datetime-local" value={task.dueAt} onChange={(e) => setTask({ ...task, dueAt: e.target.value })} />
            <Textarea placeholder="Descripción" value={task.description} onChange={(e) => setTask({ ...task, description: e.target.value })} />
            <Button className="bg-[#0D2B52]" onClick={addTask}>
              <Save className="mr-2 h-4 w-4" />
              Crear tarea
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Línea de tiempo</h2>
            {(lead.activities || []).length === 0 ? (
              <p className="text-sm text-slate-500">Sin actividades registradas.</p>
            ) : (
              lead.activities?.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Badge variant="outline">{item.type}</Badge>
                  <p className="mt-2 font-semibold text-[#0D2B52]">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.description || "Sin detalle"}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-xl font-semibold text-[#0D2B52]">Tareas pendientes</h2>
            {(lead.tasks || []).length === 0 ? (
              <p className="text-sm text-slate-500">Sin tareas registradas.</p>
            ) : (
              lead.tasks?.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#0D2B52]">{item.title}</p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.description || "Sin detalle"}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(item.dueAt)}</p>
                  {item.status !== "COMPLETED" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => completeTask(item.id)}>
                      Completar
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-4 p-5">
          <h2 className="text-xl font-semibold text-[#0D2B52]">Conversión a reserva</h2>
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="ID de reserva existente" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
            <Button className="bg-[#0D2B52]" onClick={convertToBooking}>
              Asociar reserva
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#0D2B52]">{value}</div>
    </div>
  );
}
