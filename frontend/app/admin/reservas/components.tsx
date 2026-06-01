import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";

type IconComponent = ComponentType<{ className?: string }>;

export function OperationMetricCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: IconComponent;
  label: string;
  value: number | string;
  loading: boolean;
  tone: "amber" | "blue" | "green";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-[#EAF0F8] text-[#0D2B52] border-[#0D2B52]/15",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];

  return (
    <Card className="premium-enter premium-surface rounded-2xl">
      <CardContent className="p-6">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-3 h-9 w-28 rounded-lg premium-skeleton" />
        ) : (
          <h3 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            {value}
          </h3>
        )}
      </CardContent>
    </Card>
  );
}

export function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 p-4">
      <Icon className="h-4 w-4 text-[#B48A5A]" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium text-[#0D2B52]">{value}</p>
    </div>
  );
}
