"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PropertyPremiumServicesStepProps = {
  isEditMode: boolean;
  propertyId?: string | number;
};

export default function PropertyPremiumServicesStep({
  isEditMode,
  propertyId,
}: PropertyPremiumServicesStepProps) {
  const router = useRouter();

  return (
    <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-6 p-10">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
            Servicios premium
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[#0F2A44]">
            Complementos del alojamiento
          </h2>
          <p className="mt-3 max-w-2xl text-slate-500">
            Los servicios premium de alojamientos se administran desde el modulo
            dedicado para conservar la logica existente.
          </p>
        </div>

        {!isEditMode ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F1] p-6 text-sm leading-6 text-slate-600">
            Primero publica el alojamiento. Luego podrás agregar chef,
            transporte, decoracion, limpieza adicional u otros servicios premium
            desde el panel de servicios.
          </div>
        ) : (
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-6">
            <h3 className="text-xl font-semibold text-[#0F2A44]">
              Gestionar servicios premium
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Abre el administrador de servicios de este alojamiento para crear,
              editar, activar o desactivar complementos.
            </p>
            <Button
              type="button"
              onClick={() => router.push(`/admin/extras/${propertyId}`)}
              className="mt-5 rounded-xl bg-[#0F2A44] text-white hover:bg-[#163756]"
            >
              Administrar servicios premium
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
