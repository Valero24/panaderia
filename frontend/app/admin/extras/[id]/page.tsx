"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

type Extra = {
  id: number;
  name: string;
  description?: string;
  price: number;
  active: boolean;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ExtrasByPropertyPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [role, setRole] = useState("");
  const canManage = ["SUPERADMIN", "ADMIN"].includes(role);

  async function getExtrasByProperty() {
    if (!canManage) return;

    try {
      const res = await fetch(apiUrl(`/extras/property/${id}`), {
        cache: "no-store",
      });

      if (!res.ok) {
        setExtras([]);
        return;
      }

      const data = await res.json();

      setExtras(Array.isArray(data) ? data : data.data || data.extras || []);
    } catch (error) {
      console.error(error);
      setExtras([]);
    }
  }

  async function deleteExtra(extraId: number) {
    if (!canManage) {
      alert("Tu rol no permite eliminar servicios premium.");
      return;
    }

    const token = localStorage.getItem("token");

    await fetch(apiUrl(`/extras/${extraId}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    getExtrasByProperty();
    router.refresh();
  }

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user?.role || "");
    } catch {
      setRole("");
    }
  }, []);

  useEffect(() => {
    getExtrasByProperty();
  }, [id, canManage]);

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
          La administracion de servicios premium esta reservada para Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
            Premium Services
          </p>

          <h1 className="text-3xl font-bold text-[#0D2B52] mt-2">
            Servicios del alojamiento
          </h1>

          <p className="text-slate-500 mt-2">
            Administra los servicios premium de esta propiedad.
          </p>
        </div>

        <Link
          href={`/admin/extras/nuevo?propertyId=${id}`}
          className="rounded-xl bg-[#0D2B52] text-white px-6 py-3 font-medium hover:bg-[#12396d] transition"
        >
          + Nuevo Servicio
        </Link>
      </div>

      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-[#FAF8F2]">
            <tr>
              <th className="text-left p-6 text-sm font-semibold text-[#0D2B52]">
                Servicio
              </th>
              <th className="text-left p-6 text-sm font-semibold text-[#0D2B52]">
                Precio
              </th>
              <th className="text-left p-6 text-sm font-semibold text-[#0D2B52]">
                Estado
              </th>
              <th className="text-left p-6 text-sm font-semibold text-[#0D2B52]">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {extras.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="p-6">
                  <p className="font-semibold text-[#0D2B52]">{item.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {item.description}
                  </p>
                </td>

                <td className="p-6 font-medium text-[#B68D40]">
                  ${item.price}
                </td>

                <td className="p-6">
                  <span
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${
                      item.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.active ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td className="p-6">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/extras/editar/${item.id}`}
                      className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50 transition"
                    >
                      Editar
                    </Link>

                    <button
                      type="button"
                      onClick={() => deleteExtra(item.id)}
                      className="rounded-xl border px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
