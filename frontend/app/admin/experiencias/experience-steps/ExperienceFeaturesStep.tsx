"use client";

import ProductFeatureSelector from "@/components/admin/ProductFeatureSelector";

type ExperienceFeaturesStepProps = {
  editingId: number | null;
  featureIds: number[];
  setFeatureIds: (featureIds: number[]) => void;
  canManage: boolean;
};

export default function ExperienceFeaturesStep({
  editingId,
  featureIds,
  setFeatureIds,
  canManage,
}: ExperienceFeaturesStepProps) {
  return (
    <ProductFeatureSelector
      productType="EXPERIENCE"
      productId={editingId}
      selectedFeatureIds={featureIds}
      onChange={setFeatureIds}
      disabled={!canManage}
    />
  );
}
