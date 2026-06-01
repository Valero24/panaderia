"use client";

import { Input } from "@/components/ui/input";
import MediaGalleryEditor from "@/components/admin/MediaGalleryEditor";
import type {
  ExperienceForm,
  ExperienceFormUpdate,
} from "../experience-form-model";

type ExperienceMediaStepProps = {
  form: ExperienceForm;
  updateForm: ExperienceFormUpdate;
  canManage: boolean;
};

export default function ExperienceMediaStep({
  form,
  updateForm,
  canManage,
}: ExperienceMediaStepProps) {
  return (
    <div className="space-y-4">
      <Input
        placeholder="Imagen principal URL"
        value={form.mainImage}
        onChange={(event) => updateForm("mainImage", event.target.value)}
        disabled={!canManage}
      />
      <MediaGalleryEditor
        value={form.images}
        onChange={(images) => updateForm("images", images)}
        disabled={!canManage}
      />
    </div>
  );
}
