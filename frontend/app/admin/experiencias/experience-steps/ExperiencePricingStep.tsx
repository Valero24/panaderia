"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
} from "../experience-form-model";

type ExperiencePricingStepProps = {
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  canManage: boolean;
};

export default function ExperiencePricingStep({
  form,
  updateForm,
  canManage,
}: ExperiencePricingStepProps) {
  return (
    <div className="space-y-4">
      <Input type="number" min={0} placeholder="Precio base" value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)} disabled={!canManage} />
      <Textarea placeholder="Politicas" value={form.policies} onChange={(event) => updateForm("policies", event.target.value)} disabled={!canManage} />
      <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={(event) => updateForm("recommendations", event.target.value)} disabled={!canManage} />
    </div>
  );
}
