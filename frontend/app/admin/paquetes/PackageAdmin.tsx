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
  emptyComponent,
  emptyExtraForm,
  emptyForm,
  packageWizardSteps,
  toForm,
  type ExtraForm,
  type ExtraService,
  type PackageComponent,
  type PackageForm,
  type PackageFormUpdate,
  type PackageItem,
  type PackageWizardStep,
} from "./package-form-model";
import { PackageList } from "./PackageList";
import PackageWizard from "./PackageWizard";

export default function AdminPaquetesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
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
  const [activeStep, setActiveStep] =
    useState<PackageWizardStep>("basic");
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
  const wizardSteps = packageWizardSteps;
  const activeStepIndex = wizardSteps.findIndex(
    (step) => step.key === activeStep
  );
  const isLastStep = activeStepIndex === wizardSteps.length - 1;

  function parseOptionalJson(value: string) {
    const cleanValue = value.trim();
    if (!cleanValue) return undefined;

    try {
      return JSON.parse(cleanValue);
    } catch {
      throw new Error("Las preguntas frecuentes deben tener formato JSON valido.");
    }
  }

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

  useEffect(() => {
    if (!formMode) return;

    if (isCreateRoute) {
      startCreate();
      return;
    }

    if (!isEditRoute || !routeEditId) return;

    let cancelled = false;

    async function loadPackageForEdit() {
      try {
        setLoading(true);
        setMessage("");

        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl(`/packages/admin/${routeEditId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "No se pudo cargar el paquete.");
        }

        if (!cancelled) {
          startEdit(data);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessage(error?.message || "Error cargando paquete.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPackageForEdit();

    return () => {
      cancelled = true;
    };
  }, [formMode, isCreateRoute, isEditRoute, routeEditId]);

  const updateForm: PackageFormUpdate = (key, value) => {
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
    setDestinationIds([]);
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
    setDestinationIds([]);
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
      let parsedFaq: unknown;

      try {
        parsedFaq = parseOptionalJson(form.faq);
      } catch (error: any) {
        setActiveStep("pricing");
        setWizardError(error?.message || "FAQ invalida.");
        setMessage(error?.message || "FAQ invalida.");
        return;
      }

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
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        seoContent: form.seoContent || undefined,
        faq: parsedFaq,
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
            location: component.location || undefined,
            recommendations: component.recommendations || undefined,
            sortOrder: component.sortOrder ?? index,
            active: component.active !== false,
            translations: component.translations || {},
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
        await saveProductDestinations("PACKAGE", data.id, destinationIds);
      } catch (featureError: any) {
        setMessage(
          `Paquete guardado, pero no se pudieron guardar sus características: ${
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
      if (formMode) {
        router.push("/admin/paquetes");
      }
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
              {formMode
                ? editingId
                  ? "Editar paquete"
                  : "Crear nuevo paquete"
                : "Gestión de paquetes"}
            </h1>
            <p className="mt-2 text-slate-500">
              {formMode
                ? "Completa el wizard amplio con la información propia del paquete."
                : "Administra paquetes premium independientes para reservas asistidas."}
            </p>
          </div>

          {canManage && !formMode && (
            <Button
              asChild
              className="h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              <Link href="/admin/paquetes/crear">
                <Plus size={18} className="mr-2" />
                Nuevo paquete
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
            <PackageList
              packages={packages}
              loading={loading}
              canManage={canManage}
              onToggleActive={toggleActive}
            />
          )}

          {formMode && (
            <PackageWizard
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
              addComponent={addComponent}
              updateComponent={updateComponent}
              removeComponent={removeComponent}
              moveComponent={moveComponent}
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
              onCancel={() => router.push("/admin/paquetes")}
              onSave={savePackage}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
