"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PackageForm, PackageFormUpdate } from "../package-form-model";

type PackageBasicInfoStepProps = {
  form: PackageForm;
  updateForm: PackageFormUpdate;
  canManage: boolean;
};

export default function PackageBasicInfoStep({
  form,
  updateForm,
  canManage,
}: PackageBasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <Input placeholder="Titulo" value={form.title} onChange={(e) => updateForm("title", e.target.value)} disabled={!canManage} />
      <Input placeholder="Slug opcional" value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Descripcion corta" value={form.shortDescription} onChange={(e) => updateForm("shortDescription", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Descripcion completa" value={form.description} onChange={(e) => updateForm("description", e.target.value)} disabled={!canManage} className="min-h-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Duracion" value={form.duration} onChange={(e) => updateForm("duration", e.target.value)} disabled={!canManage} />
        <Input placeholder="Ubicacion" value={form.location} onChange={(e) => updateForm("location", e.target.value)} disabled={!canManage} />
        <Input type="number" min={1} placeholder="Capacidad" value={form.maxGuests} onChange={(e) => updateForm("maxGuests", e.target.value)} disabled={!canManage} />
        <Input placeholder="Categoria" value={form.category} onChange={(e) => updateForm("category", e.target.value)} disabled={!canManage} />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
        <input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} disabled={!canManage} />
        Publicar paquete activo
      </label>
    </div>
  );
}
