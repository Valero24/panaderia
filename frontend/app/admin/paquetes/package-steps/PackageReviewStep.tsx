"use client";

import type { PackageForm } from "../package-form-model";
import { money } from "../package-form-model";

type PackageReviewStepProps = {
  form: PackageForm;
};

export default function PackageReviewStep({ form }: PackageReviewStepProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4">
      <h3 className="text-xl font-semibold text-[#0D2B52]">
        Revisión final
      </h3>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p><strong>Paquete:</strong> {form.title || "Sin título"}</p>
        <p><strong>Ubicación:</strong> {form.location || "Sin ubicación"}</p>
        <p><strong>Duración:</strong> {form.duration || "Sin duración"}</p>
        <p><strong>Precio:</strong> {money(Number(form.basePrice || 0))}</p>
        <p><strong>Capacidad:</strong> {form.maxGuests || "1"} personas</p>
        <p><strong>Componentes:</strong> {form.components.filter((component) => component.title?.trim()).length}</p>
        <p><strong>SEO:</strong> {form.seoTitle || form.seoDescription ? "Configurado" : "Pendiente"}</p>
      </div>
    </div>
  );
}
