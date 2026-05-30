"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

type Extra = {
  id: number;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  propertyId: number;
  property?: {
    title: string;
  };
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditExtraPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");
  const canManage = ["SUPERADMIN", "ADMIN"].includes(role);

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

    async function getExtra() {
      const res = await fetch(apiUrl(`/extras/${id}`), {
        cache: "no-store",
      });
      const data = await res.json();
      setExtra(data);
    }

    getExtra();
  }, [id, canManage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!extra) return;
    if (!canManage) {
      alert("Tu rol no permite editar servicios premium.");
      return;
    }

    const token = localStorage.getItem("token");
    setLoading(true);

    const res = await fetch(apiUrl(`/extras/${id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: extra.name,
        description: extra.description,
        price: Number(extra.price),
        propertyId: extra.propertyId,
        active: extra.active,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      alert("No se pudo actualizar el servicio.");
      return;
    }

    router.push(`/admin/extras/${extra.propertyId}`);
    router.refresh();
  }

  if (role && !canManage) {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
          Permisos
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0D2B52]">
          Edicion restringida
        </h1>
        <p className="mt-3 max-w-xl text-slate-500">
          La edicion de servicios premium esta reservada para Super Admin.
        </p>
      </div>
    );
  }

  if (!extra) {
    return <div className="text-slate-500">Cargando servicio...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
          Premium Services
        </p>

        <h1 className="text-4xl font-bold text-[#0D2B52] mt-2">
          Editar Servicio Premium
        </h1>

        <p className="text-slate-500 mt-2">
          Actualiza la configuración del servicio adicional.
        </p>
      </div>

      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-[#0D2B52]">
              Nombre del servicio
            </label>

            <input
              value={extra.name}
              onChange={(event) =>
                setExtra({ ...extra, name: event.target.value })
              }
              className="w-full mt-2 rounded-xl border p-4"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0D2B52]">
              Descripcion
            </label>

            <textarea
              value={extra.description || ""}
              onChange={(event) =>
                setExtra({ ...extra, description: event.target.value })
              }
              rows={4}
              className="w-full mt-2 rounded-xl border p-4"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0D2B52]">
              Precio
            </label>

            <input
              type="number"
              value={extra.price}
              onChange={(event) =>
                setExtra({ ...extra, price: Number(event.target.value) })
              }
              className="w-full mt-2 rounded-xl border p-4"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0D2B52]">
              Propiedad
            </label>

            <input
              type="text"
              value={extra.property?.title || ""}
              readOnly
              className="w-full mt-2 rounded-xl border p-4 bg-slate-100 cursor-not-allowed"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={extra.active}
              onChange={(event) =>
                setExtra({ ...extra, active: event.target.checked })
              }
            />

            <span>Servicio activo</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#0D2B52] text-white px-8 py-4 hover:bg-[#12396d] transition disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
