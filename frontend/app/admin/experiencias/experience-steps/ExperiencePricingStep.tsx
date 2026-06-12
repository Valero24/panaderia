"use client";

import { Card, CardContent } from "@/components/ui/card";
import FaqEditor from "@/components/admin/FaqEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SeoChecklist from "@/components/admin/SeoChecklist";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
} from "../experience-form-model";

type ExperiencePricingStepProps = {
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  canManage: boolean;
  hasInternalLinks?: boolean;
};

const seoCategorySuggestions = [
  "ROMANTIC",
  "YACHT",
  "ISLANDS",
  "HELICOPTER",
  "GASTRONOMY",
  "VIP",
  "NIGHTLIFE",
  "CULTURAL",
];

export default function ExperiencePricingStep({
  form,
  updateForm,
  canManage,
  hasInternalLinks = false,
}: ExperiencePricingStepProps) {
  const primaryImage =
    form.mainImage ||
    form.images.find((image) => image.active !== false && image.isPrimary)
      ?.url ||
    form.images.find((image) => image.active !== false)?.url ||
    "";

  return (
    <div className="space-y-8">
      <Card className="rounded-[28px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-6 p-6 lg:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
              Tarifa y reglas
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0F2A44]">
              Precio y condiciones comerciales
            </h2>
          </div>

          <Input type="number" min={0} placeholder="Precio base" value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)} disabled={!canManage} />
          <Textarea placeholder="Políticas generales de la experiencia" value={form.policies} onChange={(event) => updateForm("policies", event.target.value)} disabled={!canManage} />
          <Textarea placeholder="Recomendaciones visibles para el viajero" value={form.recommendations} onChange={(event) => updateForm("recommendations", event.target.value)} disabled={!canManage} />
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-6 p-6 lg:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
              Contenido recomendado
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0F2A44]">
              SEO de la experiencia
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              El contenido base se edita en español. Las traducciones EN, FR,
              PT e IT se completan en el paso de traducciones y son opcionales.
            </p>
          </div>

          <SeoChecklist
            slug={form.slug}
            seoTitle={form.seoTitle}
            seoDescription={form.seoDescription}
            shortDescription={form.shortDescription}
            seoContent={form.seoContent}
            faq={form.faq}
            image={primaryImage}
            translations={form.translations}
            minimumWords={500}
            hasInternalLinks={hasInternalLinks}
            internalLinksLabel="Tiene destinos relacionados"
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Input placeholder="Título SEO" value={form.seoTitle} onChange={(event) => updateForm("seoTitle", event.target.value)} disabled={!canManage} />
            <div className="space-y-2">
              <Input
                list="experience-seo-categories"
                placeholder="Categoría SEO de experiencia"
                value={form.experienceCategory}
                onChange={(event) =>
                  updateForm("experienceCategory", event.target.value)
                }
                disabled={!canManage}
              />
              <datalist id="experience-seo-categories">
                {seoCategorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-xs leading-5 text-slate-500">
                Valores sugeridos: ROMANTIC, YACHT, ISLANDS, HELICOPTER,
                GASTRONOMY, VIP, NIGHTLIFE, CULTURAL.
              </p>
            </div>
          </div>

          <Textarea placeholder="Meta descripción" value={form.seoDescription} onChange={(event) => updateForm("seoDescription", event.target.value)} disabled={!canManage} />
          <Textarea placeholder="Contenido SEO extendido: contexto turístico, valor diferencial y tipo de viajero ideal" value={form.seoContent} onChange={(event) => updateForm("seoContent", event.target.value)} disabled={!canManage} />
          <Textarea placeholder="Itinerario o qué vivirá el viajero, una línea por momento si aplica" value={form.itinerary} onChange={(event) => updateForm("itinerary", event.target.value)} disabled={!canManage} />

          <div className="grid gap-5 md:grid-cols-2">
            <Textarea placeholder="Incluye" value={form.included} onChange={(event) => updateForm("included", event.target.value)} disabled={!canManage} />
            <Textarea placeholder="No incluye" value={form.notIncluded} onChange={(event) => updateForm("notIncluded", event.target.value)} disabled={!canManage} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Textarea placeholder="Punto de encuentro" value={form.meetingPoint} onChange={(event) => updateForm("meetingPoint", event.target.value)} disabled={!canManage} />
            <Textarea placeholder="Duración y horarios" value={form.durationDescription} onChange={(event) => updateForm("durationDescription", event.target.value)} disabled={!canManage} />
          </div>

          <Textarea placeholder="Horario disponible o ventanas sugeridas" value={form.schedule} onChange={(event) => updateForm("schedule", event.target.value)} disabled={!canManage} />
          <Textarea placeholder="Condiciones: clima, edad mínima, restricciones, políticas especiales..." value={form.conditions} onChange={(event) => updateForm("conditions", event.target.value)} disabled={!canManage} />
          <FaqEditor
            value={form.faq}
            onChange={(value) => updateForm("faq", value)}
            disabled={!canManage}
            title="Preguntas frecuentes de la experiencia"
          />
        </CardContent>
      </Card>
    </div>
  );
}
