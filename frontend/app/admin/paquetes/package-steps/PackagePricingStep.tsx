"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FaqEditor from "@/components/admin/FaqEditor";
import SeoChecklist from "@/components/admin/SeoChecklist";
import type { PackageForm, PackageFormUpdate } from "../package-form-model";

type PackagePricingStepProps = {
  form: PackageForm;
  updateForm: PackageFormUpdate;
  canManage: boolean;
};

export default function PackagePricingStep({
  form,
  updateForm,
  canManage,
}: PackagePricingStepProps) {
  const primaryImage =
    form.mainImage ||
    form.images.find((image) => image.active !== false && image.isPrimary)
      ?.url ||
    form.images.find((image) => image.active !== false)?.url ||
    "";

  return (
    <div className="space-y-4">
      <Input
        type="number"
        min={0}
        placeholder="Precio base"
        value={form.basePrice}
        onChange={(event) => updateForm("basePrice", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="Incluye"
        value={form.includes}
        onChange={(event) => updateForm("includes", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="No incluye"
        value={form.notIncludes}
        onChange={(event) => updateForm("notIncludes", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="Itinerario"
        value={form.itinerary}
        onChange={(event) => updateForm("itinerary", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="Politicas"
        value={form.policies}
        onChange={(event) => updateForm("policies", event.target.value)}
        disabled={!canManage}
      />
      <Textarea
        placeholder="Recomendaciones"
        value={form.recommendations}
        onChange={(event) => updateForm("recommendations", event.target.value)}
        disabled={!canManage}
      />

      <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#0D2B52]">
            SEO del paquete
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Estos campos ayudan a posicionar el paquete en Google.
          </p>
        </div>
        <SeoChecklist
          slug={form.slug}
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          seoContent={form.seoContent}
          faq={form.faq}
          image={primaryImage}
          translations={form.translations}
          minimumWords={700}
        />
        <div className="mt-4 space-y-3">
          <Input
            placeholder="Titulo SEO"
            value={form.seoTitle}
            onChange={(event) => updateForm("seoTitle", event.target.value)}
            disabled={!canManage}
          />
          <Textarea
            placeholder="Meta descripcion"
            value={form.seoDescription}
            onChange={(event) =>
              updateForm("seoDescription", event.target.value)
            }
            disabled={!canManage}
          />
          <Textarea
            placeholder="Contenido SEO extendido"
            value={form.seoContent}
            onChange={(event) => updateForm("seoContent", event.target.value)}
            disabled={!canManage}
            className="min-h-32"
          />
          <FaqEditor
            value={form.faq}
            onChange={(value) => updateForm("faq", value)}
            disabled={!canManage}
            title="Preguntas frecuentes del paquete"
          />
        </div>
      </div>
    </div>
  );
}
