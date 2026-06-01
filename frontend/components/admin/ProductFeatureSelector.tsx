"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Filter, Loader2 } from "lucide-react";

import FeatureBadge, {
  featureCategoryLabel,
  productTypeLabel,
} from "@/components/admin/FeatureBadge";
import { apiUrl } from "@/lib/api";

export type ProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

export type ProductFeature = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category: string;
  appliesTo: ProductType | "ALL";
  active: boolean;
  _count?: {
    assignments?: number;
  };
};

type ProductFeatureSelectorProps = {
  productType: ProductType;
  productId?: number | string | null;
  selectedFeatureIds: number[];
  onChange: (featureIds: number[]) => void;
  disabled?: boolean;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export async function fetchFeatureAssignments(
  productType: ProductType,
  productId: number | string
) {
  const token = getToken();
  const response = await fetch(
    apiUrl(`/product-features/assignments?productType=${productType}&productId=${productId}`),
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron cargar asignaciones.");
  }

  return Array.isArray(data) ? data : [];
}

export async function saveFeatureAssignments(
  productType: ProductType,
  productId: number | string,
  featureIds: number[]
) {
  const token = getToken();
  const response = await fetch(apiUrl("/product-features/assignments"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      productType,
      productId: Number(productId),
      featureIds,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron guardar caracteristicas.");
  }

  return data;
}

export default function ProductFeatureSelector({
  productType,
  productId,
  selectedFeatureIds,
  onChange,
  disabled = false,
}: ProductFeatureSelectorProps) {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeatures() {
      try {
        setLoading(true);
        setError("");

        const token = getToken();
        const response = await fetch(apiUrl("/product-features"), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "No se pudieron cargar caracteristicas.");
        }

        if (!cancelled) {
          setFeatures(Array.isArray(data) ? data : []);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "No se pudieron cargar caracteristicas.");
          setFeatures([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeatures();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      if (!productId) return;

      try {
        const assignments = await fetchFeatureAssignments(productType, productId);
        if (!cancelled) {
          onChange(assignments.map((item: any) => Number(item.featureId)));
        }
      } catch {
        if (!cancelled) {
          onChange([]);
        }
      }
    }

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [productId, productType]);

  const applicableFeatures = useMemo(
    () =>
      features
        .filter(
          (feature) =>
            feature.active &&
            (feature.appliesTo === productType || feature.appliesTo === "ALL")
        )
        .sort((a, b) =>
          a.category === b.category
            ? a.name.localeCompare(b.name)
            : featureCategoryLabel(a.category).localeCompare(featureCategoryLabel(b.category))
        ),
    [features, productType]
  );

  function toggleFeature(featureId: number) {
    if (disabled) return;

    if (selectedFeatureIds.includes(featureId)) {
      onChange(selectedFeatureIds.filter((id) => id !== featureId));
      return;
    }

    onChange([...selectedFeatureIds, featureId]);
  }

  return (
    <section className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
            Caracteristicas filtrables
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#0D2B52]">
            Filtros para {productTypeLabel(productType).toLowerCase()}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Selecciona solo las caracteristicas que aplican a este producto. No
            se muestran filtros de otros tipos para evitar cruces en el catalogo.
          </p>
        </div>
        <span className="rounded-full bg-[#0D2B52] px-3 py-1 text-xs font-semibold text-white">
          {selectedFeatureIds.length} seleccionadas
        </span>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F2] p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando caracteristicas...
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : applicableFeatures.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F2] p-5 text-sm leading-6 text-slate-500">
          No hay caracteristicas activas para este tipo. Crea filtros desde
          Caracteristicas antes de asignarlos.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {applicableFeatures.map((feature) => {
            const selected = selectedFeatureIds.includes(feature.id);

            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => toggleFeature(feature.id)}
                disabled={disabled}
                className={`min-w-0 rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[#0D2B52] bg-[#0D2B52] text-white shadow-sm"
                    : "border-[#D4AF37]/20 bg-[#F8F6F2] text-[#0D2B52] hover:border-[#D4AF37]/45 hover:bg-white"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Filter className="h-4 w-4 shrink-0" />
                      <p className="font-semibold">{feature.name}</p>
                    </div>
                    {feature.description && (
                      <p
                        className={`mt-2 line-clamp-2 text-sm leading-6 ${
                          selected ? "text-white/80" : "text-slate-500"
                        }`}
                      >
                        {feature.description}
                      </p>
                    )}
                  </div>
                  {selected && <Check className="h-5 w-5 shrink-0" />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FeatureBadge value={feature.category} kind="category" />
                  <FeatureBadge value={feature.appliesTo} kind="type" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
