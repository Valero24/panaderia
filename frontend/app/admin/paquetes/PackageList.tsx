"use client";

import { PackageCard } from "./PackageCard";
import type { PackageItem } from "./package-form-model";

export function PackageList({
  packages,
  loading,
  canManage,
  onToggleActive,
}: {
  packages: PackageItem[];
  loading: boolean;
  canManage: boolean;
  onToggleActive: (item: PackageItem) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
        Cargando paquetes...
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
        No hay paquetes creados todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {packages.map((item) => (
        <PackageCard
          key={item.id}
          item={item}
          canManage={canManage}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
