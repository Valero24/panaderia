"use client";

import ProductFeatureSelector from "@/components/admin/ProductFeatureSelector";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyFeaturesStepProps = {
  form: PropertyFormState;
  updateField: PropertyFormUpdate;
  propertyId?: string | number;
  loading: boolean;
};

export default function PropertyFeaturesStep({
  form,
  updateField,
  propertyId,
  loading,
}: PropertyFeaturesStepProps) {
  return (
    <ProductFeatureSelector
      productType="PROPERTY"
      productId={propertyId || null}
      selectedFeatureIds={form.featureIds}
      onChange={(featureIds) => updateField("featureIds", featureIds)}
      disabled={loading}
    />
  );
}
