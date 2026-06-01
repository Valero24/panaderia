"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PackageForm, PackageFormUpdate } from "../package-form-model";

type PackagePricingStepProps = {
  form: PackageForm;
  updateForm: PackageFormUpdate;
  canManage: boolean;
};

export default function PackagePricingStep({
  form,
  updateForm,
  canManage,
}: PackagePricingStepProps) {
  return (
    <div className="space-y-4">
      <Input type="number" min={0} placeholder="Precio base" value={form.basePrice} onChange={(e) => updateForm("basePrice", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Incluye" value={form.includes} onChange={(e) => updateForm("includes", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="No incluye" value={form.notIncludes} onChange={(e) => updateForm("notIncludes", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Itinerario" value={form.itinerary} onChange={(e) => updateForm("itinerary", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Politicas" value={form.policies} onChange={(e) => updateForm("policies", e.target.value)} disabled={!canManage} />
      <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={(e) => updateForm("recommendations", e.target.value)} disabled={!canManage} />
    </div>
  );
}
