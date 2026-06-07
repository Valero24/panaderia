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
        { key: "title", label: "Título", baseValue: form.title },
        {
          key: "shortDescription",
          label: "Descripción corta",
          type: "textarea",
          baseValue: form.shortDescription,
        },
        {
          key: "description",
          label: "Descripción completa",
          type: "textarea",
          baseValue: form.description,
        },
        { key: "location", label: "Ubicación", baseValue: form.location },
        { key: "duration", label: "Duración", baseValue: form.duration },
        { key: "category", label: "Categoría", baseValue: form.category },
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
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
    />
  );
}
