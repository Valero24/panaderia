"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Save, Search, Trash2, ToggleLeft } from "lucide-react";

import AdminRoleGate from "@/components/admin/AdminRoleGate";
import FeatureBadge, {
  featureCategoryLabel,
  productTypeLabel,
} from "@/components/admin/FeatureBadge";
import type { ProductFeature } from "@/components/admin/ProductFeatureSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

type FeatureForm = {
  name: string;
  description: string;
  icon: string;
  category: string;
  appliesTo: string;
  active: boolean;
};

const emptyForm: FeatureForm = {
  name: "",
  description: "",
  icon: "",
  category: "",
  appliesTo: "",
  active: true,
};

const appliesToOptions = [
  { value: "PROPERTY", label: "Alojamientos" },
  { value: "EXPERIENCE", label: "Experiencias" },
  { value: "PACKAGE", label: "Paquetes" },
  { value: "ALL", label: "Todos" },
];

const categoryOptions = [
  { value: "AMENITY", label: "Amenidad" },
  { value: "LOCATION_STYLE", label: "Ubicacion" },
  { value: "EXPERIENCE_STYLE", label: "Experiencia" },
  { value: "TRAVEL_TYPE", label: "Tipo de viaje" },
  { value: "SERVICE_LEVEL", label: "Nivel de servicio" },
  { value: "INCLUDED", label: "Incluido" },
  { value: "NOT_INCLUDED", label: "No incluido" },
  { value: "CONDITION", label: "Condicion" },
  { value: "OTHER", label: "Otro" },
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function toForm(feature: ProductFeature): FeatureForm {
  return {
    name: feature.name || "",
    description: feature.description || "",
    icon: feature.icon || "",
    category: feature.category || "",
    appliesTo: feature.appliesTo || "",
    active: feature.active,
  };
}

function FeatureAdminContent() {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [form, setForm] = useState<FeatureForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL_TYPES");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");

  async function fetchFeatures() {
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

      setFeatures(Array.isArray(data) ? data : []);
    } catch (loadError: any) {
      setError(loadError?.message || "Error cargando caracteristicas.");
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeatures();
  }, []);

  const filteredFeatures = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return features.filter((feature) => {
      const matchesType =
        typeFilter === "ALL_TYPES" || feature.appliesTo === typeFilter;
      const matchesStatus =
        statusFilter === "ALL_STATUS" ||
        (statusFilter === "ACTIVE" ? feature.active : !feature.active);
      const matchesSearch =
        !normalizedSearch ||
        feature.name.toLowerCase().includes(normalizedSearch) ||
        feature.slug.toLowerCase().includes(normalizedSearch);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [features, search, statusFilter, typeFilter]);

  function updateForm(key: keyof FeatureForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function startEdit(feature: ProductFeature) {
    setEditingId(feature.id);
    setForm(toForm(feature));
    setMessage("");
    setError("");
  }

  async function saveFeature() {
    if (!form.name.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    if (!form.appliesTo) {
      setError("Elige en que tipo de producto puede usarse esta caracteristica.");
      return;
    }

    if (!form.category) {
      setError("La categoria es requerida.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = getToken();
      const response = await fetch(
        apiUrl(editingId ? `/product-features/${editingId}` : "/product-features"),
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: form.name,
            description: form.description || undefined,
            icon: form.icon || undefined,
            category: form.category,
            appliesTo: form.appliesTo,
            active: form.active,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo guardar la caracteristica.");
      }

      setMessage(
        editingId
          ? "Caracteristica actualizada correctamente."
          : "Caracteristica creada correctamente."
      );
      setEditingId(data.id);
      await fetchFeatures();
    } catch (saveError: any) {
      setError(saveError?.message || "Error guardando caracteristica.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeature(feature: ProductFeature) {
    try {
      setError("");
      setMessage("");

      const token = getToken();
      const response = await fetch(apiUrl(`/product-features/${feature.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: !feature.active }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo cambiar el estado.");
      }

      setMessage(feature.active ? "Caracteristica desactivada." : "Caracteristica activada.");
      await fetchFeatures();
    } catch (toggleError: any) {
      setError(toggleError?.message || "Error cambiando estado.");
    }
  }

  async function removeFeature(feature: ProductFeature) {
    const confirmed = window.confirm(
      `Esta accion desactivara "${feature.name}" y conservara su historial.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const token = getToken();
      const response = await fetch(apiUrl(`/product-features/${feature.id}`), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo eliminar la caracteristica.");
      }

      setMessage("Caracteristica eliminada de la vista publica.");
      await fetchFeatures();
    } catch (removeError: any) {
      setError(removeError?.message || "Error eliminando caracteristica.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Catalogo filtrable
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
              Caracteristicas
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Gestiona los filtros reutilizables para alojamientos, experiencias
              y paquetes sin mezclar tipos de producto.
            </p>
          </div>

          <Button
            type="button"
            onClick={startCreate}
            className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
          >
            <Plus size={18} className="mr-2" />
            Nueva caracteristica
          </Button>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl border p-4 text-sm shadow-sm ${
              error
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-[#D4AF37]/20 bg-white text-[#0D2B52]"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre o slug"
                    className="pl-10"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL_TYPES">Todos los tipos</option>
                  {appliesToOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">Activas</option>
                  <option value="INACTIVE">Inactivas</option>
                  <option value="ALL_STATUS">Todas</option>
                </select>
              </CardContent>
            </Card>

            {loading ? (
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
                Cargando caracteristicas...
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
                No hay caracteristicas para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredFeatures.map((feature) => (
                  <Card
                    key={feature.id}
                    className="rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm"
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <FeatureBadge value={feature.appliesTo} kind="type" />
                        <FeatureBadge value={feature.category} kind="category" />
                        <FeatureBadge value={String(feature.active)} kind="status" />
                      </div>

                      <div>
                        <h2 className="text-xl font-semibold text-[#0D2B52]">
                          {feature.name}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          {feature.slug}
                        </p>
                        {feature.description && (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                            {feature.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4AF37]/15 pt-4">
                        <Badge variant="outline" className="rounded-md">
                          {feature._count?.assignments || 0} asignaciones
                        </Badge>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => startEdit(feature)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => toggleFeature(feature)}
                          >
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            {feature.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => removeFeature(feature)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  {editingId ? "Editar caracteristica" : "Nueva caracteristica"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Elige en que tipo de producto puede usarse esta caracteristica.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Nombre"
                />
                <Textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Descripcion"
                  className="min-h-24"
                />
                <Input
                  value={form.icon}
                  onChange={(event) => updateForm("icon", event.target.value)}
                  placeholder="Icono opcional"
                />
                <select
                  value={form.appliesTo}
                  onChange={(event) => updateForm("appliesTo", event.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona tipo de producto</option>
                  {appliesToOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona categoria</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => updateForm("active", event.target.checked)}
                  />
                  Caracteristica activa
                </label>

                <div className="rounded-xl bg-[#F8F6F2] p-4 text-sm leading-6 text-slate-500">
                  <strong className="text-[#0D2B52]">Vista previa:</strong>{" "}
                  {form.appliesTo ? productTypeLabel(form.appliesTo) : "Sin tipo"} ·{" "}
                  {form.category ? featureCategoryLabel(form.category) : "Sin categoria"}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#D4AF37]/20 pt-5 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCreate}
                  className="rounded-xl"
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  onClick={saveFeature}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminCaracteristicasPage() {
  return (
    <AdminRoleGate
      allow={["SUPERADMIN"]}
      fallback={
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-xl rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
              Acceso restringido
            </p>
            <h1 className="mt-3 text-2xl font-bold text-[#0D2B52]">
              Esta seccion es solo para Super Admin
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Las caracteristicas filtrables afectan la navegacion publica y
              solo pueden ser administradas por Super Admin.
            </p>
          </div>
        </div>
      }
    >
      <FeatureAdminContent />
    </AdminRoleGate>
  );
}
