"use client";

import { Suspense, useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import TranslationEditor from "@/components/admin/TranslationEditor";
import type { TranslationMap } from "@/components/admin/translations-model";
import { apiUrl } from "@/lib/api";

function NewExtraForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyIdFromUrl =
    searchParams.get("propertyId") || "";

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");
  const canManage = ["SUPERADMIN", "ADMIN"].includes(role);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    propertyId: propertyIdFromUrl,
    translations: {} as TranslationMap,
  });

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

  useEffect(() => {
    if (propertyIdFromUrl) {
      setForm((prev) => ({
        ...prev,
        propertyId: propertyIdFromUrl,
      }));
    }
  }, [propertyIdFromUrl]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!canManage) {
      alert("Tu rol no permite crear servicios premium.");
      return;
    }

    setLoading(true);

    const token = localStorage.getItem("token");

    await fetch(apiUrl("/extras"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        propertyId: Number(form.propertyId),
        translations: form.translations,
      }),
    });

    setLoading(false);

    router.push(
      `/admin/extras/${form.propertyId}`
    );
    router.refresh();
  }

  if (role && !canManage) {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
          Permisos
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0D2B52]">
          Creacion restringida
        </h1>
        <p className="mt-3 max-w-xl text-slate-500">
          La creacion de servicios premium esta reservada para Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
          PREMIUM SERVICES
        </p>

        <h1 className="text-4xl font-bold text-[#0D2B52] mt-2">
          Crear Nuevo Servicio Premium
        </h1>

        <p className="text-slate-500 mt-3">
          Agrega experiencias exclusivas para tus
          alojamientos.
        </p>
      </div>

      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del servicio
            </label>

            <input
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="Ej: Airport Transfer"
              className="w-full rounded-xl border p-4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descripción
            </label>

            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description:
                    e.target.value,
                })
              }
              placeholder="Describe este servicio premium..."
              className="w-full rounded-xl border p-4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Precio
            </label>

            <input
              type="number"
              required
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value,
                })
              }
              placeholder="120"
              className="w-full rounded-xl border p-4"
            />
          </div>

          <TranslationEditor
            title="Traducciones del servicio"
            fields={[
              { key: "name", label: "Nombre", baseValue: form.name },
              {
                key: "description",
                label: "Descripcion",
                type: "textarea",
                baseValue: form.description,
              },
            ]}
            value={form.translations}
            onChange={(value) => setForm({ ...form, translations: value })}
            disabled={!canManage}
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              Propiedad
            </label>

            <select
              required
              value={form.propertyId}
              onChange={(e) =>
                setForm({
                  ...form,
                  propertyId:
                    e.target.value,
                })
              }
              className="w-full rounded-xl border p-4"
            >
              <option value="">
                Selecciona una propiedad
              </option>

              {properties.map(
                (property: any) => (
                  <option
                    key={property.id}
                    value={property.id}
                  >
                    {property.title}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#0D2B52] px-8 py-4 text-white font-medium hover:bg-[#12396d] transition"
          >
            {loading
              ? "Guardando..."
              : "Guardar Servicio Premium"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewExtraPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Cargando...</div>}>
      <NewExtraForm />
    </Suspense>
  );
}
