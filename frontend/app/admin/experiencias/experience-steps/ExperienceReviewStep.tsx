"use client";

import type { ExperienceForm } from "../experience-form-model";
import { money } from "../experience-form-model";

type ExperienceReviewStepProps = {
  form: ExperienceForm;
};

export default function ExperienceReviewStep({ form }: ExperienceReviewStepProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4">
      <h3 className="text-xl font-semibold text-[#0D2B52]">
        Revision final
      </h3>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p><strong>Experiencia:</strong> {form.title || "Sin titulo"}</p>
        <p><strong>Ubicacion:</strong> {form.location || "Sin ubicacion"}</p>
        <p><strong>Duracion:</strong> {form.duration || "Sin duracion"}</p>
        <p><strong>Precio:</strong> {money(Number(form.basePrice || 0))}</p>
        <p><strong>Capacidad:</strong> {form.maxGuests || "1"} personas</p>
        <p><strong>Estado:</strong> {form.active ? "Activa" : "Inactiva"}</p>
      </div>
    </div>
  );
}
