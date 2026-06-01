"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Edit3, Eye, MapPin, Plus, Save, ToggleLeft, Users } from "lucide-react";

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

type Experience = {
  id: number;
  title: string;
  slug?: string | null;
  shortDescription: string;
  description: string;
  location: string;
  duration: string;
  maxGuests: number;
  basePrice: number;
  category: string;
  mainImage?: string | null;
  active: boolean;
  policies?: string | null;
  recommendations?: string | null;
  images?: AdminMediaItem[];
};

type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
  experienceId?: number | null;
};

type ExperienceForm = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  location: string;
  duration: string;
  maxGuests: string;
  basePrice: string;
  category: string;
  mainImage: string;
  policies: string;
  recommendations: string;
  images: AdminMediaItem[];
  active: boolean;
};

type ExtraForm = {
  name: string;
  description: string;
  price: string;
};

const emptyForm: ExperienceForm = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  location: "",
  duration: "",
  maxGuests: "1",
  basePrice: "0",
  category: "VIP",
  mainImage: "",
  policies: "",
  recommendations: "",
  images: [],
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

function previewImage(experience: Experience) {
  const images = (experience.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    experience.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    ""
  );
}

function toForm(experience: Experience): ExperienceForm {
  return {
    title: experience.title || "",
    slug: experience.slug || "",
    shortDescription: experience.shortDescription || "",
    description: experience.description || "",
    location: experience.location || "",
    duration: experience.duration || "",
    maxGuests: String(experience.maxGuests || 1),
    basePrice: String(experience.basePrice || 0),
    category: experience.category || "VIP",
    mainImage: experience.mainImage || "",
    policies: experience.policies || "",
    recommendations: experience.recommendations || "",
    images: experience.images || [],
    active: Boolean(experience.active),
  };
}

export default function AdminExperienciasPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [form, setForm] = useState<ExperienceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [extraForm, setExtraForm] = useState<ExtraForm>(emptyExtraForm);
  const [extraSaving, setExtraSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<
    "basic" | "media" | "features" | "pricing" | "premium" | "review"
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
        description: "Filtros publicos de experiencias.",
      },
      {
        key: "pricing",
        label: "Precios y condiciones",
        description: "Tarifa, politicas y recomendaciones.",
      },
      {
        key: "premium",
        label: "Servicios premium",
        description: "Complementos opcionales.",
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

  async function fetchExperiences() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/experiences/admin/all"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar experiencias.");
        return;
      }

      setExperiences(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando experiencias.");
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

    fetchExperiences();
  }, []);

  function updateForm(
    key: keyof ExperienceForm,
    value: string | boolean | AdminMediaItem[]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateStep(step = activeStep) {
    if (step === "basic") {
      if (!form.title.trim()) return "El titulo de la experiencia es obligatorio.";
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

  async function fetchExperienceExtras(experienceId: number) {
    try {
      const res = await fetch(apiUrl(`/extras/experience/${experienceId}`));
      const data = await res.json();

      setExtras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setExtras([]);
    }
  }

  function startEdit(experience: Experience) {
    setEditingId(experience.id);
    setForm(toForm(experience));
    setFeatureIds([]);
    fetchFeatureAssignments("EXPERIENCE", experience.id)
      .then((assignments) =>
        setFeatureIds(assignments.map((item: any) => Number(item.featureId)))
      )
      .catch(() => setFeatureIds([]));
    fetchExperienceExtras(experience.id);
    setActiveStep("basic");
    setWizardError("");
    setMessage("");
  }

  async function saveExperience() {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar experiencias.");
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
        location: form.location,
        duration: form.duration,
        maxGuests: Number(form.maxGuests || 1),
        basePrice: Number(form.basePrice || 0),
        category: form.category,
        mainImage: form.mainImage || undefined,
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
        active: form.active,
      };

      const res = await fetch(
        apiUrl(editingId ? `/experiences/${editingId}` : "/experiences"),
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
        setMessage(data.message || "No se pudo guardar la experiencia.");
        return;
      }

      setMessage(
        editingId
          ? "Experiencia actualizada correctamente."
          : "Experiencia creada correctamente."
      );
      setEditingId(data.id);
      try {
        await saveFeatureAssignments("EXPERIENCE", data.id, featureIds);
      } catch (featureError: any) {
        setMessage(
          `Experiencia guardada, pero no se pudieron guardar sus caracteristicas: ${
            featureError?.message || "error desconocido"
          }`
        );
      }
      await fetchExperienceExtras(data.id);
      await fetchExperiences();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando experiencia.");
    } finally {
      setSaving(false);
    }
  }

  async function saveExtra() {
    if (!canManage || !editingId) {
      setMessage("Primero guarda o selecciona una experiencia.");
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
          experienceId: editingId,
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
      await fetchExperienceExtras(editingId);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando servicio premium.");
    } finally {
      setExtraSaving(false);
    }
  }

  async function toggleExtra(extra: ExtraService) {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar experiencias.");
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
        await fetchExperienceExtras(editingId);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión actualizando servicio premium.");
    }
  }

  async function toggleActive(experience: Experience) {
    if (!canManage) {
      setMessage("Tu rol solo permite consultar experiencias.");
      return;
    }

    try {
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/experiences/${experience.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: !experience.active }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cambiar el estado.");
        return;
      }

      setMessage("Estado actualizado.");
      await fetchExperiences();
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
              Catálogo de experiencias
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
              Gestión de experiencias
            </h1>
            <p className="mt-2 text-slate-500">
              Administra experiencias privadas para el flujo de solicitud asistida.
            </p>
          </div>

          {canManage && (
            <Button
              type="button"
              onClick={startCreate}
              className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              <Plus size={18} className="mr-2" />
              Nueva experiencia
            </Button>
          )}
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
                Cargando experiencias...
              </div>
            ) : experiences.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
                No hay experiencias creadas todavía.
              </div>
            ) : (
              experiences.map((experience) => (
                <Card
                  key={experience.id}
                  className="overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm"
                >
                  <CardContent className="grid gap-0 p-0 md:grid-cols-[210px_1fr]">
                    <div className="relative h-56 bg-slate-200 md:h-auto">
                      {previewImage(experience) ? (
                        <img
                          src={previewImage(experience)}
                          alt={experience.title}
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
                            experience.active
                              ? "rounded-md bg-[#0D2B52] hover:bg-[#0D2B52]"
                              : "rounded-md bg-slate-400 hover:bg-slate-400"
                          }
                        >
                          {experience.active ? "Activa" : "Inactiva"}
                        </Badge>
                        <Badge variant="outline" className="rounded-md">
                          {experience.category}
                        </Badge>
                      </div>

                      <div>
                        <h2 className="text-2xl font-semibold text-[#0D2B52]">
                          {experience.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {experience.shortDescription}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#B48A5A]" />
                          {experience.location}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#B48A5A]" />
                          {experience.duration}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#B48A5A]" />
                          {experience.maxGuests}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xl font-semibold text-[#B48A5A]">
                          {money(experience.basePrice)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {canManage && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => startEdit(experience)}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => toggleActive(experience)}
                              >
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                {experience.active ? "Desactivar" : "Activar"}
                              </Button>
                            </>
                          )}
                          <a
                            href={`/experiencias/${experience.id}`}
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
                    ? "Editar experiencia"
                    : canManage
                      ? "Nueva experiencia"
                      : "Consulta de experiencias"}
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
                  <Input
                    placeholder="Titulo"
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    disabled={!canManage}
                  />
                  <Input
                    placeholder="Slug opcional"
                    value={form.slug}
                    onChange={(event) => updateForm("slug", event.target.value)}
                    disabled={!canManage}
                  />
                  <Textarea
                    placeholder="Descripcion corta"
                    value={form.shortDescription}
                    onChange={(event) =>
                      updateForm("shortDescription", event.target.value)
                    }
                    disabled={!canManage}
                  />
                  <Textarea
                    placeholder="Descripcion completa"
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    disabled={!canManage}
                    className="min-h-28"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Ubicacion"
                      value={form.location}
                      onChange={(event) =>
                        updateForm("location", event.target.value)
                      }
                      disabled={!canManage}
                    />
                    <Input
                      placeholder="Duracion"
                      value={form.duration}
                      onChange={(event) =>
                        updateForm("duration", event.target.value)
                      }
                      disabled={!canManage}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Capacidad"
                      value={form.maxGuests}
                      onChange={(event) =>
                        updateForm("maxGuests", event.target.value)
                      }
                      disabled={!canManage}
                    />
                    <Input
                      placeholder="Categoria"
                      value={form.category}
                      onChange={(event) =>
                        updateForm("category", event.target.value)
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 p-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        updateForm("active", event.target.checked)
                      }
                      disabled={!canManage}
                    />
                    Publicar experiencia activa
                  </label>
                </div>
              )}

              {activeStep === "media" && (
                <div className="space-y-4">
                  <Input
                    placeholder="Imagen principal URL"
                    value={form.mainImage}
                    onChange={(event) =>
                      updateForm("mainImage", event.target.value)
                    }
                    disabled={!canManage}
                  />
                  <MediaGalleryEditor
                    value={form.images}
                    onChange={(images) => updateForm("images", images)}
                    disabled={!canManage}
                  />
                </div>
              )}

              {activeStep === "features" && (
                <ProductFeatureSelector
                  productType="EXPERIENCE"
                  productId={editingId}
                  selectedFeatureIds={featureIds}
                  onChange={setFeatureIds}
                  disabled={!canManage}
                />
              )}

              {activeStep === "pricing" && (
                <div className="space-y-4">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Precio base"
                    value={form.basePrice}
                    onChange={(event) =>
                      updateForm("basePrice", event.target.value)
                    }
                    disabled={!canManage}
                  />
                  <Textarea
                    placeholder="Politicas"
                    value={form.policies}
                    onChange={(event) =>
                      updateForm("policies", event.target.value)
                    }
                    disabled={!canManage}
                  />
                  <Textarea
                    placeholder="Recomendaciones"
                    value={form.recommendations}
                    onChange={(event) =>
                      updateForm("recommendations", event.target.value)
                    }
                    disabled={!canManage}
                  />
                </div>
              )}

              {activeStep === "premium" && (
              <div className="border-t border-[#D4AF37]/20 pt-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#0D2B52]">
                    Servicios premium
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Complementos opcionales para esta experiencia.
                  </p>
                </div>

                {!editingId ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D4AF37]/30 p-4 text-sm text-slate-500">
                    Guarda la experiencia para administrar sus servicios premium.
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
                    <p><strong>Experiencia:</strong> {form.title || "Sin titulo"}</p>
                    <p><strong>Ubicacion:</strong> {form.location || "Sin ubicacion"}</p>
                    <p><strong>Duracion:</strong> {form.duration || "Sin duracion"}</p>
                    <p><strong>Precio:</strong> {money(Number(form.basePrice || 0))}</p>
                    <p><strong>Capacidad:</strong> {form.maxGuests || "1"} personas</p>
                    <p><strong>Estado:</strong> {form.active ? "Activa" : "Inactiva"}</p>
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
                      onClick={saveExperience}
                      disabled={saving}
                      className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving
                        ? "Guardando..."
                        : editingId
                          ? "Guardar cambios"
                          : "Crear experiencia"}
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
