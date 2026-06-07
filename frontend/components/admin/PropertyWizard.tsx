"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { normalizeSeoSlug } from "@/lib/slug";
import ProductWizardProgress from "@/components/admin/ProductWizardProgress";
import {
  fetchFeatureAssignments,
  saveFeatureAssignments,
} from "@/components/admin/ProductFeatureSelector";
import PropertyBasicInfoStep from "@/components/admin/property-steps/PropertyBasicInfoStep";
import PropertyPricingStep from "@/components/admin/property-steps/PropertyPricingStep";
import {
  buildPropertyFormState,
  emptyPropertyForm,
  propertyWizardSteps,
  toNumber,
  type PropertyFormState,
  type PropertyFormStep,
} from "@/components/admin/property-form-model";

const sectionLoading = () => (
  <div className="rounded-[32px] border border-[#D4AF37]/20 bg-white p-10 text-sm font-medium text-slate-500 shadow-sm">
    Cargando sección...
  </div>
);

const PropertyMediaStep = dynamic(
  () => import("@/components/admin/property-steps/PropertyMediaStep"),
  { ssr: false, loading: sectionLoading }
);
const PropertyFeaturesStep = dynamic(
  () => import("@/components/admin/property-steps/PropertyFeaturesStep"),
  { ssr: false, loading: sectionLoading }
);
const PropertyTranslationsStep = dynamic(
  () => import("@/components/admin/property-steps/PropertyTranslationsStep"),
  { ssr: false, loading: sectionLoading }
);
const PropertyPremiumServicesStep = dynamic(
  () => import("@/components/admin/property-steps/PropertyPremiumServicesStep"),
  { ssr: false, loading: sectionLoading }
);
const PropertyReviewStep = dynamic(
  () => import("@/components/admin/property-steps/PropertyReviewStep"),
  { ssr: false, loading: sectionLoading }
);

type PropertyFormProps = {
  propertyId?: string | number;
};

function parseOptionalJson(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  return JSON.parse(cleanValue);
}

export default function PropertyForm({
  propertyId,
}: PropertyFormProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);
  const [loadingProperty, setLoadingProperty] =
    useState(Boolean(propertyId));
  const [loadError, setLoadError] =
    useState("");
  const [role, setRole] = useState("");

  const [activeTab, setActiveTab] =
    useState<PropertyFormStep>("basic");
  const [wizardError, setWizardError] =
    useState("");

  const [form, setForm] = useState<PropertyFormState>(
    emptyPropertyForm
  );

  const isEditMode = Boolean(propertyId);
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
    if (!propertyId) {
      setLoadingProperty(false);
      setLoadError("");
      return;
    }

    let cancelled = false;

    async function loadProperty() {
      try {
        setLoadingProperty(true);
        setLoadError("");

        const response = await fetch(
          apiUrl(`/properties/${propertyId}`),
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "La propiedad no existe."
              : "No se pudo cargar la propiedad."
          );
        }

        const property = await response.json();

        if (cancelled) return;

        const featureAssignments = await fetchFeatureAssignments(
          "PROPERTY",
          property.id
        ).catch(() => []);

        setForm(buildPropertyFormState(property, featureAssignments));
      } catch (error: any) {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "No se pudo cargar la propiedad."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProperty(false);
        }
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  //////////////////////////////////////////////////////
  // HELPERS
  //////////////////////////////////////////////////////

  function updateField(
    key: keyof typeof form,
    value: any
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "slug" ? normalizeSeoSlug(String(value)) : value,
    }));
  }

  const generatedSlug = useMemo(() => {
    return normalizeSeoSlug(form.slug || form.title);
  }, [form.title, form.slug]);

  function validateStep(step = activeTab) {
    if (step === "basic") {
      if (!form.title.trim()) return "El nombre del alojamiento es obligatorio.";
      if (!form.city.trim()) return "La ciudad es obligatoria.";
      if (toNumber(form.maxGuests) < 1 && toNumber(form.maxCapacity) < 1) {
        return "Define una capacidad valida para el alojamiento.";
      }
    }

    if (step === "pricing") {
      if (toNumber(form.pricePerNight) < 1 && toNumber(form.basePrice) < 1) {
        return "Define una tarifa base o precio por noche mayor a cero.";
      }
    }

    return "";
  }

  //////////////////////////////////////////////////////
  // SUBMIT
  //////////////////////////////////////////////////////

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!canManage) {
      alert("Tu rol no permite crear ni editar alojamientos.");
      return;
    }

    const validationMessage =
      validateStep("basic") || validateStep("pricing");

    if (validationMessage) {
      setWizardError(validationMessage);
      setActiveTab(validationMessage.includes("tarifa") ? "pricing" : "basic");
      return;
    }

    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      if (!token) {
        alert(
          "Sesión expirada. Inicia sesión nuevamente."
        );

        setLoading(false);
        return;
      }

      let parsedFaq = null;

      try {
        parsedFaq = parseOptionalJson(form.faq);
      } catch {
        setWizardError(
          "El campo FAQ debe ser JSON valido o quedar vacio."
        );
        setActiveTab("pricing");
        setLoading(false);
        return;
      }

      const payload = {
        //////////////////////////////////////////////////////
        // OVERVIEW
        //////////////////////////////////////////////////////

        title: form.title,
        slug: generatedSlug,

        city: form.city,
        area: form.area,
        address: form.address || null,

        description: form.description,

        status: form.status,

        //////////////////////////////////////////////////////
        // PRICING
        //////////////////////////////////////////////////////

        pricePerNight: toNumber(
          form.pricePerNight
        ),

        basePrice: toNumber(
          form.basePrice
        ),

        cleaningFee: toNumber(
          form.cleaningFee
        ),

        serviceFee: toNumber(
          form.serviceFee
        ),

        taxes: toNumber(form.taxes),

        highSeasonPrice:
          form.highSeasonPrice
            ? toNumber(
                form.highSeasonPrice
              )
            : null,

        lowSeasonPrice:
          form.lowSeasonPrice
            ? toNumber(
                form.lowSeasonPrice
              )
            : null,

        twoGuestsIncrease:
          toNumber(
            form.twoGuestsIncrease
          ),

        extraGuestIncrease:
          toNumber(
            form.extraGuestIncrease
          ),

        //////////////////////////////////////////////////////
        // CAPACITY
        //////////////////////////////////////////////////////

        maxGuests: toNumber(
          form.maxGuests
        ),

        maxCapacity: toNumber(
          form.maxCapacity
        ),

        bedrooms: toNumber(
          form.bedrooms
        ),

        bathrooms: toNumber(
          form.bathrooms
        ),

        minimumNights:
          toNumber(
            form.minimumNights
          ) || 1,

        //////////////////////////////////////////////////////
        // RULES
        //////////////////////////////////////////////////////

        allowsPets: form.allowsPets,
        allowsSmoking:
          form.allowsSmoking,
        allowsEvents:
          form.allowsEvents,
        allowsChildren:
          form.allowsChildren,

        checkInTime:
          form.checkInTime || null,

        checkOutTime:
          form.checkOutTime || null,

        cancellationPolicy:
          form.cancellationPolicy ||
          null,

        //////////////////////////////////////////////////////
        // LOCATION
        //////////////////////////////////////////////////////

        latitude: form.latitude
          ? Number(form.latitude)
          : null,

        longitude: form.longitude
          ? Number(form.longitude)
          : null,

        //////////////////////////////////////////////////////
        // SEO
        //////////////////////////////////////////////////////

        seoTitle:
          form.seoTitle || null,

        seoDescription:
          form.seoDescription ||
          null,

        seoKeywords:
          form.seoKeywords ||
          null,

        seoContent:
          form.seoContent ||
          null,

        nearbyAttractions:
          form.nearbyAttractions ||
          null,

        locationDescription:
          form.locationDescription ||
          null,

        guestRecommendations:
          form.guestRecommendations ||
          null,

        faq: parsedFaq,

        //////////////////////////////////////////////////////
        // INTERNAL
        //////////////////////////////////////////////////////

        internalNotes:
          form.internalNotes ||
          null,

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
      };

      const response = await fetch(
        apiUrl(
          isEditMode
            ? `/properties/${propertyId}`
            : "/properties"
        ),
        {
          method: isEditMode
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "❌ Backend error:",
          data
        );

        alert(
          data?.message ||
            `No se pudo ${
              isEditMode
                ? "actualizar"
                : "crear"
            } el alojamiento.`
        );

        setLoading(false);
        return;
      }

      const savedPropertyId = data?.id || propertyId;

      try {
        if (savedPropertyId) {
          await saveFeatureAssignments(
            "PROPERTY",
            savedPropertyId,
            form.featureIds
          );
        }
      } catch (featureError: any) {
        alert(
          `El alojamiento se guardó, pero no se pudieron guardar sus características: ${
            featureError?.message || "error desconocido"
          }`
        );
      }

      if (isEditMode) {
        alert(
          "Propiedad actualizada correctamente"
        );

        router.push(
          "/admin/alojamientos"
        );

        router.refresh();
        return;
      }

      alert(
        "✅ Propiedad creada correctamente"
      );

      router.push(
        "/admin/alojamientos"
      );

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "❌ Error de conexión con servidor"
      );
    }

    setLoading(false);
  }

  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////

  const tabs = propertyWizardSteps;

  const activeStepIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const isLastStep = activeStepIndex === tabs.length - 1;

  function goToStep(step: typeof activeTab) {
    setWizardError("");
    setActiveTab(step);
  }

  function goNext() {
    const validationMessage = validateStep();
    if (validationMessage) {
      setWizardError(validationMessage);
      return;
    }

    const next = tabs[activeStepIndex + 1];
    if (next) {
      setWizardError("");
      setActiveTab(next.key);
    }
  }

  function goPrevious() {
    const previous = tabs[activeStepIndex - 1];
    if (previous) {
      setWizardError("");
      setActiveTab(previous.key);
    }
  }

  if (loadingProperty) {
    return (
      <div className="min-h-[520px] bg-[#F8F6F1] px-6 py-10">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="h-7 w-64 animate-pulse rounded-full bg-[#D4AF37]/20" />
          <div className="h-14 w-full max-w-xl animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
            <div className="h-96 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[420px] bg-[#F8F6F1] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
            Alojamiento no disponible
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#0F2A44]">
            No se pudo cargar la propiedad
          </h1>
          <p className="mt-3 text-slate-500">
            {loadError}
          </p>
          <Button
            type="button"
            onClick={() =>
              router.push("/admin/alojamientos")
            }
            className="mt-6 rounded-xl bg-[#0F2A44] text-white hover:bg-[#163756]"
          >
            Volver a alojamientos
          </Button>
        </div>
      </div>
    );
  }

  if (role && !canManage) {
    return (
      <div className="min-h-[420px] bg-[#F8F6F1] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#B68D40]">
            Permisos
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#0F2A44]">
            Acción restringida
          </h1>
          <p className="mt-3 text-slate-500">
            Tu rol permite consultar alojamientos y operar solicitudes
            asignadas. La creación y edición de alojamientos está reservada
            para Superadmin.
          </p>
          <Button
            type="button"
            onClick={() =>
              router.push("/admin/alojamientos")
            }
            className="mt-6 rounded-xl bg-[#0F2A44] text-white hover:bg-[#163756]"
          >
            Volver a alojamientos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen bg-[#F8F6F1]"
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        {/* HEADER */}

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8 mb-10">
          <div>
            <p className="uppercase tracking-[0.35em] text-[#B68D40] text-sm">
              Gestión premium de alojamientos
            </p>

            <h1 className="text-5xl font-bold text-[#0F2A44] mt-4">
              {isEditMode
                ? "Editar alojamiento"
                : "Crear nuevo alojamiento"}
            </h1>

            <p className="text-slate-500 text-lg mt-4 max-w-2xl">
              {isEditMode
                ? "Actualiza la información del alojamiento"
                : "Configura el alojamiento, precios y reglas operativas para viajeros premium."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => router.push("/admin/alojamientos")}
              className="h-14 px-8 rounded-2xl bg-white text-[#0F2A44] border border-[#D4AF37]/30 hover:bg-[#F3EFE4]"
            >
              Cancelar
            </Button>

            {!isLastStep ? (
              <Button
                type="button"
                onClick={goNext}
                className="h-14 px-10 rounded-2xl bg-[#0F2A44] hover:bg-[#163756] text-white shadow-xl"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="h-14 px-10 rounded-2xl bg-[#0F2A44] hover:bg-[#163756] text-white shadow-xl"
              >
                {loading
                  ? isEditMode
                    ? "Guardando..."
                    : "Publicando..."
                  : isEditMode
                    ? "Guardar cambios"
                    : "Publicar alojamiento"}
              </Button>
            )}
          </div>
        </div>

        <ProductWizardProgress
          steps={tabs}
          activeKey={activeTab}
          onChange={goToStep}
        />

        {wizardError && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {wizardError}
          </div>
        )}

        <div className="mt-8">

          {/* CONTENT */}

          <div className="space-y-8">
            {activeTab === "basic" && (
              <PropertyBasicInfoStep
                form={form}
                generatedSlug={generatedSlug}
                updateField={updateField}
              />
            )}

            {activeTab === "media" && (
              <PropertyMediaStep
                form={form}
                updateField={updateField}
                loading={loading}
              />
            )}

            {activeTab === "translations" && (
              <PropertyTranslationsStep
                form={form}
                updateForm={updateField}
                canManage={canManage}
              />
            )}

            {activeTab === "features" && (
              <PropertyFeaturesStep
                form={form}
                updateField={updateField}
                propertyId={propertyId}
                loading={loading}
              />
            )}

            {activeTab === "pricing" && (
              <PropertyPricingStep
                form={form}
                updateField={updateField}
              />
            )}

            {activeTab === "premium" && (
              <PropertyPremiumServicesStep
                isEditMode={isEditMode}
                propertyId={propertyId}
              />
            )}

            {activeTab === "review" && (
              <PropertyReviewStep
                form={form}
                isEditMode={isEditMode}
              />
            )}

            <div className="flex flex-col gap-3 rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goPrevious}
                disabled={activeStepIndex <= 0}
                className="h-12 rounded-xl"
              >
                Anterior
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/alojamientos")}
                  className="h-12 rounded-xl"
                >
                  Cancelar
                </Button>
                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="h-12 rounded-xl bg-[#0F2A44] px-8 text-white hover:bg-[#163756]"
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-xl bg-[#0F2A44] px-8 text-white hover:bg-[#163756]"
                  >
                    {loading
                      ? "Guardando..."
                      : isEditMode
                        ? "Guardar cambios"
                        : "Publicar alojamiento"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
