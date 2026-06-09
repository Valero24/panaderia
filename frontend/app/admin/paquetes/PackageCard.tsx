"use client";

import Link from "next/link";
import {
  CalendarDays,
  Edit3,
  Eye,
  MapPin,
  ToggleLeft,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { packagePublicPath } from "@/lib/product-url";
import TranslationStatusBadge from "@/components/admin/TranslationStatusBadge";
import {
  money,
  previewImage,
  type PackageItem,
} from "./package-form-model";

export function PackageCard({
  item,
  canManage,
  onToggleActive,
}: {
  item: PackageItem;
  canManage: boolean;
  onToggleActive: (item: PackageItem) => void;
}) {
  const image = previewImage(item);

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm">
      <CardContent className="grid gap-0 p-0 md:grid-cols-[210px_1fr]">
        <div className="relative h-56 bg-slate-200 md:h-auto">
          {image ? (
            <img
              src={image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Sin imagen
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                item.active
                  ? "rounded-md bg-[#0D2B52] hover:bg-[#0D2B52]"
                  : "rounded-md bg-slate-400 hover:bg-slate-400"
              }
            >
              {item.active ? "Activo" : "Inactivo"}
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {item.category}
            </Badge>
            <TranslationStatusBadge status={item.translationStatus} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[#0D2B52]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {item.shortDescription}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#B48A5A]" />
              {item.location}
            </span>
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#B48A5A]" />
              {item.duration}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#B48A5A]" />
              {item.maxGuests}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xl font-semibold text-[#B48A5A]">
              {money(item.basePrice)}
            </p>
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/admin/paquetes/${item.id}/editar`}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onToggleActive(item)}
                  >
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    {item.active ? "Desactivar" : "Activar"}
                  </Button>
                </>
              )}
              <a href={packagePublicPath(item)} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" className="rounded-xl">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
