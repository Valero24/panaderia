import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PageProps = {
  params: {
    id: string;
  };
};

export default function DisponibilidadPage({
  params,
}: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Gestión de Disponibilidad
        </h1>

        <p className="text-slate-500 mt-2">
          Bloqueos manuales y control de fechas — ID {params.id}
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-8 space-y-5">
          <Input type="date" />

          <Input type="date" />

          <Input placeholder="Motivo del bloqueo (mantenimiento, uso privado...)" />

          <Button className="rounded-xl">
            Guardar bloqueo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}