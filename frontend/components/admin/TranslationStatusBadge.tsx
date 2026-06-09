import { Badge } from "@/components/ui/badge";

type TranslationStatusBadgeProps = {
  status?: string | null;
};

const statusMap: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  NOT_REQUESTED: {
    label: "Sin traducir",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  PENDING_TRANSLATION: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  TRANSLATING: {
    label: "Traduciendo",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  COMPLETED: {
    label: "Traducido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ERROR: {
    label: "Error",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export default function TranslationStatusBadge({
  status,
}: TranslationStatusBadgeProps) {
  const current = statusMap[status || "NOT_REQUESTED"] || statusMap.NOT_REQUESTED;

  return (
    <Badge variant="outline" className={`rounded-md ${current.className}`}>
      {current.label}
    </Badge>
  );
}
