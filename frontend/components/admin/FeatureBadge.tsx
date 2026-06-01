"use client";

type FeatureBadgeProps = {
  value?: string | null;
  kind?: "type" | "category" | "status";
};

const typeLabels: Record<string, string> = {
  PROPERTY: "Alojamientos",
  EXPERIENCE: "Experiencias",
  PACKAGE: "Paquetes",
  ALL: "Todos",
};

const categoryLabels: Record<string, string> = {
  AMENITY: "Amenidad",
  LOCATION_STYLE: "Ubicacion",
  EXPERIENCE_STYLE: "Experiencia",
  TRAVEL_TYPE: "Tipo de viaje",
  SERVICE_LEVEL: "Nivel de servicio",
  INCLUDED: "Incluido",
  NOT_INCLUDED: "No incluido",
  CONDITION: "Condicion",
  OTHER: "Otro",
};

function labelFor(value?: string | null, kind?: FeatureBadgeProps["kind"]) {
  if (!value) return "Sin definir";
  if (kind === "type") return typeLabels[value] || value;
  if (kind === "category") return categoryLabels[value] || value;
  if (kind === "status") return value === "true" ? "Activa" : "Inactiva";

  return value;
}

export function productTypeLabel(value?: string | null) {
  return labelFor(value, "type");
}

export function featureCategoryLabel(value?: string | null) {
  return labelFor(value, "category");
}

export default function FeatureBadge({ value, kind = "category" }: FeatureBadgeProps) {
  const isInactive = kind === "status" && value !== "true";
  const isAll = kind === "type" && value === "ALL";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        isInactive
          ? "border-slate-200 bg-slate-100 text-slate-600"
          : isAll
            ? "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#8A6A24]"
            : "border-[#0D2B52]/10 bg-[#0D2B52]/5 text-[#0D2B52]"
      }`}
    >
      {labelFor(value, kind)}
    </span>
  );
}
