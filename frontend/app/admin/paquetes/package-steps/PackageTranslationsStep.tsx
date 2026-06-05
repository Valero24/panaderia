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
        { key: "title", label: "Titulo", baseValue: form.title },
        {
          key: "shortDescription",
          label: "Descripcion corta",
          type: "textarea",
          baseValue: form.shortDescription,
        },
        {
          key: "description",
          label: "Sobre el paquete",
          type: "textarea",
          baseValue: form.description,
        },
        { key: "duration", label: "Duracion", baseValue: form.duration },
        { key: "location", label: "Ubicacion", baseValue: form.location },
        { key: "category", label: "Categoria", baseValue: form.category },
        {
          key: "includes",
          label: "Que incluye",
          type: "textarea",
          baseValue: form.includes,
        },
        {
          key: "notIncludes",
          label: "Que no incluye",
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
          label: "Politicas",
          type: "textarea",
          baseValue: form.policies,
        },
        {
          key: "recommendations",
          label: "Recomendaciones",
          type: "textarea",
          baseValue: form.recommendations,
        },
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
    />
  );
}
