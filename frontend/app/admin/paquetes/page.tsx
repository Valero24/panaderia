"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit3, Eye, MapPin, Plus, Save, Trash2, ToggleLeft, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";
import MediaGalleryEditor, {
  AdminMediaItem,
} from "@/components/admin/MediaGalleryEditor";
import ProductWizardProgress, {
  ProductWizardStep,
} from "@/components/admin/ProductWizardProgress";
import ProductFeatureSelector, {
  fetchFeatureAssignments,
  saveFeatureAssignments,
} from "@/components/admin/ProductFeatureSelector";

type PackageItem = {
  id: number;
  title: string;
  slug?: string | null;
  shortDescription: string;
  description: string;
  duration: string;
  location: string;
  maxGuests: number;
  basePrice: number;
  mainImage?: string | null;
  category: string;
  includes?: string | null;
  notIncludes?: string | null;
  itinerary?: string | null;
  policies?: string | null;
  recommendations?: string | null;
  active: boolean;
  images?: AdminMediaItem[];
  components?: PackageComponent[];
};

type PackageComponent = {
  id?: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  includes?: string | null;
  excludes?: string | null;
  conditions?: string | null;
  duration?: string | null;
  recommendations?: string | null;
  sortOrder?: number;
  active?: boolean;
};

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
  packageId?: number | null;
};

type PackageForm = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  duration: string;
  location: string;
  maxGuests: string;
  basePrice: string;
  mainImage: string;
  category: string;
  includes: string;
  notIncludes: string;
  itinerary: string;
  policies: string;
  recommendations: string;
  active: boolean;
  images: AdminMediaItem[];
  components: PackageComponent[];
};

type ExtraForm = {
  name: string;
  description: string;
  price: string;
};

const emptyForm: PackageForm = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  duration: "",
  location: "",
  maxGuests: "1",
  basePrice: "0",
  mainImage: "",
  category: "Signature",
  includes: "",
  notIncludes: "",
  itinerary: "",
  policies: "",
  recommendations: "",
  active: true,
  images: [],
  components: [],
};

const emptyComponent: PackageComponent = {
  title: "",
  shortDescription: "",
  description: "",
  includes: "",
  excludes: "",
  conditions: "",
  duration: "",
  recommendations: "",
  sortOrder: 0,
  active: true,
};

const emptyExtraForm: ExtraForm = {
  name: "",
  description: "",
  price: "0",
};

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

function previewImage(item: PackageItem) {
  const images = (item.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    item.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    ""
  );
}

function toForm(item: PackageItem): PackageForm {
  return {
    title: item.title || "",
    slug: item.slug || "",
    shortDescription: item.shortDescription || "",
    description: item.description || "",
    duration: item.duration || "",
    location: item.location || "",
    maxGuests: String(item.maxGuests || 1),
    basePrice: String(item.basePrice || 0),
    mainImage: item.mainImage || "",
    category: item.category || "Signature",
    includes: item.includes || "",
    notIncludes: item.notIncludes || "",
    itinerary: item.itinerary || "",
    policies: item.policies || "",
    recommendations: item.recommendations || "",
    active: Boolean(item.active),
    images: item.images || [],
    components: item.components || [],
  };
}

export default function AdminPaquetesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [extraForm, setExtraForm] = useState<ExtraForm>(emptyExtraForm);
  const [extraSaving, setExtraSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<
    "basic" | "media" | "features" | "pricing" | "premium" | "components" | "review"
  >("basic");
  const [wizardError, setWizardError] = useState("");
  const [featureIds, setFeatureIds] = useState<number[]>([]);

  const canManage = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [
    role,
  ]);
  const wizardSteps = useMemo<ProductWizardStep<typeof activeStep>[]>(
    () => [
      {
        key: "basic",
        label: "Informacion basica",
        description: "Titulo, ubicacion, duracion y capacidad.",
      },
      {
        key: "media",
        label: "Multimedia",
        description: "Imagen principal y galeria.",
      },
      {
        key: "features",
        label: "Caracteristicas",
        description: "Filtros publicos del paquete.",
      },
      {
        key: "pricing",
        label: "Precios y condiciones",
        description: "Tarifa, incluye, politicas y recomendaciones.",
      },
      {
        key: "premium",
        label: "Servicios premium",
        description: "Complementos opcionales.",
      },
      {
        key: "components",
        label: "Componentes",
        description: "Experiencias incluidas en el paquete.",
      },
      {
        key: "review",
        label: "Revision",
        description: "Resumen antes de guardar.",
      },
    ],
    []
  );
  const activeStepIndex = wizardSteps.findIndex(
    (step) => step.key === activeStep
  );
  const isLastStep = activeStepIndex === wizardSteps.length - 1;

  async function fetchPackages() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/packages/admin/all"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar paquetes.");
        return;
      }

      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando paquetes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const rawUser = localStorage.getItem("user");

    try {
      const user = rawUser ? JSON.parse(rawUser) : null;
      setRole(user?.role || "");
    } catch {
      setRole("");
    }

    fetchPackages();
  }, []);

  function updateForm(
    key: keyof PackageForm,
    value: string | boolean | AdminMediaItem[] | PackageComponent[]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateStep(step = activeStep) {
    if (step === "basic") {
      if (!form.title.trim()) return "El titulo del paquete es obligatorio.";
      if (!form.shortDescription.trim()) {
        return "La descripcion corta es obligatoria.";
      }
      if (Number(form.maxGuests || 0) < 1) {
        return "La capacidad debe ser mayor a cero.";
      }
    }

    if (step === "pricing" && Number(form.basePrice || 0) < 1) {
      return "El precio base debe ser mayor a cero.";
    }

    return "";
  }

  function goToStep(step: typeof activeStep) {
    setWizardError("");
    setActiveStep(step);
  }

  function goNext() {
    const validationMessage = validateStep();
    if (validationMessage) {
      setWizardError(validationMessage);
      return;
    }

    const next = wizardSteps[activeStepIndex + 1];
    if (next) {
      setWizardError("");
      setActiveStep(next.key);
    }
  }

  function goPrevious() {
    const previous = wizardSteps[activeStepIndex - 1];
    if (previous) {
      setWizardError("");
      setActiveStep(previous.key);
    }
  }

  function addComponent() {
    setForm((current) => ({
      ...current,
      components: [
        ...current.components,
        {
          ...emptyComponent,
          sortOrder: current.components.length,
        },
      ],
    }));
  }

  function updateComponent(
    index: number,
    patch: Partial<PackageComponent>
  ) {
    setForm((current) => ({
      ...current,
      components: current.components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component
      ),
    }));
  }

  function removeComponent(index: number) {
    setForm((current) => ({
      ...current,
      components: current.components
        .filter((_, componentIndex) => componentIndex !== index)
        .map((component, componentIndex) => ({
          ...component,
          sortOrder: component.sortOrder ?? componentIndex,
        })),
    }));
  }

  function moveComponent(index: number, step: number) {
    setForm((current) => {
      const target = index + step;
      if (target < 0 || target >= current.components.length) return current;

      const next = [...current.components];
      const [component] = next.splice(index, 1);
      next.splice(target, 0, component);

      return {
        ...current,
        components: next.map((item, itemIndex) => ({
          ...item,
          sortOrder: itemIndex,
        })),
      };
    });
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setExtras([]);
    setExtraForm(emptyExtraForm);
    setFeatureIds([]);
    setActiveStep("basic");
    setWizardError("");
    setMessage("");
  }

  async function fetchPackageExtras(packageId: number) {
    try {
      const res = await fetch(apiUrl(`/extras/package/${packageId}`));
      const data = await res.json();

      setExtras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setExtras([]);
    }
  }

  function startEdit(item: PackageItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setFeatureIds([]);
    fetchFeatureAssignments("PACKAGE", item.id)
      .then((assignments) =>
        setFeatureIds(assignments.map((assignment: any) => Number(assignment.featureId)))
      )
      .catch(() => setFeatureIds([]));
    fetchPackageExtras(item.id);
    setActiveStep("basic");
    setWizardError("");
    setMessage("");
  }

  async function savePackage() {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar paquetes.");
      return;
    }

    const validationMessage = validateStep("basic") || validateStep("pricing");
    if (validationMessage) {
      setActiveStep(validationMessage.includes("precio") ? "pricing" : "basic");
      setWizardError(validationMessage);
      setMessage(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        shortDescription: form.shortDescription,
        description: form.description,
        duration: form.duration,
        location: form.location,
        maxGuests: Number(form.maxGuests || 1),
        basePrice: Number(form.basePrice || 0),
        mainImage: form.mainImage || undefined,
        category: form.category,
        includes: form.includes || undefined,
        notIncludes: form.notIncludes || undefined,
        itinerary: form.itinerary || undefined,
        policies: form.policies || undefined,
        recommendations: form.recommendations || undefined,
        images: form.images
          .filter((item) => item.url?.trim())
          .map((item, index) => ({
            url: item.url.trim(),
            mediaType: item.mediaType || "IMAGE",
            title: item.title || undefined,
            description: item.description || undefined,
            isPrimary: Boolean(item.isPrimary),
            active: item.active !== false,
            sortOrder: item.sortOrder ?? index,
          })),
        components: form.components
          .filter((component) => component.title?.trim())
          .map((component, index) => ({
            title: component.title.trim(),
            shortDescription: component.shortDescription || undefined,
            description: component.description || undefined,
            includes: component.includes || undefined,
            excludes: component.excludes || undefined,
            conditions: component.conditions || undefined,
            duration: component.duration || undefined,
            recommendations: component.recommendations || undefined,
            sortOrder: component.sortOrder ?? index,
            active: component.active !== false,
          })),
        active: form.active,
      };

      const res = await fetch(
        apiUrl(editingId ? `/packages/${editingId}` : "/packages"),
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar el paquete.");
        return;
      }

      setEditingId(data.id);
      try {
        await saveFeatureAssignments("PACKAGE", data.id, featureIds);
      } catch (featureError: any) {
        setMessage(
          `Paquete guardado, pero no se pudieron guardar sus caracteristicas: ${
            featureError?.message || "error desconocido"
          }`
        );
      }
      await fetchPackageExtras(data.id);
      setMessage(
        editingId
          ? "Paquete actualizado correctamente."
          : "Paquete creado correctamente."
      );
      await fetchPackages();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando paquete.");
    } finally {
      setSaving(false);
    }
  }

  async function saveExtra() {
    if (!canManage || !editingId) {
      setMessage("Primero guarda o selecciona un paquete.");
      return;
    }

    if (!extraForm.name.trim()) {
      setMessage("El nombre del servicio premium es requerido.");
      return;
    }

    try {
      setExtraSaving(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/extras"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: extraForm.name,
          description: extraForm.description || undefined,
          price: Number(extraForm.price || 0),
          packageId: editingId,
          active: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo crear el servicio premium.");
        return;
      }

      setExtraForm(emptyExtraForm);
      setMessage("Servicio premium creado.");
      await fetchPackageExtras(editingId);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando servicio premium.");
    } finally {
      setExtraSaving(false);
    }
  }

  async function toggleExtra(extra: ExtraService) {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar paquetes.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/extras/${extra.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: !extra.active }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo actualizar el servicio.");
        return;
      }

      setMessage("Servicio premium actualizado.");
      if (editingId) {
        await fetchPackageExtras(editingId);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión actualizando servicio premium.");
    }
  }

  async function toggleActive(item: PackageItem) {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar paquetes.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/packages/${item.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cambiar el estado.");
        return;
      }

      setMessage("Estado actualizado.");
      await fetchPackages();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión actualizando estado.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Signature collection
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
              Gestión de paquetes
            </h1>
            <p className="mt-2 text-slate-500">
              Administra paquetes premium independientes para reservas asistidas.
            </p>
          </div>

          {canManage && (
            <Button
              type="button"
              onClick={startCreate}
              className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              <Plus size={18} className="mr-2" />
              Nuevo paquete
            </Button>
          )}
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(520px,640px)]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
                Cargando paquetes...
              </div>
            ) : packages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
                No hay paquetes creados todavía.
              </div>
            ) : (
              packages.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm"
                >
                  <CardContent className="grid gap-0 p-0 md:grid-cols-[210px_1fr]">
                    <div className="relative h-56 bg-slate-200 md:h-auto">
                      {previewImage(item) ? (
                        <img
                          src={previewImage(item)}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="space-y-5 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            item.active
                              ? "rounded-md bg-[#0D2B52] hover:bg-[#0D2B52]"
                              : "rounded-md bg-slate-400 hover:bg-slate-400"
                          }
                        >
                          {item.active ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline" className="rounded-md">
                          {item.category}
                        </Badge>
                      </div>

                      <div>
                        <h2 className="text-2xl font-semibold text-[#0D2B52]">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {item.shortDescription}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#B48A5A]" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[#B48A5A]" />
                          {item.duration}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#B48A5A]" />
                          {item.maxGuests}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xl font-semibold text-[#B48A5A]">
                          {money(item.basePrice)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {canManage && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => startEdit(item)}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => toggleActive(item)}
                              >
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                {item.active ? "Desactivar" : "Activar"}
                              </Button>
                            </>
                          )}
                          <a
                            href={`/paquetes/${item.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  {editingId
                    ? "Editar paquete"
                    : canManage
                      ? "Nuevo paquete"
                      : "Consulta de paquetes"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {canManage
                    ? "Estos datos alimentan el catalogo publico."
                    : "Tu rol permite consulta, no modificacion."}
                </p>
              </div>

              <ProductWizardProgress
                steps={wizardSteps}
                activeKey={activeStep}
                onChange={goToStep}
              />

              {wizardError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {wizardError}
                </div>
              )}

              {activeStep === "basic" && (
                <div className="space-y-4">
                  <Input placeholder="Titulo" value={form.title} onChange={(e) => updateForm("title", e.target.value)} disabled={!canManage} />
                  <Input placeholder="Slug opcional" value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Descripcion corta" value={form.shortDescription} onChange={(e) => updateForm("shortDescription", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Descripcion completa" value={form.description} onChange={(e) => updateForm("description", e.target.value)} disabled={!canManage} className="min-h-28" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="Duracion" value={form.duration} onChange={(e) => updateForm("duration", e.target.value)} disabled={!canManage} />
                    <Input placeholder="Ubicacion" value={form.location} onChange={(e) => updateForm("location", e.target.value)} disabled={!canManage} />
                    <Input type="number" min={1} placeholder="Capacidad" value={form.maxGuests} onChange={(e) => updateForm("maxGuests", e.target.value)} disabled={!canManage} />
                    <Input placeholder="Categoria" value={form.category} onChange={(e) => updateForm("category", e.target.value)} disabled={!canManage} />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => updateForm("active", event.target.checked)}
                      disabled={!canManage}
                    />
                    Publicar paquete activo
                  </label>
                </div>
              )}

              {activeStep === "media" && (
                <div className="space-y-4">
                  <Input placeholder="Imagen principal URL" value={form.mainImage} onChange={(e) => updateForm("mainImage", e.target.value)} disabled={!canManage} />
                  <MediaGalleryEditor
                    value={form.images}
                    onChange={(images) => updateForm("images", images)}
                    disabled={!canManage}
                  />
                </div>
              )}

              {activeStep === "features" && (
                <ProductFeatureSelector
                  productType="PACKAGE"
                  productId={editingId}
                  selectedFeatureIds={featureIds}
                  onChange={setFeatureIds}
                  disabled={!canManage}
                />
              )}

              {activeStep === "pricing" && (
                <div className="space-y-4">
                  <Input type="number" min={0} placeholder="Precio base" value={form.basePrice} onChange={(e) => updateForm("basePrice", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Incluye" value={form.includes} onChange={(e) => updateForm("includes", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="No incluye" value={form.notIncludes} onChange={(e) => updateForm("notIncludes", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Itinerario" value={form.itinerary} onChange={(e) => updateForm("itinerary", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Politicas" value={form.policies} onChange={(e) => updateForm("policies", e.target.value)} disabled={!canManage} />
                  <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={(e) => updateForm("recommendations", e.target.value)} disabled={!canManage} />
                </div>
              )}

              {activeStep === "components" && (
              <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0D2B52]">
                      Componentes del paquete
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Describe las experiencias o actividades que conforman este
                      paquete. Se mostrarán como tarjetas en la página pública.
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      onClick={addComponent}
                      variant="outline"
                      className="shrink-0 rounded-xl bg-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar componente
                    </Button>
                  )}
                </div>

                {form.components.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/35 bg-white p-5 text-center text-sm text-slate-500">
                    Sin componentes. Puedes agregar actividades como paseo
                    nocturno, chiva rumbera o pasadía en bote privado.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {form.components.map((component, index) => (
                      <div
                        key={component.id || index}
                        className="min-w-0 rounded-2xl border border-[#D4AF37]/15 bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-semibold text-[#0D2B52]">
                            Componente #{index + 1}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveComponent(index, -1)}
                              disabled={!canManage || index === 0}
                              className="rounded-xl"
                            >
                              Subir
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveComponent(index, 1)}
                              disabled={
                                !canManage ||
                                index === form.components.length - 1
                              }
                              className="rounded-xl"
                            >
                              Bajar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeComponent(index)}
                              disabled={!canManage}
                              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                        </div>

                        <div className="min-w-0 space-y-3">
                          <Input
                            placeholder="Título del componente"
                            value={component.title}
                            onChange={(event) =>
                              updateComponent(index, {
                                title: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="w-full min-w-0"
                          />
                          <Textarea
                            placeholder="Descripción corta"
                            value={component.shortDescription || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                shortDescription: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-24 w-full min-w-0"
                          />
                          <Textarea
                            placeholder="Descripción completa"
                            value={component.description || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                description: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-32 w-full min-w-0"
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              placeholder="Duración"
                              value={component.duration || ""}
                              onChange={(event) =>
                                updateComponent(index, {
                                  duration: event.target.value,
                                })
                              }
                              disabled={!canManage}
                              className="w-full min-w-0"
                            />
                            <Input
                              type="number"
                              placeholder="Orden"
                              value={component.sortOrder ?? index}
                              onChange={(event) =>
                                updateComponent(index, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                              disabled={!canManage}
                              className="w-full min-w-0"
                            />
                          </div>
                          <Textarea
                            placeholder="Qué incluye"
                            value={component.includes || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                includes: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-24 w-full min-w-0"
                          />
                          <Textarea
                            placeholder="Qué no incluye"
                            value={component.excludes || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                excludes: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-24 w-full min-w-0"
                          />
                          <Textarea
                            placeholder="Condiciones"
                            value={component.conditions || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                conditions: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-24 w-full min-w-0"
                          />
                          <Textarea
                            placeholder="Recomendaciones"
                            value={component.recommendations || ""}
                            onChange={(event) =>
                              updateComponent(index, {
                                recommendations: event.target.value,
                              })
                            }
                            disabled={!canManage}
                            className="min-h-24 w-full min-w-0"
                          />
                          <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-3 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={component.active !== false}
                              onChange={(event) =>
                                updateComponent(index, {
                                  active: event.target.checked,
                                })
                              }
                              disabled={!canManage}
                            />
                            Componente activo
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}

              {activeStep === "premium" && (
              <div className="border-t border-[#D4AF37]/20 pt-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#0D2B52]">
                    Servicios premium
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Complementos opcionales para este paquete.
                  </p>
                </div>

                {!editingId ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/30 p-4 text-sm text-slate-500">
                    Guarda el paquete para administrar sus servicios premium.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {canManage && (
                      <div className="space-y-3 rounded-xl bg-[#F8F6F2] p-4">
                        <Input
                          placeholder="Nombre del servicio"
                          value={extraForm.name}
                          onChange={(event) =>
                            setExtraForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                        <Textarea
                          placeholder="Descripcion"
                          value={extraForm.description}
                          onChange={(event) =>
                            setExtraForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Precio"
                          value={extraForm.price}
                          onChange={(event) =>
                            setExtraForm((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          onClick={saveExtra}
                          disabled={extraSaving}
                          className="w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                        >
                          {extraSaving ? "Guardando..." : "Agregar servicio"}
                        </Button>
                      </div>
                    )}

                    {extras.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D4AF37]/30 p-4 text-sm text-slate-500">
                        Sin servicios premium asociados.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {extras.map((extra) => (
                          <div
                            key={extra.id}
                            className="rounded-xl border border-[#D4AF37]/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold text-[#0D2B52]">
                                    {extra.name}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className="rounded-md"
                                  >
                                    {extra.active ? "Activo" : "Inactivo"}
                                  </Badge>
                                </div>
                                {extra.description && (
                                  <p className="mt-1 text-sm text-slate-500">
                                    {extra.description}
                                  </p>
                                )}
                                <p className="mt-2 font-semibold text-[#B48A5A]">
                                  {money(extra.price)}
                                </p>
                              </div>
                              {canManage && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => toggleExtra(extra)}
                                >
                                  {extra.active ? "Desactivar" : "Activar"}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {activeStep === "review" && (
                <div className="space-y-4 rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4">
                  <h3 className="text-xl font-semibold text-[#0D2B52]">
                    Revision final
                  </h3>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p><strong>Paquete:</strong> {form.title || "Sin titulo"}</p>
                    <p><strong>Ubicacion:</strong> {form.location || "Sin ubicacion"}</p>
                    <p><strong>Duracion:</strong> {form.duration || "Sin duracion"}</p>
                    <p><strong>Precio:</strong> {money(Number(form.basePrice || 0))}</p>
                    <p><strong>Capacidad:</strong> {form.maxGuests || "1"} personas</p>
                    <p><strong>Componentes:</strong> {form.components.filter((component) => component.title?.trim()).length}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[#D4AF37]/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrevious}
                  disabled={activeStepIndex <= 0}
                  className="rounded-xl"
                >
                  Anterior
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCreate}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                    >
                      Siguiente
                    </Button>
                  ) : canManage ? (
                    <Button
                      type="button"
                      onClick={savePackage}
                      disabled={saving}
                      className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving
                        ? "Guardando..."
                        : editingId
                          ? "Guardar cambios"
                          : "Crear paquete"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
