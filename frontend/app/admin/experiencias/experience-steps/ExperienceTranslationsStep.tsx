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
      title="Traducciones de la experiencia"
      description="El espanol se edita en los campos principales. Completa EN, FR, PT e IT solo cuando tengas una version revisada; si queda vacio, el sitio usara espanol."
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
        { key: "seoTitle", label: "Titulo SEO", baseValue: form.seoTitle },
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
          key: "itinerary",
          label: "Itinerario / que vivira",
          type: "textarea",
          baseValue: form.itinerary,
        },
        {
          key: "included",
          label: "Incluye",
          type: "textarea",
          baseValue: form.included,
        },
        {
          key: "notIncluded",
          label: "No incluye",
          type: "textarea",
          baseValue: form.notIncluded,
        },
        {
          key: "meetingPoint",
          label: "Punto de encuentro",
          type: "textarea",
          baseValue: form.meetingPoint,
        },
        {
          key: "durationDescription",
          label: "Duracion y horarios",
          type: "textarea",
          baseValue: form.durationDescription,
        },
        {
          key: "schedule",
          label: "Horario",
          type: "textarea",
          baseValue: form.schedule,
        },
        {
          key: "conditions",
          label: "Condiciones",
          type: "textarea",
          baseValue: form.conditions,
        },
        {
          key: "faq",
          label: "Preguntas frecuentes JSON",
          type: "textarea",
          baseValue: form.faq,
        },
        {
          key: "experienceCategory",
          label: "Categoria SEO",
          baseValue: form.experienceCategory,
        },
      ]}
      value={form.translations}
      onChange={(value) => updateForm("translations", value)}
      disabled={!canManage}
      automation={{
        entityType: "EXPERIENCE",
        entityId: form.id,
        status: form.translationStatus,
        error: form.translationError,
      }}
    />
  );
}
