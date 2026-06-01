"use client";

import { ExperienceCard } from "./ExperienceCard";
import type { Experience } from "./experience-form-model";

export function ExperienceList({
  experiences,
  loading,
  canManage,
  onToggleActive,
}: {
  experiences: Experience[];
  loading: boolean;
  canManage: boolean;
  onToggleActive: (experience: Experience) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
        Cargando experiencias...
      </div>
    );
  }

  if (experiences.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
        No hay experiencias creadas todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experiences.map((experience) => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          canManage={canManage}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
