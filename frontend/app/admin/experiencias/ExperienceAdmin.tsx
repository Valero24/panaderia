"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { normalizeSeoSlug } from "@/lib/slug";
import {
  fetchFeatureAssignments,
  saveFeatureAssignments,
} from "@/components/admin/ProductFeatureSelector";
import { saveProductDestinations } from "@/components/admin/ProductDestinationSelector";
import {
  emptyExtraForm,
  emptyForm,
  experienceWizardSteps,
  toForm,
  type Experience,
  type ExperienceForm,
  type ExperienceFormUpdate,
  type ExperienceWizardStep,
  type ExtraForm,
  type ExtraService,
} from "./experience-form-model";
import { ExperienceList } from "./ExperienceList";
import ExperienceWizard from "./ExperienceWizard";

function parseOptionalJson(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  return JSON.parse(cleanValue);
}

export default function AdminExperienciasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
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
  const [activeStep, setActiveStep] =
    useState<ExperienceWizardStep>("basic");
  const [wizardError, setWizardError] = useState("");
  const [featureIds, setFeatureIds] = useState<number[]>([]);
  const [destinationIds, setDestinationIds] = useState<number[]>([]);
  const isCreateRoute = pathname?.endsWith("/crear");
  const isEditRoute = pathname?.endsWith("/editar");
  const formMode = Boolean(isCreateRoute || isEditRoute);
  const routeEditId = Number(params?.id || 0);

  const canManage = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [
    role,
  ]);
  const wizardSteps = experienceWizardSteps;
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

  useEffect(() => {
    if (!formMode) return;

    if (isCreateRoute) {
      startCreate();
      return;
    }

    if (!isEditRoute || !routeEditId) return;

    let cancelled = false;

    async function loadExperienceForEdit() {
      try {
        setLoading(true);
        setMessage("");

        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl(`/experiences/admin/${routeEditId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "No se pudo cargar la experiencia.");
        }

        if (!cancelled) {
          startEdit(data);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessage(error?.message || "Error cargando experiencia.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExperienceForEdit();

    return () => {
      cancelled = true;
    };
  }, [formMode, isCreateRoute, isEditRoute, routeEditId]);

  const updateForm: ExperienceFormUpdate = (key, value) => {
    setForm((current) => {
      if (key === "slug") {
        return {
          ...current,
          slug: normalizeSeoSlug(String(value)),
        };
      }

      if (key === "title" && typeof value === "string") {
        const currentAutoSlug = normalizeSeoSlug(current.title);
        const shouldSyncSlug =
          !current.slug.trim() || current.slug.trim() === currentAutoSlug;

        return {
          ...current,
          title: value,
          ...(shouldSyncSlug ? { slug: normalizeSeoSlug(value) } : {}),
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

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
    setDestinationIds([]);
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
    setDestinationIds([]);
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
      let parsedFaq = null;

      try {
        parsedFaq = parseOptionalJson(form.faq);
      } catch {
        setActiveStep("pricing");
        setWizardError("El campo de preguntas frecuentes debe ser JSON valido o quedar vacio.");
        setMessage("El campo de preguntas frecuentes debe ser JSON valido o quedar vacio.");
        return;
      }

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
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        seoContent: form.seoContent || undefined,
        itinerary: form.itinerary || undefined,
        included: form.included || undefined,
        notIncluded: form.notIncluded || undefined,
        meetingPoint: form.meetingPoint || undefined,
        durationDescription: form.durationDescription || undefined,
        schedule: form.schedule || undefined,
        conditions: form.conditions || undefined,
        faq: parsedFaq,
        experienceCategory: form.experienceCategory || undefined,
        translations: form.translations,
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
        await saveProductDestinations("EXPERIENCE", data.id, destinationIds);
      } catch (featureError: any) {
        setMessage(
          `Experiencia guardada, pero no se pudieron guardar sus características: ${
            featureError?.message || "error desconocido"
          }`
        );
      }
      await fetchExperienceExtras(data.id);
      await fetchExperiences();
      if (formMode) {
        router.push("/admin/experiencias");
      }
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
          translations: extraForm.translations,
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
              {formMode
                ? editingId
                  ? "Editar experiencia"
                  : "Crear nueva experiencia"
                : "Gestión de experiencias"}
            </h1>
            <p className="mt-2 text-slate-500">
              {formMode
                ? "Completa el wizard amplio con la información propia de la experiencia."
                : "Administra experiencias privadas para el flujo de solicitud asistida."}
            </p>
          </div>

          {canManage && !formMode && (
            <Button
              asChild
              className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              <Link href="/admin/experiencias/crear">
                <Plus size={18} className="mr-2" />
                Nueva experiencia
              </Link>
            </Button>
          )}
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6">
          {!formMode && (
            <ExperienceList
              experiences={experiences}
              loading={loading}
              canManage={canManage}
              onToggleActive={toggleActive}
            />
          )}

          {formMode && (
            <ExperienceWizard
              editingId={editingId}
              canManage={canManage}
              form={form}
              updateForm={updateForm}
              wizardSteps={wizardSteps}
              activeStep={activeStep}
              onStepChange={goToStep}
              wizardError={wizardError}
              featureIds={featureIds}
              setFeatureIds={setFeatureIds}
              destinationIds={destinationIds}
              setDestinationIds={setDestinationIds}
              extras={extras}
              extraForm={extraForm}
              setExtraForm={setExtraForm}
              extraSaving={extraSaving}
              saveExtra={saveExtra}
              toggleExtra={toggleExtra}
              activeStepIndex={activeStepIndex}
              isLastStep={isLastStep}
              goPrevious={goPrevious}
              goNext={goNext}
              onCancel={() => router.push("/admin/experiencias")}
              onSave={saveExperience}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
