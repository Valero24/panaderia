"use client";

import TranslationEditor from "@/components/admin/TranslationEditor";
import type { PackageForm, PackageFormUpdate } from "../package-form-model";

type PackageTranslationsStepProps = {
  form: PackageForm;
  updateForm: PackageFormUpdate;
  canManage: boolean;
};

export default function PackageTranslationsStep({
  form,
  updateForm,
  canManage,
}: PackageTranslationsStepProps) {
  return (
    <TranslationEditor
      fields={[
        { key: "title", label: "Título", baseValue: form.title },
        {
          key: "shortDescription",
          label: "Descripción corta",
          type: "textarea",
          baseValue: form.shortDescription,
        },
        {
          key: "description",
          label: "Sobre el paquete",
          type: "textarea",
          baseValue: form.description,
        },
        { key: "duration", label: "Duración", baseValue: form.duration },
        { key: "location", label: "Ubicación", baseValue: form.location },
        { key: "category", label: "Categoría", baseValue: form.category },
        {
          key: "includes",
          label: "Qué incluye",
          type: "textarea",
          baseValue: form.includes,
        },
        {
          key: "notIncludes",
          label: "Qué no incluye",
          type: "textarea",
          baseValue: form.notIncludes,
        },
        {
          key: "itinerary",
          label: "Itinerario",
          type: "textarea",
          baseValue: form.itinerary,
        },
        {
          key: "policies",
          label: "Políticas",
          type: "textarea",
          baseValue: form.policies,
        },
        {
          key: "recommendations",
          label: "Recomendaciones",
          type: "textarea",
          baseValue: form.recommendations,
        },
        {
          key: "seoTitle",
          label: "Título SEO",
          baseValue: form.seoTitle,
        },
        {
          key: "seoDescription",
          label: "Meta descripción",
          type: "textarea",
          baseValue: form.seoDescription,
        },
        {
          key: "seoContent",
          label: "Contenido SEO extendido",
          type: "textarea",
          baseValue: form.seoContent,
        },
        {
          key: "faq",
          label: "Preguntas frecuentes",
          type: "textarea",
          baseValue: form.faq,
        },
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
      automation={{
        entityType: "PACKAGE",
        entityId: form.id,
        status: form.translationStatus,
        error: form.translationError,
      }}
    />
  );
}
