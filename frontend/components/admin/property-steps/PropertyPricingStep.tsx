"use client";

import { Card, CardContent } from "@/components/ui/card";
import FaqEditor from "@/components/admin/FaqEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SeoChecklist from "@/components/admin/SeoChecklist";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyPricingStepProps = {
  form: PropertyFormState;
  updateField: PropertyFormUpdate;
  hasInternalLinks?: boolean;
};

const ruleToggles = [
  { key: "allowsPets", label: "Permite mascotas" },
  { key: "allowsSmoking", label: "Permite fumar" },
  { key: "allowsEvents", label: "Permite eventos" },
  { key: "allowsChildren", label: "Permite ninos" },
] as const;

export default function PropertyPricingStep({
  form,
  updateField,
  hasInternalLinks = false,
}: PropertyPricingStepProps) {
  const primaryImage =
    form.images.find((image) => image.active !== false && image.isPrimary)
      ?.url ||
    form.images.find((image) => image.active !== false)?.url ||
    "";

  return (
    <div className="space-y-8">
      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
              Motor de precios
            </p>
            <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
              Precios publicos
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
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

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
              Precios dinamicos
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input type="number" placeholder="Incremento para 2 huespedes" value={form.twoGuestsIncrease} onChange={(e) => updateField("twoGuestsIncrease", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Incremento por huesped extra" value={form.extraGuestIncrease} onChange={(e) => updateField("extraGuestIncrease", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-10 p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
              Reglas y operacion
            </p>
            <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
              Reglas del alojamiento
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {ruleToggles.map((item) => {
              const enabled = Boolean(form[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateField(item.key, !enabled)}
                  className={`flex h-20 items-center justify-between rounded-3xl border px-8 transition-all ${
                    enabled
                      ? "border-[#0F2A44] bg-[#0F2A44] text-white"
                      : "border-[#D4AF37]/20 bg-white text-[#0F2A44]"
                  }`}
                >
                  <span className="text-lg font-semibold">{item.label}</span>
                  <div className={`flex h-7 w-14 items-center rounded-full px-1 ${enabled ? "bg-[#D4AF37]" : "bg-slate-200"}`}>
                    <div className={`h-5 w-5 rounded-full bg-white transition-all ${enabled ? "translate-x-7" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input placeholder="Hora de check-in" value={form.checkInTime} onChange={(e) => updateField("checkInTime", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Hora de check-out" value={form.checkOutTime} onChange={(e) => updateField("checkOutTime", e.target.value)} className="h-14 rounded-2xl" />
          </div>

          <Textarea placeholder="Politica de cancelacion" value={form.cancellationPolicy} onChange={(e) => updateField("cancellationPolicy", e.target.value)} className="min-h-[180px] rounded-3xl" />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-8 p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
              Contenido recomendado
            </p>
            <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
              SEO del alojamiento
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Estos campos se editan en espanol como contenido base. Las
              versiones EN, FR, PT e IT se completan en el paso de
              traducciones y son opcionales.
            </p>
          </div>

          <SeoChecklist
            slug={form.slug}
            seoTitle={form.seoTitle}
            seoDescription={form.seoDescription}
            shortDescription={form.description}
            seoContent={form.seoContent}
            faq={form.faq}
            image={primaryImage}
            translations={form.translations}
            minimumWords={700}
            hasInternalLinks={hasInternalLinks}
            internalLinksLabel="Tiene destinos relacionados"
          />

          <Input placeholder="Titulo SEO" value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="h-14 rounded-2xl" />
          <Textarea placeholder="Meta descripcion" value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} className="min-h-[160px] rounded-3xl" />
          <Input placeholder="Palabras clave SEO separadas por coma" value={form.seoKeywords} onChange={(e) => updateField("seoKeywords", e.target.value)} className="h-14 rounded-2xl" />
          <Textarea placeholder="Contenido SEO extendido para la pagina publica" value={form.seoContent} onChange={(e) => updateField("seoContent", e.target.value)} className="min-h-[180px] rounded-3xl" />
          <Textarea placeholder="Descripcion de ubicacion y zona" value={form.locationDescription} onChange={(e) => updateField("locationDescription", e.target.value)} className="min-h-[160px] rounded-3xl" />
          <Textarea placeholder="Atracciones cercanas, una por linea o texto descriptivo" value={form.nearbyAttractions} onChange={(e) => updateField("nearbyAttractions", e.target.value)} className="min-h-[160px] rounded-3xl" />
          <Textarea placeholder="Recomendaciones: temporada alta, tipo de viaje ideal, consejos antes de reservar..." value={form.guestRecommendations} onChange={(e) => updateField("guestRecommendations", e.target.value)} className="min-h-[160px] rounded-3xl" />
          <FaqEditor
            value={form.faq}
            onChange={(value) => updateField("faq", value)}
            title="Preguntas frecuentes del alojamiento"
          />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-8 p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
              Operacion interna
            </p>
            <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
              Notas administrativas
            </h2>
          </div>

          <Textarea placeholder="Notas internas, instrucciones para el asesor, detalles VIP..." value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} className="min-h-[300px] rounded-3xl" />

          <div className="grid gap-6 md:grid-cols-2">
            <Input placeholder="Latitud" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Longitud" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
