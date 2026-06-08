"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";

import { apiUrl } from "@/lib/api";

export type DestinationProductType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

type DestinationOption = {
  id: number;
  name: string;
  slug: string;
  location?: string | null;
  isFeatured?: boolean | null;
};

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : "";
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchProductDestinations(
  productType: DestinationProductType,
  productId: string | number
) {
  const response = await fetch(
    apiUrl(`/destinations/product/${productType}/${productId}`),
    {
      headers: authHeaders(),
      cache: "no-store",
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron cargar destinos relacionados.");
  }

  return Array.isArray(data)
    ? data
        .map((item) => Number(item?.destinationId || item?.destination?.id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
}

export async function saveProductDestinations(
  productType: DestinationProductType,
  productId: string | number,
  destinationIds: number[]
) {
  const response = await fetch(
    apiUrl(`/destinations/product/${productType}/${productId}`),
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ destinationIds }),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron guardar destinos relacionados.");
  }

  return data;
}

export default function ProductDestinationSelector({
  productType,
  productId,
  selectedIds,
  onChange,
  disabled,
}: {
  productType: DestinationProductType;
  productId?: string | number | null;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      try {
        setLoading(true);
        setMessage("");
        const response = await fetch(apiUrl("/destinations"), {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "No se pudieron cargar destinos.");
        }

        if (!cancelled) {
          setDestinations(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessage(error?.message || "Error cargando destinos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    async function loadAssignments() {
      try {
        const ids = await fetchProductDestinations(productType, productId!);
        if (!cancelled) onChange(ids);
      } catch (error: any) {
        if (!cancelled) {
          setMessage(error?.message || "Error cargando destinos relacionados.");
        }
      }
    }

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [productId, productType]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleDestinations = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return destinations.filter((destination) => {
      return (
        !cleanSearch ||
        destination.name.toLowerCase().includes(cleanSearch) ||
        destination.slug.toLowerCase().includes(cleanSearch)
      );
    });
  }, [destinations, search]);

  function toggleDestination(destinationId: number, checked: boolean) {
    if (checked) {
      if (selectedSet.has(destinationId)) return;
      onChange([...selectedIds, destinationId]);
      return;
    }

    onChange(selectedIds.filter((id) => id !== destinationId));
  }

  return (
    <section className="rounded-[32px] border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-[#F8F6F2] p-3 text-[#B68D40]">
          <MapPinned className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-[#0D2B52]">
            Destinos relacionados
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Selecciona una o varias zonas turísticas activas para conectar este
            producto con las páginas públicas de destinos.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar destino"
          className="h-10 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-3 text-sm outline-none transition focus:border-[#0D2B52]"
          disabled={loading}
        />
      </div>

      {message && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando destinos...</p>
        ) : visibleDestinations.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay destinos activos disponibles.
          </p>
        ) : (
          visibleDestinations.map((destination) => (
            <label
              key={destination.id}
              className="flex items-start gap-3 rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(destination.id)}
                disabled={disabled}
                onChange={(event) =>
                  toggleDestination(destination.id, event.target.checked)
                }
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-[#0D2B52]">
                  {destination.name}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  /destinos/{destination.slug}
                  {destination.location ? ` · ${destination.location}` : ""}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
    </section>
  );
}
