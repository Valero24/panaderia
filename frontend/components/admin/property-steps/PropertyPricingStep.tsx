"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyPricingStepProps = {
  form: PropertyFormState;
  updateField: PropertyFormUpdate;
};

const ruleToggles = [
  { key: "allowsPets", label: "Permite mascotas" },
  { key: "allowsSmoking", label: "Permite fumar" },
  { key: "allowsEvents", label: "Permite eventos" },
  { key: "allowsChildren", label: "Permite niños" },
] as const;

export default function PropertyPricingStep({
  form,
  updateField,
}: PropertyPricingStepProps) {
  return (
    <div className="space-y-8">
      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Motor de precios
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Precios públicos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Input type="number" placeholder="Precio por noche" value={form.pricePerNight} onChange={(e) => updateField("pricePerNight", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Precio temporada alta" value={form.highSeasonPrice} onChange={(e) => updateField("highSeasonPrice", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Precio temporada baja" value={form.lowSeasonPrice} onChange={(e) => updateField("lowSeasonPrice", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#0F2A44]">
              Precios internos
            </h2>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Input type="number" placeholder="Tarifa base" value={form.basePrice} onChange={(e) => updateField("basePrice", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Tarifa de limpieza" value={form.cleaningFee} onChange={(e) => updateField("cleaningFee", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Tarifa de servicio" value={form.serviceFee} onChange={(e) => updateField("serviceFee", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Impuestos" value={form.taxes} onChange={(e) => updateField("taxes", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#0F2A44]">
              Precios dinámicos
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input type="number" placeholder="Incremento para 2 huéspedes" value={form.twoGuestsIncrease} onChange={(e) => updateField("twoGuestsIncrease", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Incremento por huésped extra" value={form.extraGuestIncrease} onChange={(e) => updateField("extraGuestIncrease", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-10">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Reglas y operación
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Reglas del alojamiento
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {ruleToggles.map((item) => {
              const enabled = Boolean(form[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateField(item.key, !enabled)}
                  className={`h-20 rounded-3xl border transition-all flex items-center justify-between px-8 ${
                    enabled
                      ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                      : "bg-white border-[#D4AF37]/20 text-[#0F2A44]"
                  }`}
                >
                  <span className="font-semibold text-lg">{item.label}</span>
                  <div className={`h-7 w-14 rounded-full flex items-center px-1 ${enabled ? "bg-[#D4AF37]" : "bg-slate-200"}`}>
                    <div className={`h-5 w-5 rounded-full bg-white transition-all ${enabled ? "translate-x-7" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input placeholder="Hora de check-in" value={form.checkInTime} onChange={(e) => updateField("checkInTime", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Hora de check-out" value={form.checkOutTime} onChange={(e) => updateField("checkOutTime", e.target.value)} className="h-14 rounded-2xl" />
          </div>

          <Textarea placeholder="Política de cancelación" value={form.cancellationPolicy} onChange={(e) => updateField("cancellationPolicy", e.target.value)} className="min-h-[180px] rounded-3xl" />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-8">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Optimización de búsqueda
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Configuración SEO
            </h2>
          </div>

          <Input placeholder="Título SEO" value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="h-14 rounded-2xl" />
          <Textarea placeholder="Descripción SEO" value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} className="min-h-[160px] rounded-3xl" />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-8">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Operacion interna
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Notas administrativas
            </h2>
          </div>

          <Textarea placeholder="Notas internas, instrucciones para el asesor, detalles VIP..." value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} className="min-h-[300px] rounded-3xl" />

          <div className="grid md:grid-cols-2 gap-6">
            <Input placeholder="Latitud" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Longitud" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
