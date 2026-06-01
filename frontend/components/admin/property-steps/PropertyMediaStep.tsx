"use client";

import { Card, CardContent } from "@/components/ui/card";
import MediaGalleryEditor from "@/components/admin/MediaGalleryEditor";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyMediaStepProps = {
  form: PropertyFormState;
  updateField: PropertyFormUpdate;
  loading: boolean;
};

export default function PropertyMediaStep({
  form,
  updateField,
  loading,
}: PropertyMediaStepProps) {
  return (
    <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-10 space-y-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
            Galeria multimedia
          </p>
          <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
            Fotos y videos del alojamiento
          </h2>
          <p className="mt-3 max-w-2xl text-slate-500">
            Organiza el recorrido visual que vera el cliente en la pagina publica.
          </p>
        </div>

        <MediaGalleryEditor
          value={form.images}
          onChange={(images) => updateField("images", images)}
          disabled={loading}
        />
      </CardContent>
    </Card>
  );
}
