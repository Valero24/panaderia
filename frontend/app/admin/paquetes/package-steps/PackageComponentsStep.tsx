"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PackageComponent, PackageForm } from "../package-form-model";

type PackageComponentsStepProps = {
  form: PackageForm;
  canManage: boolean;
  addComponent: () => void;
  updateComponent: (index: number, patch: Partial<PackageComponent>) => void;
  removeComponent: (index: number) => void;
  moveComponent: (index: number, step: number) => void;
};

export default function PackageComponentsStep({
  form,
  canManage,
  addComponent,
  updateComponent,
  removeComponent,
  moveComponent,
}: PackageComponentsStepProps) {
  return (
    <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0D2B52]">
            Componentes del paquete
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Describe las experiencias o actividades que conforman este paquete.
            Se mostraran como tarjetas en la pagina publica.
          </p>
        </div>
        {canManage && (
          <Button type="button" onClick={addComponent} variant="outline" className="shrink-0 rounded-xl bg-white">
            <Plus className="mr-2 h-4 w-4" />
            Agregar componente
          </Button>
        )}
      </div>

      {form.components.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/35 bg-white p-5 text-center text-sm text-slate-500">
          Sin componentes. Puedes agregar actividades como paseo nocturno, chiva
          rumbera o pasadia en bote privado.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {form.components.map((component, index) => (
            <div key={component.id || index} className="min-w-0 rounded-2xl border border-[#D4AF37]/15 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-[#0D2B52]">
                  Componente #{index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveComponent(index, -1)} disabled={!canManage || index === 0} className="rounded-xl">
                    Subir
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => moveComponent(index, 1)} disabled={!canManage || index === form.components.length - 1} className="rounded-xl">
                    Bajar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeComponent(index)} disabled={!canManage} className="rounded-xl border-red-200 text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <Input placeholder="Titulo del componente" value={component.title} onChange={(event) => updateComponent(index, { title: event.target.value })} disabled={!canManage} className="w-full min-w-0" />
                <Textarea placeholder="Descripcion corta" value={component.shortDescription || ""} onChange={(event) => updateComponent(index, { shortDescription: event.target.value })} disabled={!canManage} className="min-h-24 w-full min-w-0" />
                <Textarea placeholder="Descripcion completa" value={component.description || ""} onChange={(event) => updateComponent(index, { description: event.target.value })} disabled={!canManage} className="min-h-32 w-full min-w-0" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Duracion" value={component.duration || ""} onChange={(event) => updateComponent(index, { duration: event.target.value })} disabled={!canManage} className="w-full min-w-0" />
                  <Input type="number" placeholder="Orden" value={component.sortOrder ?? index} onChange={(event) => updateComponent(index, { sortOrder: Number(event.target.value) })} disabled={!canManage} className="w-full min-w-0" />
                </div>
                <Textarea placeholder="Que incluye" value={component.includes || ""} onChange={(event) => updateComponent(index, { includes: event.target.value })} disabled={!canManage} className="min-h-24 w-full min-w-0" />
                <Textarea placeholder="Que no incluye" value={component.excludes || ""} onChange={(event) => updateComponent(index, { excludes: event.target.value })} disabled={!canManage} className="min-h-24 w-full min-w-0" />
                <Textarea placeholder="Condiciones" value={component.conditions || ""} onChange={(event) => updateComponent(index, { conditions: event.target.value })} disabled={!canManage} className="min-h-24 w-full min-w-0" />
                <Textarea placeholder="Recomendaciones" value={component.recommendations || ""} onChange={(event) => updateComponent(index, { recommendations: event.target.value })} disabled={!canManage} className="min-h-24 w-full min-w-0" />
                <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-3 text-sm text-slate-600">
                  <input type="checkbox" checked={component.active !== false} onChange={(event) => updateComponent(index, { active: event.target.checked })} disabled={!canManage} />
                  Componente activo
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
