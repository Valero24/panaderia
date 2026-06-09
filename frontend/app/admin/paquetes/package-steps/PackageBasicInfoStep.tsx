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
          <label className="text-sm font-medium text-[#0D2B52]">Titulo</label>
          <Input
            placeholder="Cartagena premium 3 dias"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0D2B52]">Slug SEO</label>
          <Input
            placeholder="cartagena-premium-3-dias"
            value={form.slug}
            onChange={(event) => updateForm("slug", event.target.value)}
            disabled={!canManage}
          />
          <p className="text-xs text-slate-500">
            Se autogenera desde el titulo. El slug sera usado en la URL publica.
          </p>
        </div>
      </div>
      <Textarea
        placeholder="Descripcion corta"
        value={form.shortDescription}
        onChange={(event) => updateForm("shortDescription", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="Descripcion completa"
        value={form.description}
        onChange={(event) => updateForm("description", event.target.value)}
        disabled={!canManage}
        className="min-h-28"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Duracion"
          value={form.duration}
          onChange={(event) => updateForm("duration", event.target.value)}
          disabled={!canManage}
        />
        <Input
          placeholder="Ubicacion"
          value={form.location}
          onChange={(event) => updateForm("location", event.target.value)}
          disabled={!canManage}
        />
        <Input
          type="number"
          min={1}
          placeholder="Capacidad"
          value={form.maxGuests}
          onChange={(event) => updateForm("maxGuests", event.target.value)}
          disabled={!canManage}
        />
        <Input
          placeholder="Categoria"
          value={form.category}
          onChange={(event) => updateForm("category", event.target.value)}
          disabled={!canManage}
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => updateForm("active", event.target.checked)}
          disabled={!canManage}
        />
        Publicar paquete activo
      </label>
    </div>
  );
}
