"use client";

import dynamic from "next/dynamic";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProductWizardProgress from "@/components/admin/ProductWizardProgress";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
  ExperienceWizardStep,
  ExtraForm,
  ExtraService,
} from "./experience-form-model";
import ExperienceBasicInfoStep from "./experience-steps/ExperienceBasicInfoStep";
import ExperiencePricingStep from "./experience-steps/ExperiencePricingStep";
import type { ProductWizardStep } from "@/components/admin/ProductWizardProgress";

const sectionLoading = () => (
  <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 text-sm font-medium text-slate-500 shadow-sm">
    Cargando sección...
  </div>
);

const ExperienceMediaStep = dynamic(
  () => import("./experience-steps/ExperienceMediaStep"),
  { ssr: false, loading: sectionLoading }
);
const ExperienceFeaturesStep = dynamic(
  () => import("./experience-steps/ExperienceFeaturesStep"),
  { ssr: false, loading: sectionLoading }
);
const ExperienceTranslationsStep = dynamic(
  () => import("./experience-steps/ExperienceTranslationsStep"),
  { ssr: false, loading: sectionLoading }
);
const ExperiencePremiumServicesStep = dynamic(
  () => import("./experience-steps/ExperiencePremiumServicesStep"),
  { ssr: false, loading: sectionLoading }
);
const ExperienceReviewStep = dynamic(
  () => import("./experience-steps/ExperienceReviewStep"),
  { ssr: false, loading: sectionLoading }
);

type ExperienceWizardProps = {
  editingId: number | null;
  canManage: boolean;
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  wizardSteps: ProductWizardStep<ExperienceWizardStep>[];
  activeStep: ExperienceWizardStep;
  onStepChange: (step: ExperienceWizardStep) => void;
  wizardError: string;
  featureIds: number[];
  setFeatureIds: (featureIds: number[]) => void;
  extras: ExtraService[];
  extraForm: ExtraForm;
  setExtraForm: React.Dispatch<React.SetStateAction<ExtraForm>>;
  extraSaving: boolean;
  saveExtra: () => void;
  toggleExtra: (extra: ExtraService) => void;
  activeStepIndex: number;
  isLastStep: boolean;
  goPrevious: () => void;
  goNext: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function ExperienceWizard({
  editingId,
  canManage,
  form,
  updateForm,
  wizardSteps,
  activeStep,
  onStepChange,
  wizardError,
  featureIds,
  setFeatureIds,
  extras,
  extraForm,
  setExtraForm,
  extraSaving,
  saveExtra,
  toggleExtra,
  activeStepIndex,
  isLastStep,
  goPrevious,
  goNext,
  onCancel,
  onSave,
  saving,
}: ExperienceWizardProps) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-2xl font-semibold text-[#0D2B52]">
            {editingId ? "Editar experiencia" : canManage ? "Nueva experiencia" : "Consulta de experiencias"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {canManage
              ? "Estos datos alimentan el catálogo público."
              : "Tu rol permite consulta, no modificacion."}
          </p>
        </div>

        <ProductWizardProgress
          steps={wizardSteps}
          activeKey={activeStep}
          onChange={onStepChange}
        />

        {wizardError && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {wizardError}
          </div>
        )}

        {activeStep === "basic" && <ExperienceBasicInfoStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "media" && <ExperienceMediaStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "translations" && <ExperienceTranslationsStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "features" && <ExperienceFeaturesStep editingId={editingId} featureIds={featureIds} setFeatureIds={setFeatureIds} canManage={canManage} />}
        {activeStep === "pricing" && <ExperiencePricingStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "premium" && (
          <ExperiencePremiumServicesStep
            editingId={editingId}
            canManage={canManage}
            extras={extras}
            extraForm={extraForm}
            setExtraForm={setExtraForm}
            extraSaving={extraSaving}
            saveExtra={saveExtra}
            toggleExtra={toggleExtra}
          />
        )}
        {activeStep === "review" && <ExperienceReviewStep form={form} />}

        <div className="flex flex-col gap-3 border-t border-[#D4AF37]/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={goPrevious} disabled={activeStepIndex <= 0} className="rounded-xl">
            Anterior
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
              Cancelar
            </Button>
            {!isLastStep ? (
              <Button type="button" onClick={goNext} className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                Siguiente
              </Button>
            ) : canManage ? (
              <Button type="button" onClick={onSave} disabled={saving} className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear experiencia"}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
