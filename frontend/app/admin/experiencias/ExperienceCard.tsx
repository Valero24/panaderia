"use client";

import Link from "next/link";
import { Clock, Edit3, Eye, MapPin, ToggleLeft, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { experiencePublicPath } from "@/lib/product-url";
import TranslationStatusBadge from "@/components/admin/TranslationStatusBadge";
import {
  money,
  previewImage,
  type Experience,
} from "./experience-form-model";

export function ExperienceCard({
  experience,
  canManage,
  onToggleActive,
}: {
  experience: Experience;
  canManage: boolean;
  onToggleActive: (experience: Experience) => void;
}) {
  const image = previewImage(experience);

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm">
      <CardContent className="grid gap-0 p-0 md:grid-cols-[210px_1fr]">
        <div className="relative h-56 bg-slate-200 md:h-auto">
          {image ? (
            <img
              src={image}
              alt={experience.title}
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
                experience.active
                  ? "rounded-md bg-[#0D2B52] hover:bg-[#0D2B52]"
                  : "rounded-md bg-slate-400 hover:bg-slate-400"
              }
            >
              {experience.active ? "Activa" : "Inactiva"}
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {experience.category}
            </Badge>
            <TranslationStatusBadge status={experience.translationStatus} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[#0D2B52]">
              {experience.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {experience.shortDescription}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#B48A5A]" />
              {experience.location}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#B48A5A]" />
              {experience.duration}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#B48A5A]" />
              {experience.maxGuests}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xl font-semibold text-[#B48A5A]">
              {money(experience.basePrice)}
            </p>
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/admin/experiencias/${experience.id}/editar`}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onToggleActive(experience)}
                  >
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    {experience.active ? "Desactivar" : "Activar"}
                  </Button>
                </>
              )}
              <a
                href={experiencePublicPath(experience)}
                target="_blank"
                rel="noreferrer"
              >
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
