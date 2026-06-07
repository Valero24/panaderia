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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0D2B52]">Título</label>
          <Input placeholder="Cartagena premium 3 días" value={form.title} onChange={(e) => updateForm("title", e.target.value)} disabled={!canManage} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0D2B52]">Slug SEO</label>
          <Input placeholder="cartagena-premium-3-dias" value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} disabled={!canManage} />
          <p className="text-xs text-slate-500">
            Se autogenera desde el título y puedes editarlo manualmente.
          </p>
        </div>
      </div>
      <Textarea placeholder="Descripción corta" value={form.shortDescription} onChange={(e) => updateForm("shortDescription", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Descripción completa" value={form.description} onChange={(e) => updateForm("description", e.target.value)} disabled={!canManage} className="min-h-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Duración" value={form.duration} onChange={(e) => updateForm("duration", e.target.value)} disabled={!canManage} />
        <Input placeholder="Ubicación" value={form.location} onChange={(e) => updateForm("location", e.target.value)} disabled={!canManage} />
        <Input type="number" min={1} placeholder="Capacidad" value={form.maxGuests} onChange={(e) => updateForm("maxGuests", e.target.value)} disabled={!canManage} />
        <Input placeholder="Categoría" value={form.category} onChange={(e) => updateForm("category", e.target.value)} disabled={!canManage} />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
        <input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} disabled={!canManage} />
        Publicar paquete activo
      </label>
    </div>
  );
}
