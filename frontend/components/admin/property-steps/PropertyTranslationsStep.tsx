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
      title="Traducciones del alojamiento"
      description="El espanol se edita en los campos principales. Completa EN, FR, PT e IT solo cuando tengas una version revisada; si queda vacio, el sitio usara espanol."
      fields={[
        { key: "title", label: "Nombre", baseValue: form.title },
        { key: "city", label: "Ciudad", baseValue: form.city },
        { key: "area", label: "Zona", baseValue: form.area },
        { key: "address", label: "Direccion", baseValue: form.address },
        {
          key: "description",
          label: "Descripcion comercial",
          type: "textarea",
          baseValue: form.description,
        },
        {
          key: "cancellationPolicy",
          label: "Politica de cancelacion",
          type: "textarea",
          baseValue: form.cancellationPolicy,
        },
        {
          key: "seoTitle",
          label: "Titulo SEO",
          baseValue: form.seoTitle,
        },
        {
          key: "seoDescription",
          label: "Meta descripcion",
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
          key: "locationDescription",
          label: "Descripcion de ubicacion",
          type: "textarea",
          baseValue: form.locationDescription,
        },
        {
          key: "nearbyAttractions",
          label: "Atracciones cercanas",
          type: "textarea",
          baseValue: form.nearbyAttractions,
        },
        {
          key: "guestRecommendations",
          label: "Recomendaciones",
          type: "textarea",
          baseValue: form.guestRecommendations,
        },
        {
          key: "faq",
          label: "Preguntas frecuentes JSON",
          type: "textarea",
          baseValue: form.faq,
        },
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
    />
  );
}
