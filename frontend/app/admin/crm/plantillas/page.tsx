"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CrmMessageTemplate, crmFetch } from "../crm-shared";

export default function CrmTemplatesPage() {
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>([]);
  const [form, setForm] = useState({
    name: "",
    channel: "WHATSAPP",
    content: "Hola {nombre}, soy {asesor} de Cartagena Tailored Travel. Te escribo para ayudarte con tu solicitud sobre {producto}.",
  });
  const [message, setMessage] = useState("");

  async function load() {
    setTemplates(await crmFetch<CrmMessageTemplate[]>("/crm/templates"));
  }

  useEffect(() => {
    load();
  }, []);

  async function createTemplate(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await crmFetch("/crm/templates", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ ...form, name: "" });
      await load();
    } catch (error: any) {
      setMessage(error.message || "No se pudo crear la plantilla.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Plantillas de seguimiento</h1>
        <p className="mt-2 text-sm text-slate-500">
          Variables disponibles: {"{nombre}"}, {"{producto}"}, {"{fecha_inicio}"}, {"{asesor}"}.
        </p>
      </div>
      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent>
          <form className="grid gap-3 p-5 md:grid-cols-3" onSubmit={createTemplate}>
            <Input placeholder="Nombre de plantilla" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="NOTE">Nota</option>
            </select>
            <Button className="bg-[#0D2B52]" type="submit">Crear plantilla</Button>
            <Textarea className="md:col-span-3" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="rounded-2xl border border-[#D4AF37]/20 bg-white">
            <CardContent className="space-y-3 p-5">
              <p className="font-semibold text-[#0D2B52]">{template.name}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{template.channel}</p>
              <p className="text-sm text-slate-600">{template.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
