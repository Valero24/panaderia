"use client";

import TranslationEditor from "@/components/admin/TranslationEditor";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
} from "../experience-form-model";

type ExperienceTranslationsStepProps = {
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  canManage: boolean;
};

export default function ExperienceTranslationsStep({
  form,
  updateForm,
  canManage,
}: ExperienceTranslationsStepProps) {
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
          label: "Descripcion completa",
          type: "textarea",
          baseValue: form.description,
        },
        { key: "location", label: "Ubicacion", baseValue: form.location },
        { key: "duration", label: "Duracion", baseValue: form.duration },
        { key: "category", label: "Categoria", baseValue: form.category },
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
