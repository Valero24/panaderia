import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AdminRoleGate from "@/components/admin/AdminRoleGate";

type PageProps = {
  params: {
    id: string;
  };
};

export default function ImagenesPage({
  params,
}: PageProps) {
  return (
    <AdminRoleGate
      allow={["SUPERADMIN", "ADMIN"]}
      fallback={
        <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
            Permisos
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0D2B52]">
            Galeria restringida
          </h1>
          <p className="mt-3 max-w-xl text-slate-500">
            La administracion visual de alojamientos esta reservada para Super
            Admin.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Gestión de Imágenes
        </h1>

        <p className="text-slate-500 mt-2">
          Administra galería visual del alojamiento — ID {params.id}
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-8 space-y-5">
          <Input type="file" />

          <Button className="rounded-xl">
            Subir imagen principal
          </Button>

          <Button variant="outline" className="rounded-xl">
            Agregar a galería
          </Button>
        </CardContent>
      </Card>
      </div>
    </AdminRoleGate>
  );
}
