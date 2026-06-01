"use client";

import { Input } from "@/components/ui/input";
import MediaGalleryEditor from "@/components/admin/MediaGalleryEditor";
import type { PackageForm, PackageFormUpdate } from "../package-form-model";

type PackageMediaStepProps = {
  form: PackageForm;
  updateForm: PackageFormUpdate;
  canManage: boolean;
};

export default function PackageMediaStep({
  form,
  updateForm,
  canManage,
}: PackageMediaStepProps) {
  return (
    <div className="space-y-4">
      <Input placeholder="Imagen principal URL" value={form.mainImage} onChange={(e) => updateForm("mainImage", e.target.value)} disabled={!canManage} />
      <MediaGalleryEditor
        value={form.images}
        onChange={(images) => updateForm("images", images)}
        disabled={!canManage}
      />
    </div>
  );
}
