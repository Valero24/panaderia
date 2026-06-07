"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  Eye,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { propertyPublicPath } from "@/lib/product-url";

type Property = {
  id: number;
  slug?: string | null;
  title: string;
  city: string;
  area: string;
  maxCapacity?: number;
  maxGuests?: number;
  basePrice?: number;
  pricePerNight?: number;
  allowsPets?: boolean;
  status?: string;
  bedrooms?: number;
  minimumNights?: number;
  images?: {
    id: number;
    url: string;
    isPrimary?: boolean;
  }[];
};

type PropertyCardProps = {
  property: Property;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200";

export default function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");
  const canManage = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [
    role,
  ]);
  const image =
    property.images?.find((item) => item.isPrimary)?.url ||
    property.images?.[0]?.url ||
    fallbackImage;
  const capacity = property.maxCapacity || property.maxGuests || 0;
  const price = property.basePrice || property.pricePerNight || 0;

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user?.role || "");
    } catch {
      setRole("");
    }
  }, []);

  async function handleDelete() {
    if (!canManage) {
      alert("Tu rol no permite eliminar alojamientos.");
      return;
    }

    const confirmed = window.confirm(`Eliminar "${property.title}"?`);

    if (!confirmed) return;

    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const res = await fetch(
        apiUrl(`/properties/${property.id}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("No se pudo eliminar el alojamiento");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Ocurrio un error eliminando el alojamiento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-sm transition hover:shadow-md">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-200 lg:aspect-auto">
            <img
              src={image}
              alt={property.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4">
              <Badge className="rounded-md bg-white/90 text-[#0D2B52] hover:bg-white">
                Villa premium
              </Badge>
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-between gap-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold text-[#0D2B52]">
                  {property.title}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-slate-500">
                  <Info icon={MapPin}>
                    {property.city}, {property.area}
                  </Info>
                  <Info icon={Users}>{capacity} huéspedes</Info>
                  <Info icon={BedDouble}>
                    {property.bedrooms || 1} habitaciones
                  </Info>
                  <Info icon={CalendarDays}>
                    Min. {property.minimumNights || 1} noche
                  </Info>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500">Desde</p>
                <p className="text-2xl font-semibold text-[#0D2B52]">
                  ${Number(price).toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-slate-400">por noche</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-md bg-[#0D2B52] px-3 text-white hover:bg-[#0D2B52]">
                {property.status || "ACTIVO"}
              </Badge>

              {property.allowsPets && (
                <Badge variant="secondary" className="rounded-md px-3">
                  Mascotas
                </Badge>
              )}

              <Link href={propertyPublicPath(property)}>
                <Button variant="outline" className="rounded-xl">
                  <Eye size={16} className="mr-2" />
                  Ver
                </Button>
              </Link>

              {canManage && (
                <>
                  <Link href={`/admin/alojamientos/editar/${property.id}`}>
                    <Button variant="outline" className="rounded-xl">
                      <Pencil size={16} className="mr-2" />
                      Editar
                    </Button>
                  </Link>

                  <Button
                    onClick={handleDelete}
                    disabled={loading}
                    className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 size={16} className="mr-2" />
                    {loading ? "Eliminando..." : "Eliminar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <Icon size={16} className="text-[#B48A5A]" />
      {children}
    </span>
  );
}
