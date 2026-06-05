"use client";

import TranslationEditor from "@/components/admin/TranslationEditor";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyTranslationsStepProps = {
  form: PropertyFormState;
  updateForm: PropertyFormUpdate;
  canManage: boolean;
};

export default function PropertyTranslationsStep({
  form,
  updateForm,
  canManage,
}: PropertyTranslationsStepProps) {
  return (
    <TranslationEditor
      fields={[
        { key: "title", label: "Nombre", baseValue: form.title },
        { key: "city", label: "Ciudad", baseValue: form.city },
        { key: "area", label: "Zona", baseValue: form.area },
        { key: "address", label: "Direccion", baseValue: form.address },
        {
          key: "description",
          label: "Descripcion",
          type: "textarea",
          baseValue: form.description,
        },
        {
          key: "cancellationPolicy",
          label: "Politica de cancelacion",
          type: "textarea",
          baseValue: form.cancellationPolicy,
        },
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
    />
  );
}
