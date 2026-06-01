"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { PropertyFormState } from "@/components/admin/property-form-model";

type PropertyReviewStepProps = {
  form: PropertyFormState;
  isEditMode: boolean;
};

export default function PropertyReviewStep({
  form,
  isEditMode,
}: PropertyReviewStepProps) {
  return (
    <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-8 p-10">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
            Revision y publicacion
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
            Confirma antes de guardar
          </h2>
          <p className="mt-3 max-w-2xl text-slate-500">
            Revisa los datos principales. El guardado final mantiene la accion
            correcta: {isEditMode ? "PATCH" : "POST"}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#F8F6F1] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#B68D40]">
              Alojamiento
            </p>
            <p className="mt-2 font-semibold text-[#0F2A44]">
              {form.title || "Sin nombre"}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F8F6F1] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#B68D40]">
              Ubicacion
            </p>
            <p className="mt-2 font-semibold text-[#0F2A44]">
              {[form.city, form.area].filter(Boolean).join(" - ") ||
                "Sin ubicacion"}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F8F6F1] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#B68D40]">
              Tarifa
            </p>
            <p className="mt-2 font-semibold text-[#0F2A44]">
              ${Number(form.pricePerNight || form.basePrice || 0).toLocaleString("es-CO")} COP
            </p>
          </div>
          <div className="rounded-2xl bg-[#F8F6F1] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#B68D40]">
              Estado
            </p>
            <p className="mt-2 font-semibold text-[#0F2A44]">
              {form.status}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
