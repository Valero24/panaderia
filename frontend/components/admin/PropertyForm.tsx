"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import MediaGalleryEditor, {
  AdminMediaItem,
} from "@/components/admin/MediaGalleryEditor";

type PropertyStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FEATURED"
  | "MAINTENANCE"
  | "ARCHIVED";

type PropertyFormProps = {
  propertyId?: string | number;
};

function toInputValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
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
    useState<
      | "overview"
      | "pricing"
      | "capacity"
      | "media"
      | "rules"
      | "seo"
      | "internal"
    >("overview");

  const [form, setForm] = useState({
    //////////////////////////////////////////////////////
    // OVERVIEW
    //////////////////////////////////////////////////////

    title: "",
    slug: "",

    city: "",
    area: "",
    address: "",

    description: "",

    status: "DRAFT" as PropertyStatus,

    //////////////////////////////////////////////////////
    // PRICING
    //////////////////////////////////////////////////////

    pricePerNight: "",
    basePrice: "",

    cleaningFee: "",
    serviceFee: "",
    taxes: "",

    highSeasonPrice: "",
    lowSeasonPrice: "",

    twoGuestsIncrease: "",
    extraGuestIncrease: "",

    //////////////////////////////////////////////////////
    // CAPACITY
    //////////////////////////////////////////////////////

    maxGuests: "",
    maxCapacity: "",

    bedrooms: "",
    bathrooms: "",

    minimumNights: "",

    //////////////////////////////////////////////////////
    // RULES
    //////////////////////////////////////////////////////

    allowsPets: false,
    allowsSmoking: false,
    allowsEvents: false,
    allowsChildren: true,

    checkInTime: "",
    checkOutTime: "",

    cancellationPolicy: "",

    //////////////////////////////////////////////////////
    // LOCATION
    //////////////////////////////////////////////////////

    latitude: "",
    longitude: "",

    //////////////////////////////////////////////////////
    // SEO
    //////////////////////////////////////////////////////

    seoTitle: "",
    seoDescription: "",

    //////////////////////////////////////////////////////
    // INTERNAL
    //////////////////////////////////////////////////////

    internalNotes: "",

    images: [] as AdminMediaItem[],
  });

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

        setForm({
          title: toInputValue(property.title),
          slug: toInputValue(property.slug),
          city: toInputValue(property.city),
          area: toInputValue(property.area),
          address: toInputValue(property.address),
          description: toInputValue(
            property.description
          ),
          status:
            property.status ||
            ("DRAFT" as PropertyStatus),
          pricePerNight: toInputValue(
            property.pricePerNight
          ),
          basePrice: toInputValue(
            property.basePrice
          ),
          cleaningFee: toInputValue(
            property.cleaningFee
          ),
          serviceFee: toInputValue(
            property.serviceFee
          ),
          taxes: toInputValue(property.taxes),
          highSeasonPrice: toInputValue(
            property.highSeasonPrice
          ),
          lowSeasonPrice: toInputValue(
            property.lowSeasonPrice
          ),
          twoGuestsIncrease: toInputValue(
            property.twoGuestsIncrease
          ),
          extraGuestIncrease: toInputValue(
            property.extraGuestIncrease
          ),
          maxGuests: toInputValue(
            property.maxGuests
          ),
          maxCapacity: toInputValue(
            property.maxCapacity
          ),
          bedrooms: toInputValue(property.bedrooms),
          bathrooms: toInputValue(
            property.bathrooms
          ),
          minimumNights: toInputValue(
            property.minimumNights
          ),
          allowsPets: Boolean(property.allowsPets),
          allowsSmoking: Boolean(
            property.allowsSmoking
          ),
          allowsEvents: Boolean(
            property.allowsEvents
          ),
          allowsChildren:
            property.allowsChildren ?? true,
          checkInTime: toInputValue(
            property.checkInTime
          ),
          checkOutTime: toInputValue(
            property.checkOutTime
          ),
          cancellationPolicy: toInputValue(
            property.cancellationPolicy
          ),
          latitude: toInputValue(property.latitude),
          longitude: toInputValue(
            property.longitude
          ),
          seoTitle: toInputValue(property.seoTitle),
          seoDescription: toInputValue(
            property.seoDescription
          ),
          internalNotes: toInputValue(
            property.internalNotes
          ),
          images: Array.isArray(property.images)
            ? property.images
            : [],
        });
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
      [key]: value,
    }));
  }

  function toNumber(value: string) {
    if (!value || value === "") {
      return 0;
    }

    return Number(value);
  }

  const generatedSlug = useMemo(() => {
    if (form.slug.trim()) {
      return form.slug;
    }

    return form.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }, [form.title, form.slug]);

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

        //////////////////////////////////////////////////////
        // INTERNAL
        //////////////////////////////////////////////////////

        internalNotes:
          form.internalNotes ||
          null,

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

  const tabs = [
    {
      key: "overview",
      label: "Overview",
    },
    {
      key: "pricing",
      label: "Pricing",
    },
    {
      key: "capacity",
      label: "Capacity",
    },
    {
      key: "media",
      label: "Galería",
    },
    {
      key: "rules",
      label: "Rules",
    },
    {
      key: "seo",
      label: "SEO",
    },
    {
      key: "internal",
      label: "Internal",
    },
  ];

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
            Accion restringida
          </h1>
          <p className="mt-3 text-slate-500">
            Tu rol permite consultar alojamientos y operar solicitudes
            asignadas. La creacion y edicion de alojamientos esta reservada
            para Super Admin.
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
              Luxury Property Management
            </p>

            <h1 className="text-5xl font-bold text-[#0F2A44] mt-4">
              {isEditMode
                ? "Editar propiedad"
                : "Crear nueva propiedad"}
            </h1>

            <p className="text-slate-500 text-lg mt-4 max-w-2xl">
              {isEditMode
                ? "Actualiza la información del alojamiento"
                : "Configura el alojamiento, precios y reglas operativas para viajeros premium."}
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              className="h-14 px-8 rounded-2xl bg-white text-[#0F2A44] border border-[#D4AF37]/30 hover:bg-[#F3EFE4]"
            >
              Guardar borrador
            </Button>

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
                  : "Publicar propiedad"}
            </Button>
          </div>
        </div>

        <div className="grid xl:grid-cols-[280px_1fr] gap-8">
          {/* SIDEBAR */}

          <div className="space-y-3 xl:sticky xl:top-10 h-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.key as any
                  )
                }
                className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all duration-300 border text-left ${
                  activeTab === tab.key
                    ? "bg-[#0F2A44] text-white border-[#0F2A44] shadow-xl"
                    : "bg-white border-[#D4AF37]/20 text-[#0F2A44] hover:border-[#D4AF37]"
                }`}
              >
                <span className="font-semibold">
                  {tab.label}
                </span>

                <span
                  className={`h-2 w-2 rounded-full ${
                    activeTab === tab.key
                      ? "bg-[#D4AF37]"
                      : "bg-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* CONTENT */}

          <div className="space-y-8">
            {/* OVERVIEW */}

            {activeTab === "overview" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 shadow-sm bg-white">
                <CardContent className="p-10 space-y-10">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Overview
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      Commercial Information
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Property Name
                      </label>

                      <Input
                        value={form.title}
                        onChange={(e) =>
                          updateField(
                            "title",
                            e.target.value
                          )
                        }
                        placeholder="Villa Ocean Pearl"
                        className="h-14 rounded-2xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Slug
                      </label>

                      <Input
                        value={generatedSlug}
                        onChange={(e) =>
                          updateField(
                            "slug",
                            e.target.value
                          )
                        }
                        placeholder="villa-ocean-pearl"
                        className="h-14 rounded-2xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        City
                      </label>

                      <Input
                        value={form.city}
                        onChange={(e) =>
                          updateField(
                            "city",
                            e.target.value
                          )
                        }
                        placeholder="Cartagena"
                        className="h-14 rounded-2xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Area
                      </label>

                      <Input
                        value={form.area}
                        onChange={(e) =>
                          updateField(
                            "area",
                            e.target.value
                          )
                        }
                        placeholder="Bocagrande"
                        className="h-14 rounded-2xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Address
                      </label>

                      <Input
                        value={form.address}
                        onChange={(e) =>
                          updateField(
                            "address",
                            e.target.value
                          )
                        }
                        placeholder="Private property address"
                        className="h-14 rounded-2xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Description
                      </label>

                      <Textarea
                        value={
                          form.description
                        }
                        onChange={(e) =>
                          updateField(
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Describe the luxury experience..."
                        className="min-h-[180px] rounded-3xl border-[#D4AF37]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#0F2A44]">
                        Status
                      </label>

                      <select
                        value={form.status}
                        onChange={(e) =>
                          updateField(
                            "status",
                            e.target.value
                          )
                        }
                        className="w-full h-14 rounded-2xl border border-[#D4AF37]/20 px-4 bg-white"
                      >
                        <option value="DRAFT">
                          Draft
                        </option>

                        <option value="ACTIVE">
                          Active
                        </option>

                        <option value="FEATURED">
                          Featured
                        </option>

                        <option value="MAINTENANCE">
                          Maintenance
                        </option>

                        <option value="ARCHIVED">
                          Archived
                        </option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PRICING */}

            {activeTab === "pricing" && (
              <div className="space-y-8">
                <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                  <CardContent className="p-10">
                    <div className="mb-8">
                      <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                        Pricing Engine
                      </p>

                      <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                        Public Pricing
                      </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <Input
                        type="number"
                        placeholder="Price per night"
                        value={
                          form.pricePerNight
                        }
                        onChange={(e) =>
                          updateField(
                            "pricePerNight",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="High season price"
                        value={
                          form.highSeasonPrice
                        }
                        onChange={(e) =>
                          updateField(
                            "highSeasonPrice",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="Low season price"
                        value={
                          form.lowSeasonPrice
                        }
                        onChange={(e) =>
                          updateField(
                            "lowSeasonPrice",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                  <CardContent className="p-10">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-[#0F2A44]">
                        Internal Pricing
                      </h2>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                      <Input
                        type="number"
                        placeholder="Base price"
                        value={form.basePrice}
                        onChange={(e) =>
                          updateField(
                            "basePrice",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="Cleaning fee"
                        value={
                          form.cleaningFee
                        }
                        onChange={(e) =>
                          updateField(
                            "cleaningFee",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="Service fee"
                        value={
                          form.serviceFee
                        }
                        onChange={(e) =>
                          updateField(
                            "serviceFee",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="Taxes"
                        value={form.taxes}
                        onChange={(e) =>
                          updateField(
                            "taxes",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                  <CardContent className="p-10">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-[#0F2A44]">
                        Dynamic Pricing
                      </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        type="number"
                        placeholder="2 guests increment"
                        value={
                          form.twoGuestsIncrease
                        }
                        onChange={(e) =>
                          updateField(
                            "twoGuestsIncrease",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />

                      <Input
                        type="number"
                        placeholder="Extra guest increment"
                        value={
                          form.extraGuestIncrease
                        }
                        onChange={(e) =>
                          updateField(
                            "extraGuestIncrease",
                            e.target.value
                          )
                        }
                        className="h-14 rounded-2xl"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* CAPACITY */}

            {activeTab === "capacity" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                <CardContent className="p-10">
                  <div className="mb-10">
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Capacity
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      Guest Configuration
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <Input
                      type="number"
                      placeholder="Max guests"
                      value={form.maxGuests}
                      onChange={(e) =>
                        updateField(
                          "maxGuests",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      type="number"
                      placeholder="Max capacity"
                      value={
                        form.maxCapacity
                      }
                      onChange={(e) =>
                        updateField(
                          "maxCapacity",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      type="number"
                      placeholder="Minimum nights"
                      value={
                        form.minimumNights
                      }
                      onChange={(e) =>
                        updateField(
                          "minimumNights",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      type="number"
                      placeholder="Bedrooms"
                      value={form.bedrooms}
                      onChange={(e) =>
                        updateField(
                          "bedrooms",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      type="number"
                      placeholder="Bathrooms"
                      value={
                        form.bathrooms
                      }
                      onChange={(e) =>
                        updateField(
                          "bathrooms",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MEDIA */}

            {activeTab === "media" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                <CardContent className="p-10 space-y-8">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Galería multimedia
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      Fotos y videos del alojamiento
                    </h2>

                    <p className="mt-3 max-w-2xl text-slate-500">
                      Organiza el recorrido visual que verá el cliente en la página pública.
                    </p>
                  </div>

                  <MediaGalleryEditor
                    value={form.images}
                    onChange={(images) =>
                      updateField("images", images)
                    }
                    disabled={loading}
                  />
                </CardContent>
              </Card>
            )}

            {/* RULES */}

            {activeTab === "rules" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                <CardContent className="p-10 space-y-10">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Rules & Operations
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      Property Rules
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {[
                      {
                        key: "allowsPets",
                        label:
                          "Pets Allowed",
                      },
                      {
                        key:
                          "allowsSmoking",
                        label:
                          "Smoking Allowed",
                      },
                      {
                        key:
                          "allowsEvents",
                        label:
                          "Events Allowed",
                      },
                      {
                        key:
                          "allowsChildren",
                        label:
                          "Children Allowed",
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          updateField(
                            item.key as any,
                            !form[
                              item.key as keyof typeof form
                            ]
                          )
                        }
                        className={`h-20 rounded-3xl border transition-all flex items-center justify-between px-8 ${
                          form[
                            item.key as keyof typeof form
                          ]
                            ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                            : "bg-white border-[#D4AF37]/20 text-[#0F2A44]"
                        }`}
                      >
                        <span className="font-semibold text-lg">
                          {item.label}
                        </span>

                        <div
                          className={`h-7 w-14 rounded-full flex items-center px-1 ${
                            form[
                              item.key as keyof typeof form
                            ]
                              ? "bg-[#D4AF37]"
                              : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white transition-all ${
                              form[
                                item.key as keyof typeof form
                              ]
                                ? "translate-x-7"
                                : ""
                            }`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      placeholder="Check-in time"
                      value={
                        form.checkInTime
                      }
                      onChange={(e) =>
                        updateField(
                          "checkInTime",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      placeholder="Check-out time"
                      value={
                        form.checkOutTime
                      }
                      onChange={(e) =>
                        updateField(
                          "checkOutTime",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />
                  </div>

                  <Textarea
                    placeholder="Cancellation policy"
                    value={
                      form.cancellationPolicy
                    }
                    onChange={(e) =>
                      updateField(
                        "cancellationPolicy",
                        e.target.value
                      )
                    }
                    className="min-h-[180px] rounded-3xl"
                  />
                </CardContent>
              </Card>
            )}

            {/* SEO */}

            {activeTab === "seo" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                <CardContent className="p-10 space-y-8">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Search Optimization
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      SEO Configuration
                    </h2>
                  </div>

                  <Input
                    placeholder="SEO Title"
                    value={form.seoTitle}
                    onChange={(e) =>
                      updateField(
                        "seoTitle",
                        e.target.value
                      )
                    }
                    className="h-14 rounded-2xl"
                  />

                  <Textarea
                    placeholder="SEO Description"
                    value={
                      form.seoDescription
                    }
                    onChange={(e) =>
                      updateField(
                        "seoDescription",
                        e.target.value
                      )
                    }
                    className="min-h-[160px] rounded-3xl"
                  />
                </CardContent>
              </Card>
            )}

            {/* INTERNAL */}

            {activeTab === "internal" && (
              <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
                <CardContent className="p-10 space-y-8">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
                      Operación interna
                    </p>

                    <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
                      Notas administrativas
                    </h2>
                  </div>

                  <Textarea
                    placeholder="Notas internas, instrucciones para el asesor, detalles VIP..."
                    value={
                      form.internalNotes
                    }
                    onChange={(e) =>
                      updateField(
                        "internalNotes",
                        e.target.value
                      )
                    }
                    className="min-h-[300px] rounded-3xl"
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      placeholder="Latitude"
                      value={form.latitude}
                      onChange={(e) =>
                        updateField(
                          "latitude",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />

                    <Input
                      placeholder="Longitude"
                      value={form.longitude}
                      onChange={(e) =>
                        updateField(
                          "longitude",
                          e.target.value
                        )
                      }
                      className="h-14 rounded-2xl"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
