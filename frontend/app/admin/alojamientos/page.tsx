import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import AdminRoleGate from "@/components/admin/AdminRoleGate";
import PropertyCard from "@/components/admin/property-card";
import { apiUrl } from "@/lib/api";

async function getProperties() {
  const res = await fetch(apiUrl("/properties"), {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function AlojamientosPage() {
  const properties = await getProperties();

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Gestión de alojamientos
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[#0D2B52]">
              Gestión de alojamientos
            </h1>
            <p className="mt-2 text-slate-500">
              Administra propiedades, disponibilidad, precios y servicios premium.
            </p>
          </div>

          <AdminRoleGate allow={["SUPERADMIN", "ADMIN"]}>
            <Link href="/admin/alojamientos/crear">
              <Button className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                <Plus size={18} className="mr-2" />
                Nuevo alojamiento
              </Button>
            </Link>
          </AdminRoleGate>
        </div>

        <div className="grid gap-5">
          {properties.map((property: any) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </div>
  );
}
