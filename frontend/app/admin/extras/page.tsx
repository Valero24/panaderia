"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

export default function AdminExtrasPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [role, setRole] = useState("");

  const canManage = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [
    role,
  ]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user?.role || "");
    } catch {
      setRole("");
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;

    fetch(apiUrl("/properties"))
      .then((res) => res.json())
      .then((data) => setProperties(data));
  }, [canManage]);

  const filteredProperties = properties.filter((property) =>
    property.title
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSelect = (id: number) => {
    if (selected.includes(id)) {
      setSelected(
        selected.filter((item) => item !== id)
      );
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    if (
      selected.length === filteredProperties.length
    ) {
      setSelected([]);
    } else {
      setSelected(
        filteredProperties.map((p) => p.id)
      );
    }
  };

  if (role && !canManage) {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
          Permisos
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0D2B52]">
          Servicios premium restringidos
        </h1>
        <p className="mt-3 max-w-xl text-slate-500">
          Tu rol permite gestionar solicitudes y reservas asignadas. La
          administración de servicios premium está reservada para Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
          Premium Services
        </p>

        <h1 className="text-3xl font-bold text-[#0D2B52] mt-2">
          Selecciona un alojamiento
        </h1>

        <p className="text-slate-500 mt-2">
          Busca y administra servicios premium
          por propiedad.
        </p>
      </div>

      {/* PANEL DE FILTRO */}
      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm space-y-5">
        <input
          type="text"
          placeholder="Buscar alojamiento por nombre..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-xl border p-4"
        />

        <button
          onClick={handleSelectAll}
          className="rounded-xl border px-5 py-2 text-sm font-medium hover:bg-slate-50 transition"
        >
          {selected.length ===
          filteredProperties.length
            ? "Deseleccionar todos"
            : "Seleccionar todos"}
        </button>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredProperties.map((property) => (
            <label
              key={property.id}
              className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(
                  property.id
                )}
                onChange={() =>
                  handleSelect(property.id)
                }
              />

              <span className="font-medium text-[#0D2B52]">
                {property.title}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredProperties
          .filter(
            (property) =>
              selected.length === 0 ||
              selected.includes(property.id)
          )
          .map((property) => (
            <Link
              key={property.id}
              href={`/admin/extras/${property.id}`}
              className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm p-8 hover:shadow-md transition"
            >
              <h2 className="text-2xl font-bold text-[#0D2B52]">
                {property.title}
              </h2>

              <p className="text-slate-500 mt-2">
                {property.location}
              </p>

              <p className="text-[#B68D40] font-semibold mt-4">
                Gestionar servicios premium →
              </p>
            </Link>
          ))}
      </div>
    </div>
  );
}
