"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyBasicInfoStepProps = {
  form: PropertyFormState;
  generatedSlug: string;
  updateField: PropertyFormUpdate;
};

export default function PropertyBasicInfoStep({
  form,
  generatedSlug,
  updateField,
}: PropertyBasicInfoStepProps) {
  return (
    <>
      <Card className="rounded-[32px] border border-[#D4AF37]/20 shadow-sm bg-white">
        <CardContent className="p-10 space-y-10">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Resumen
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Información comercial
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Nombre del alojamiento
              </label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Villa Ocean Pearl"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Slug
              </label>
              <Input
                value={generatedSlug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="villa-ocean-pearl"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
              <p className="text-xs text-slate-500">
                Se autogenera desde el nombre. El slug sera usado en la URL publica.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Ciudad
              </label>
              <Input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Cartagena"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Zona
              </label>
              <Input
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                placeholder="Bocagrande"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Dirección
              </label>
              <Input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Dirección privada del alojamiento"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Descripción
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe la experiencia premium del alojamiento..."
                className="min-h-[180px] rounded-3xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#D4AF37]/20 px-4 bg-white"
              >
                <option value="DRAFT">Borrador</option>
                <option value="ACTIVE">Activo</option>
                <option value="FEATURED">Destacado</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-10">
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Capacidad
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Configuración de huéspedes
            </h2>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Input
              type="number"
              placeholder="Máximo de huéspedes"
              value={form.maxGuests}
              onChange={(e) => updateField("maxGuests", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Capacidad máxima"
              value={form.maxCapacity}
              onChange={(e) => updateField("maxCapacity", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Noches mínimas"
              value={form.minimumNights}
              onChange={(e) => updateField("minimumNights", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Habitaciones"
              value={form.bedrooms}
              onChange={(e) => updateField("bedrooms", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Baños"
              value={form.bathrooms}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              className="h-14 rounded-2xl"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
