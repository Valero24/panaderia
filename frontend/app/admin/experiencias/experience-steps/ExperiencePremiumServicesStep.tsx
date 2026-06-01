"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtraForm, ExtraService } from "../experience-form-model";
import { money } from "../experience-form-model";

type ExperiencePremiumServicesStepProps = {
  editingId: number | null;
  canManage: boolean;
  extras: ExtraService[];
  extraForm: ExtraForm;
  setExtraForm: React.Dispatch<React.SetStateAction<ExtraForm>>;
  extraSaving: boolean;
  saveExtra: () => void;
  toggleExtra: (extra: ExtraService) => void;
};

export default function ExperiencePremiumServicesStep({
  editingId,
  canManage,
  extras,
  extraForm,
  setExtraForm,
  extraSaving,
  saveExtra,
  toggleExtra,
}: ExperiencePremiumServicesStepProps) {
  return (
    <div className="border-t border-[#D4AF37]/20 pt-5">
      <div>
        <h3 className="text-xl font-semibold text-[#0D2B52]">
          Servicios premium
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Complementos opcionales para esta experiencia.
        </p>
      </div>

      {!editingId ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/30 p-4 text-sm text-slate-500">
          Guarda la experiencia para administrar sus servicios premium.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-xl bg-[#F8F6F2] p-4">
              <Input placeholder="Nombre del servicio" value={extraForm.name} onChange={(event) => setExtraForm((current) => ({ ...current, name: event.target.value }))} />
              <Textarea placeholder="Descripcion" value={extraForm.description} onChange={(event) => setExtraForm((current) => ({ ...current, description: event.target.value }))} />
              <Input type="number" min={0} placeholder="Precio" value={extraForm.price} onChange={(event) => setExtraForm((current) => ({ ...current, price: event.target.value }))} />
              <Button type="button" onClick={saveExtra} disabled={extraSaving} className="w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                {extraSaving ? "Guardando..." : "Agregar servicio"}
              </Button>
            </div>
          )}

          {extras.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D4AF37]/30 p-4 text-sm text-slate-500">
              Sin servicios premium asociados.
            </div>
          ) : (
            <div className="space-y-3">
              {extras.map((extra) => (
                <div key={extra.id} className="rounded-xl border border-[#D4AF37]/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-[#0D2B52]">{extra.name}</h4>
                        <Badge variant="outline" className="rounded-md">
                          {extra.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      {extra.description && <p className="mt-1 text-sm text-slate-500">{extra.description}</p>}
                      <p className="mt-2 font-semibold text-[#B48A5A]">{money(extra.price)}</p>
                    </div>
                    {canManage && (
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => toggleExtra(extra)}>
                        {extra.active ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
