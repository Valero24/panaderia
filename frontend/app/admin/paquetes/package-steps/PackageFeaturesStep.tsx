"use client";

import ProductFeatureSelector from "@/components/admin/ProductFeatureSelector";

type PackageFeaturesStepProps = {
  editingId: number | null;
  featureIds: number[];
  setFeatureIds: (featureIds: number[]) => void;
  canManage: boolean;
};

export default function PackageFeaturesStep({
  editingId,
  featureIds,
  setFeatureIds,
  canManage,
}: PackageFeaturesStepProps) {
  return (
    <ProductFeatureSelector
      productType="PACKAGE"
      productId={editingId}
      selectedFeatureIds={featureIds}
      onChange={setFeatureIds}
      disabled={!canManage}
    />
  );
}
