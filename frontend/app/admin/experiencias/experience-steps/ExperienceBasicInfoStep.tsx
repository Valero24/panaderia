"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
} from "../experience-form-model";

type ExperienceBasicInfoStepProps = {
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  canManage: boolean;
};

export default function ExperienceBasicInfoStep({
  form,
  updateForm,
  canManage,
}: ExperienceBasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <Input placeholder="Titulo" value={form.title} onChange={(event) => updateForm("title", event.target.value)} disabled={!canManage} />
      <Input placeholder="Slug opcional" value={form.slug} onChange={(event) => updateForm("slug", event.target.value)} disabled={!canManage} />
      <Textarea placeholder="Descripcion corta" value={form.shortDescription} onChange={(event) => updateForm("shortDescription", event.target.value)} disabled={!canManage} />
      <Textarea placeholder="Descripcion completa" value={form.description} onChange={(event) => updateForm("description", event.target.value)} disabled={!canManage} className="min-h-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Ubicacion" value={form.location} onChange={(event) => updateForm("location", event.target.value)} disabled={!canManage} />
        <Input placeholder="Duracion" value={form.duration} onChange={(event) => updateForm("duration", event.target.value)} disabled={!canManage} />
        <Input type="number" min={1} placeholder="Capacidad" value={form.maxGuests} onChange={(event) => updateForm("maxGuests", event.target.value)} disabled={!canManage} />
        <Input placeholder="Categoria" value={form.category} onChange={(event) => updateForm("category", event.target.value)} disabled={!canManage} />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
        <input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} disabled={!canManage} />
        Publicar experiencia activa
      </label>
    </div>
  );
}
