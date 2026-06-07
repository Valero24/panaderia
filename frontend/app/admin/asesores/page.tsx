"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Save, ToggleLeft, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

type Advisor = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  deletedAt?: string | null;
  deletedById?: number | null;
  createdAt: string;
  _count?: {
    preReservationsAssigned?: number;
    bookings?: number;
  };
};

type AdvisorForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
};

const emptyForm: AdvisorForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  isActive: true,
};

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CO");
}

export default function AdminAsesoresPage() {
  const [role, setRole] = useState("");
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [form, setForm] = useState<AdvisorForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const canManage = role === "SUPERADMIN";

  const activeAdvisors = useMemo(
    () => advisors.filter((advisor) => advisor.isActive && !advisor.deletedAt).length,
    [advisors]
  );

  const visibleAdvisors = useMemo(
    () => advisors.filter((advisor) => !advisor.deletedAt),
    [advisors]
  );

  const inactiveAdvisors = useMemo(
    () => visibleAdvisors.filter((advisor) => !advisor.isActive).length,
    [visibleAdvisors]
  );

  async function fetchAdvisors() {
    if (!canManage) return;

    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/users/advisors"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar los asesores.");
        return;
      }

      setAdvisors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion cargando asesores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(readRole());
  }, []);

  useEffect(() => {
    fetchAdvisors();
  }, [canManage]);

  function updateForm(key: keyof AdvisorForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setTemporaryPassword("");
    setMessage("");
  }

  function startEdit(advisor: Advisor) {
    setEditingId(advisor.id);
    setForm({
      name: advisor.name || "",
      email: advisor.email || "",
      phone: advisor.phone || "",
      password: "",
      isActive: advisor.isActive,
    });
    setTemporaryPassword("");
    setMessage("");
  }

  async function saveAdvisor() {
    if (!canManage) {
      setMessage("Tu rol no permite administrar asesores.");
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setMessage("Nombre y correo son requeridos.");
      return;
    }

    if (!editingId && form.password.length < 6) {
      setMessage("La contrasena temporal debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setTemporaryPassword("");

      const token = localStorage.getItem("token");
      const payload: Record<string, string | boolean> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        isActive: form.isActive,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const res = await fetch(
        apiUrl(editingId ? `/users/advisors/${editingId}` : "/users/advisors"),
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar el asesor.");
        return;
      }

      if (!editingId && form.password) {
        setTemporaryPassword(form.password);
      }

      setMessage(
        editingId
          ? "Asesor actualizado correctamente."
          : "Asesor creado correctamente."
      );
      setForm(emptyForm);
      setEditingId(null);
      await fetchAdvisors();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion guardando asesor.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(advisor: Advisor) {
    if (!canManage) return;

    try {
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/users/advisors/${advisor.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !advisor.isActive }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cambiar el estado.");
        return;
      }

      setMessage("Estado del asesor actualizado.");
      await fetchAdvisors();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion actualizando asesor.");
    }
  }

  async function deleteAdvisor(advisor: Advisor) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Archivar asesor ${advisor.name}? Esta acción lo ocultará de la vista principal, lo dejará inactivo y conservará el historial de reservas.`
    );

    if (!confirmed) return;

    try {
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/users/advisors/${advisor.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo archivar el asesor.");
        return;
      }

      if (editingId === advisor.id) {
        startCreate();
      }

      setMessage("Asesor archivado correctamente.");
      await fetchAdvisors();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion eliminando asesor.");
    }
  }

  if (role && !canManage) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-[#B48A5A]">
            Permisos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Gestion de asesores restringida
          </h1>
          <p className="mt-3 text-slate-500">
            Solo Superadmin puede crear, editar y activar asesores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Equipo comercial
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[#0D2B52]">
              Gestion de asesores
            </h1>
            <p className="mt-2 text-slate-500">
              Crea y administra los usuarios que gestionan solicitudes y
              reservas asignadas.
            </p>
          </div>
          <Button
            type="button"
            onClick={startCreate}
            className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo asesor
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Asesores activos" value={activeAdvisors} />
          <SummaryCard label="Inactivos / bloqueados" value={inactiveAdvisors} />
          <SummaryCard
            label="Reservas asignadas"
            value={visibleAdvisors.reduce(
              (acc, advisor) =>
                acc + Number(advisor._count?.preReservationsAssigned || 0),
              0
            )}
          />
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        {temporaryPassword && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Contrasena temporal para entregar una sola vez:{" "}
            <span className="font-semibold">{temporaryPassword}</span>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-[#FAF8F2] text-left text-[#0D2B52]">
                    <tr>
                      <th className="p-5">Asesor</th>
                      <th className="p-5">Contacto</th>
                      <th className="p-5">Estado</th>
                      <th className="p-5">Asignadas</th>
                      <th className="p-5">Creado</th>
                      <th className="p-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Cargando asesores...
                        </td>
                      </tr>
                    )}
                    {!loading && visibleAdvisors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No hay asesores para mostrar.
                        </td>
                      </tr>
                    )}
                    {visibleAdvisors.map((advisor) => (
                      <tr key={advisor.id} className="border-b last:border-0">
                        <td className="p-5">
                          <p className="font-semibold text-[#0D2B52]">
                            {advisor.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Rol {advisor.role}
                          </p>
                        </td>
                        <td className="p-5">
                          <p className="text-[#0D2B52]">{advisor.email}</p>
                          <p className="text-xs text-slate-500">
                            {advisor.phone || "Sin telefono"}
                          </p>
                        </td>
                        <td className="p-5">
                          <Badge
                            className={
                              advisor.isActive
                                ? "rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "rounded-md bg-slate-200 text-slate-600 hover:bg-slate-200"
                            }
                          >
                            {advisor.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="p-5 text-slate-600">
                          {advisor._count?.preReservationsAssigned || 0}
                        </td>
                        <td className="p-5 text-slate-500">
                          {formatDate(advisor.createdAt)}
                        </td>
                        <td className="p-5">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEdit(advisor)}
                              className="rounded-xl"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => toggleStatus(advisor)}
                              className="rounded-xl"
                            >
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              {advisor.isActive ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => deleteAdvisor(advisor)}
                              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Archivar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  {editingId ? "Editar asesor" : "Crear asesor"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  El rol se asigna automáticamente como asesor.
                </p>
              </div>

              <Input
                placeholder="Nombre"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
              <Input
                type="email"
                placeholder="Correo"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
              />
              <Input
                placeholder="Telefono"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
              />
              <Input
                type="password"
                placeholder={
                  editingId
                    ? "Nueva contrasena temporal (opcional)"
                    : "Contrasena temporal"
                }
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
              />
              <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateForm("isActive", event.target.checked)
                  }
                />
                Asesor activo
              </label>

              <Button
                type="button"
                onClick={saveAdvisor}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar asesor"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#0D2B52]">{value}</p>
    </div>
  );
}
