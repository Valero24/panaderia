"use client";

import dynamic from "next/dynamic";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProductDestinationSelector from "@/components/admin/ProductDestinationSelector";
import ProductWizardProgress from "@/components/admin/ProductWizardProgress";
import type { ProductWizardStep } from "@/components/admin/ProductWizardProgress";
import type {
  ExtraForm,
  ExtraService,
  PackageComponent,
  PackageForm,
  PackageFormUpdate,
  PackageWizardStep,
} from "./package-form-model";
import PackageBasicInfoStep from "./package-steps/PackageBasicInfoStep";
import PackagePricingStep from "./package-steps/PackagePricingStep";

const sectionLoading = () => (
  <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 text-sm font-medium text-slate-500 shadow-sm">
    Cargando sección...
  </div>
);

const PackageMediaStep = dynamic(
  () => import("./package-steps/PackageMediaStep"),
  { ssr: false, loading: sectionLoading }
);
const PackageFeaturesStep = dynamic(
  () => import("./package-steps/PackageFeaturesStep"),
  { ssr: false, loading: sectionLoading }
);
const PackageTranslationsStep = dynamic(
  () => import("./package-steps/PackageTranslationsStep"),
  { ssr: false, loading: sectionLoading }
);
const PackagePremiumServicesStep = dynamic(
  () => import("./package-steps/PackagePremiumServicesStep"),
  { ssr: false, loading: sectionLoading }
);
const PackageComponentsStep = dynamic(
  () => import("./package-steps/PackageComponentsStep"),
  { ssr: false, loading: sectionLoading }
);
const PackageReviewStep = dynamic(
  () => import("./package-steps/PackageReviewStep"),
  { ssr: false, loading: sectionLoading }
);

type PackageWizardProps = {
  editingId: number | null;
  canManage: boolean;
  form: PackageForm;
  updateForm: PackageFormUpdate;
  wizardSteps: ProductWizardStep<PackageWizardStep>[];
  activeStep: PackageWizardStep;
  onStepChange: (step: PackageWizardStep) => void;
  wizardError: string;
  featureIds: number[];
  setFeatureIds: (featureIds: number[]) => void;
  destinationIds: number[];
  setDestinationIds: (destinationIds: number[]) => void;
  addComponent: () => void;
  updateComponent: (index: number, patch: Partial<PackageComponent>) => void;
  removeComponent: (index: number) => void;
  moveComponent: (index: number, step: number) => void;
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

export default function PackageWizard({
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
  destinationIds,
  setDestinationIds,
  addComponent,
  updateComponent,
  removeComponent,
  moveComponent,
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
}: PackageWizardProps) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-2xl font-semibold text-[#0D2B52]">
            {editingId ? "Editar paquete" : canManage ? "Nuevo paquete" : "Consulta de paquetes"}
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

        {activeStep === "basic" && <PackageBasicInfoStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "media" && <PackageMediaStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "translations" && <PackageTranslationsStep form={form} updateForm={updateForm} canManage={canManage} />}
        {activeStep === "features" && (
          <div className="space-y-5">
            <PackageFeaturesStep editingId={editingId} featureIds={featureIds} setFeatureIds={setFeatureIds} canManage={canManage} />
            <ProductDestinationSelector
              productType="PACKAGE"
              productId={editingId}
              selectedIds={destinationIds}
              onChange={setDestinationIds}
              disabled={!canManage}
            />
          </div>
        )}
        {activeStep === "pricing" && <PackagePricingStep form={form} updateForm={updateForm} canManage={canManage} hasInternalLinks={destinationIds.length > 0} />}
        {activeStep === "components" && (
          <PackageComponentsStep
            form={form}
            canManage={canManage}
            addComponent={addComponent}
            updateComponent={updateComponent}
            removeComponent={removeComponent}
            moveComponent={moveComponent}
          />
        )}
        {activeStep === "premium" && (
          <PackagePremiumServicesStep
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
        {activeStep === "review" && <PackageReviewStep form={form} />}

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
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear paquete"}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
