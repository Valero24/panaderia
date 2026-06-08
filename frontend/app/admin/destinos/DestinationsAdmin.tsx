"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  MapPinned,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";

import SeoChecklist from "@/components/admin/SeoChecklist";
import FaqEditor from "@/components/admin/FaqEditor";
import TranslationEditor from "@/components/admin/TranslationEditor";
import type { TranslationMap } from "@/components/admin/translations-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";
import { normalizeSeoSlug } from "@/lib/slug";

type Destination = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  heroImage?: string | null;
  gallery?: unknown;
  location?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  updatedAt?: string | null;
  translations?: TranslationMap | null;
};

type DestinationForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoContent: string;
  faqItems: FaqFormItem[];
  heroImage: string;
  gallery: string;
  location: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
  translations: TranslationMap;
};

type FaqFormItem = {
  question: string;
  answer: string;
};

type ProductOption = {
  id: number;
  title?: string | null;
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  active?: boolean | null;
};

type RelationSelection = {
  id: number;
  sortOrder: number;
  isFeatured: boolean;
};

type RelationsState = {
  properties: RelationSelection[];
  experiences: RelationSelection[];
  packages: RelationSelection[];
};

type ProductCatalog = {
  properties: ProductOption[];
  experiences: ProductOption[];
  packages: ProductOption[];
};

const emptyForm: DestinationForm = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  seoContent: "",
  faqItems: [],
  heroImage: "",
  gallery: "",
  location: "",
  isActive: true,
  isFeatured: false,
  sortOrder: "0",
  translations: {},
};

const emptyRelations: RelationsState = {
  properties: [],
  experiences: [],
  packages: [],
};

const emptyCatalog: ProductCatalog = {
  properties: [],
  experiences: [],
  packages: [],
};

function normalizeFaqItems(value: unknown): FaqFormItem[] {
  if (typeof value === "string") {
    try {
      return normalizeFaqItems(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as { question?: unknown; answer?: unknown };
      return {
        question: String(source.question || "").trim(),
        answer: String(source.answer || "").trim(),
      };
    })
    .filter((item): item is FaqFormItem =>
      Boolean(item?.question || item?.answer)
    );
}

function faqItemsToPayload(items: FaqFormItem[]) {
  const cleanItems = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);

  return cleanItems.length ? cleanItems : undefined;
}

function stringifyFaqItems(items: FaqFormItem[]) {
  return items.length ? JSON.stringify(items, null, 2) : "";
}

function toForm(item: Destination): DestinationForm {
  return {
    name: item.name || "",
    slug: item.slug || "",
    shortDescription: item.shortDescription || "",
    description: item.description || "",
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
    seoContent: item.seoContent || "",
    faqItems: normalizeFaqItems(item.faq),
    heroImage: item.heroImage || "",
    gallery: item.gallery ? JSON.stringify(item.gallery, null, 2) : "",
    location: item.location || "",
    isActive: item.isActive !== false,
    isFeatured: Boolean(item.isFeatured),
    sortOrder: String(item.sortOrder ?? 0),
    translations: item.translations || {},
  };
}

function parseOptionalJson(value: string, label: string) {
  const cleanValue = value.trim();
  if (!cleanValue) return undefined;

  try {
    return JSON.parse(cleanValue);
  } catch {
    throw new Error(`${label} debe tener formato JSON valido.`);
  }
}

function friendlyError(error: any, fallback: string) {
  const message = error?.message;
  if (Array.isArray(message)) return fallback;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function productTitle(item: ProductOption) {
  return item.title || item.name || `Producto #${item.id}`;
}

function relationFromApi(item: any): RelationSelection {
  const productId =
    Number(item?.propertyId || item?.experienceId || item?.packageId || item?.item?.id);

  return {
    id: productId,
    sortOrder: Number(item?.sortOrder || 0),
    isFeatured: Boolean(item?.isFeatured),
  };
}

function normalizeRelationPayload(value: any): RelationsState {
  return {
    properties: Array.isArray(value?.properties)
      ? value.properties
          .map(relationFromApi)
          .filter((item: RelationSelection) => item.id > 0)
      : [],
    experiences: Array.isArray(value?.experiences)
      ? value.experiences
          .map(relationFromApi)
          .filter((item: RelationSelection) => item.id > 0)
      : [],
    packages: Array.isArray(value?.packages)
      ? value.packages
          .map(relationFromApi)
          .filter((item: RelationSelection) => item.id > 0)
      : [],
  };
}

function ProductRelationsEditor({
  catalog,
  relations,
  disabled,
  loading,
  saving,
  onChange,
  onSave,
}: {
  catalog: ProductCatalog;
  relations: RelationsState;
  disabled: boolean;
  loading: boolean;
  saving: boolean;
  onChange: (value: RelationsState) => void;
  onSave: () => void;
}) {
  const [activeTab, setActiveTab] =
    useState<keyof RelationsState>("properties");
  const [searches, setSearches] = useState<Record<keyof RelationsState, string>>({
    properties: "",
    experiences: "",
    packages: "",
  });

  const tabs: {
    key: keyof RelationsState;
    label: string;
    empty: string;
  }[] = [
    {
      key: "properties",
      label: "Alojamientos",
      empty: "No hay alojamientos disponibles.",
    },
    {
      key: "experiences",
      label: "Experiencias",
      empty: "No hay experiencias disponibles.",
    },
    {
      key: "packages",
      label: "Paquetes",
      empty: "No hay paquetes disponibles.",
    },
  ];

  const selectedMap = useMemo(() => {
    return new Map(relations[activeTab].map((item) => [item.id, item]));
  }, [activeTab, relations]);
  const cleanSearch = searches[activeTab].trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    return catalog[activeTab]
      .filter((item) => {
        const title = productTitle(item).toLowerCase();
        const slug = String(item.slug || "").toLowerCase();
        return !cleanSearch || title.includes(cleanSearch) || slug.includes(cleanSearch);
      })
      .sort((a, b) => {
        const aSelected = selectedMap.has(a.id) ? 0 : 1;
        const bSelected = selectedMap.has(b.id) ? 0 : 1;
        if (aSelected !== bSelected) return aSelected - bSelected;
        return productTitle(a).localeCompare(productTitle(b), "es");
      });
  }, [activeTab, catalog, cleanSearch, selectedMap]);

  function updateActiveTab(nextItems: RelationSelection[]) {
    onChange({ ...relations, [activeTab]: nextItems });
  }

  function toggleProduct(product: ProductOption, checked: boolean) {
    const current = relations[activeTab];
    if (checked) {
      if (current.some((item) => item.id === product.id)) return;
      updateActiveTab([
        ...current,
        {
          id: product.id,
          sortOrder: current.length,
          isFeatured: false,
        },
      ]);
      return;
    }

    updateActiveTab(current.filter((item) => item.id !== product.id));
  }

  function updateRelation(
    productId: number,
    key: keyof Omit<RelationSelection, "id">,
    value: number | boolean
  ) {
    updateActiveTab(
      relations[activeTab].map((item) =>
        item.id === productId ? { ...item, [key]: value } : item
      )
    );
  }

  return (
    <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Productos relacionados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Asocia alojamientos, experiencias y paquetes al destino. Puedes marcar
            destacados y definir el orden público.
          </p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={disabled || saving || loading}
          className="rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando relaciones..." : "Guardar relaciones"}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[#0D2B52] bg-[#0D2B52] text-white"
                : "border-[#D4AF37]/30 bg-[#F8F6F2] text-[#0D2B52]"
            }`}
          >
            {tab.label} ({relations[tab.key].length})
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <Input
          value={searches[activeTab]}
          onChange={(event) =>
            setSearches((current) => ({
              ...current,
              [activeTab]: event.target.value,
            }))
          }
          placeholder={`Buscar ${tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()}`}
          disabled={loading}
        />

        {loading ? (
          <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4 text-sm text-slate-500">
            Cargando productos relacionados...
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F2] p-4 text-sm text-slate-500">
            {tabs.find((tab) => tab.key === activeTab)?.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleProducts.map((product) => {
              const selected = selectedMap.get(product.id);
              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border p-4 ${
                    selected
                      ? "border-[#D4AF37]/40 bg-[#FFFDF7]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_130px_150px] lg:items-center">
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        disabled={disabled}
                        onChange={(event) =>
                          toggleProduct(product, event.target.checked)
                        }
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-bold">
                          {productTitle(product)}
                        </span>
                        <span className="mt-1 block break-all text-xs text-slate-500">
                          ID {product.id}
                          {product.slug ? ` · /${product.slug}` : ""}
                          {product.status ? ` · ${product.status}` : ""}
                          {product.active === false ? " · Inactivo" : ""}
                        </span>
                      </span>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">
                        Orden
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={selected?.sortOrder ?? 0}
                        disabled={disabled || !selected}
                        onChange={(event) =>
                          updateRelation(
                            product.id,
                            "sortOrder",
                            Number(event.target.value || 0)
                          )
                        }
                      />
                    </label>

                    <label className="flex items-center gap-2 rounded-full bg-[#F8F6F2] px-3 py-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={Boolean(selected?.isFeatured)}
                        disabled={disabled || !selected}
                        onChange={(event) =>
                          updateRelation(product.id, "isFeatured", event.target.checked)
                        }
                      />
                      Destacado
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function DestinationsAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const isNewRoute = pathname?.endsWith("/nuevo");
  const isEditRoute = pathname?.endsWith("/editar");
  const formMode = Boolean(isNewRoute || isEditRoute);
  const editId = Number(params?.id || 0);

  const [items, setItems] = useState<Destination[]>([]);
  const [form, setForm] = useState<DestinationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [featuredFilter, setFeaturedFilter] = useState<"ALL" | "FEATURED">("ALL");
  const [catalog, setCatalog] = useState<ProductCatalog>(emptyCatalog);
  const [relations, setRelations] = useState<RelationsState>(emptyRelations);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relationsSaving, setRelationsSaving] = useState(false);

  const canCreate = useMemo(() => role === "SUPERADMIN", [role]);
  const canEdit = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [role]);
  const canModerate = useMemo(() => role === "SUPERADMIN", [role]);
  const formCanManage = isNewRoute ? canCreate : canEdit;
  const filteredItems = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !cleanSearch ||
        item.name.toLowerCase().includes(cleanSearch) ||
        item.slug.toLowerCase().includes(cleanSearch);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? item.isActive : !item.isActive);
      const matchesFeatured =
        featuredFilter === "ALL" || item.isFeatured;

      return matchesSearch && matchesStatus && matchesFeatured;
    });
  }, [featuredFilter, items, search, statusFilter]);

  function updateForm<K extends keyof DestinationForm>(
    key: K,
    value: DestinationForm[K]
  ) {
    setForm((current) => {
      if (key === "slug") {
        return { ...current, slug: normalizeSeoSlug(String(value)) };
      }

      if (key === "name" && typeof value === "string") {
        const currentAutoSlug = normalizeSeoSlug(current.name);
        const shouldSyncSlug =
          !current.slug.trim() || current.slug.trim() === currentAutoSlug;

        return {
          ...current,
          name: value,
          ...(shouldSyncSlug ? { slug: normalizeSeoSlug(value) } : {}),
        };
      }

      return { ...current, [key]: value };
    });
  }

  async function fetchDestinations() {
    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(apiUrl("/destinations/admin/all"), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudieron cargar destinos.");
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setMessage(friendlyError(error, "Error cargando destinos."));
    } finally {
      setLoading(false);
    }
  }

  async function loadDestinationForEdit(id: number) {
    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(apiUrl(`/destinations/admin/${id}`), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo cargar el destino.");
      }

      setForm(toForm(data));
    } catch (error: any) {
      setMessage(friendlyError(error, "Error cargando destino."));
    } finally {
      setLoading(false);
    }
  }

  async function loadProductsAndRelations(id: number) {
    try {
      setRelationsLoading(true);
      const [propertiesRes, experiencesRes, packagesRes, relationsRes] =
        await Promise.all([
          fetch(apiUrl("/properties"), {
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(apiUrl("/experiences/admin/all"), {
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(apiUrl("/packages/admin/all"), {
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(apiUrl(`/destinations/${id}/relations`), {
            headers: authHeaders(),
            cache: "no-store",
          }),
        ]);

      const [properties, experiences, packages, relationData] =
        await Promise.all([
          propertiesRes.json(),
          experiencesRes.json(),
          packagesRes.json(),
          relationsRes.json(),
        ]);

      if (!propertiesRes.ok) {
        throw new Error(properties?.message || "No se pudieron cargar alojamientos.");
      }
      if (!experiencesRes.ok) {
        throw new Error(experiences?.message || "No se pudieron cargar experiencias.");
      }
      if (!packagesRes.ok) {
        throw new Error(packages?.message || "No se pudieron cargar paquetes.");
      }
      if (!relationsRes.ok) {
        throw new Error(relationData?.message || "No se pudieron cargar relaciones.");
      }

      setCatalog({
        properties: Array.isArray(properties) ? properties : [],
        experiences: Array.isArray(experiences) ? experiences : [],
        packages: Array.isArray(packages) ? packages : [],
      });
      setRelations(normalizeRelationPayload(relationData));
    } catch (error: any) {
      setMessage(friendlyError(error, "Error cargando productos relacionados."));
    } finally {
      setRelationsLoading(false);
    }
  }

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user?.role || "");
    } catch {
      setRole("");
    }

    if (formMode) return;
    fetchDestinations();
  }, [formMode]);

  useEffect(() => {
    if (!formMode) return;

    if (isNewRoute) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }

    if (isEditRoute && editId) {
      loadDestinationForEdit(editId);
      loadProductsAndRelations(editId);
    }
  }, [formMode, isNewRoute, isEditRoute, editId]);

  async function saveRelations() {
    if (!formCanManage || !isEditRoute || !editId) return;

    try {
      setRelationsSaving(true);
      setMessage("");
      const response = await fetch(apiUrl(`/destinations/${editId}/relations`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(relations),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudieron guardar relaciones.");
      }

      setRelations(normalizeRelationPayload(data));
      setMessage("Relaciones del destino guardadas correctamente.");
    } catch (error: any) {
      setMessage(friendlyError(error, "Error guardando relaciones."));
    } finally {
      setRelationsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formCanManage) return;

    try {
      setSaving(true);
      setMessage("");

      if (!form.name.trim()) {
        throw new Error("El nombre del destino es obligatorio.");
      }

      const finalSlug = normalizeSeoSlug(form.slug || form.name);
      if (!finalSlug) {
        throw new Error("El slug del destino es obligatorio.");
      }

      const payload = {
        name: form.name,
        slug: finalSlug,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        seoContent: form.seoContent || undefined,
        faq: faqItemsToPayload(form.faqItems),
        heroImage: form.heroImage || undefined,
        gallery: parseOptionalJson(form.gallery, "Galeria"),
        location: form.location || undefined,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        sortOrder: Number(form.sortOrder || 0),
        translations: form.translations,
      };

      const response = await fetch(
        apiUrl(isEditRoute ? `/destinations/${editId}` : "/destinations"),
        {
          method: isEditRoute ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo guardar el destino.");
      }

      router.push("/admin/destinos");
      router.refresh();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error guardando destino."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Destination) {
    if (!canModerate) return;

    try {
      setMessage("");
      const response = await fetch(apiUrl(`/destinations/${item.id}/status`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar el destino.");
      }

      await fetchDestinations();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error actualizando destino."));
    }
  }

  async function deleteDestination(item: Destination) {
    if (!canModerate) return;

    const confirmed = window.confirm(
      `Eliminar/desactivar destino "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      setMessage("");
      const response = await fetch(apiUrl(`/destinations/${item.id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo eliminar el destino.");
      }

      await fetchDestinations();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error eliminando destino."));
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";

    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (formMode) {
    return (
      <main className="min-h-screen bg-[#F8F6F2] p-4 text-[#0D2B52] sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                Destinos
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {isEditRoute ? "Editar destino" : "Nuevo destino"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Administra contenido turistico, SEO, multimedia y traducciones.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/admin/destinos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          </div>

          {message && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {message}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 text-sm text-slate-500">
              Cargando destino...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Informacion principal</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Nombre</span>
                    <Input
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Slug</span>
                    <Input
                      value={form.slug}
                      onChange={(event) => updateForm("slug", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Descripcion corta</span>
                    <Textarea
                      value={form.shortDescription}
                      rows={3}
                      onChange={(event) =>
                        updateForm("shortDescription", event.target.value)
                      }
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Descripcion</span>
                    <Textarea
                      value={form.description}
                      rows={5}
                      onChange={(event) => updateForm("description", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Ubicacion</span>
                    <Input
                      value={form.location}
                      onChange={(event) => updateForm("location", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Orden</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(event) => updateForm("sortOrder", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#F8F6F2] px-4 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateForm("isActive", event.target.checked)}
                      disabled={!canModerate}
                    />
                    Activo
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#F8F6F2] px-4 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(event) => updateForm("isFeatured", event.target.checked)}
                      disabled={!formCanManage}
                    />
                    Destacado
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">SEO del destino</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estos campos ayudan a posicionar el destino en Google.
                </p>
                <div className="mt-4">
                  <SeoChecklist
                    slug={form.slug}
                    seoTitle={form.seoTitle}
                    seoDescription={form.seoDescription}
                    seoContent={form.seoContent}
                    faq={form.faqItems}
                    image={form.heroImage}
                    translations={form.translations}
                    minimumWords={700}
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Titulo SEO</span>
                    <Input
                      value={form.seoTitle}
                      onChange={(event) => updateForm("seoTitle", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Meta descripcion</span>
                    <Textarea
                      value={form.seoDescription}
                      rows={3}
                      onChange={(event) =>
                        updateForm("seoDescription", event.target.value)
                      }
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Contenido SEO extendido</span>
                    <Textarea
                      value={form.seoContent}
                      rows={6}
                      onChange={(event) => updateForm("seoContent", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <FaqEditor
                      value={stringifyFaqItems(form.faqItems)}
                      onChange={(value) =>
                        updateForm("faqItems", normalizeFaqItems(value))
                      }
                      disabled={!formCanManage}
                      title="Preguntas frecuentes del destino"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Multimedia</h2>
                <div className="mt-4 grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Imagen principal</span>
                    <Input
                      value={form.heroImage}
                      onChange={(event) => updateForm("heroImage", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Galeria JSON</span>
                    <Textarea
                      value={form.gallery}
                      rows={4}
                      placeholder='["https://.../imagen-1.jpg","https://.../imagen-2.jpg"]'
                      onChange={(event) => updateForm("gallery", event.target.value)}
                      disabled={!formCanManage}
                    />
                  </label>
                </div>
              </section>

              <TranslationEditor
                title="Traducciones"
                fields={[
                  { key: "name", label: "Nombre", baseValue: form.name },
                  {
                    key: "shortDescription",
                    label: "Descripcion corta",
                    type: "textarea",
                    baseValue: form.shortDescription,
                  },
                  {
                    key: "description",
                    label: "Descripcion",
                    type: "textarea",
                    baseValue: form.description,
                  },
                  { key: "location", label: "Ubicacion", baseValue: form.location },
                  { key: "seoTitle", label: "Titulo SEO", baseValue: form.seoTitle },
                  {
                    key: "seoDescription",
                    label: "Meta descripcion",
                    type: "textarea",
                    baseValue: form.seoDescription,
                  },
                  {
                    key: "seoContent",
                    label: "Contenido SEO",
                    type: "textarea",
                    baseValue: form.seoContent,
                  },
                  {
                    key: "faq",
                    label: "Preguntas frecuentes",
                    type: "textarea",
                    baseValue: stringifyFaqItems(form.faqItems),
                  },
                ]}
                value={form.translations}
                onChange={(value) => updateForm("translations", value)}
                disabled={!formCanManage}
              />

              {isEditRoute && (
                <ProductRelationsEditor
                  catalog={catalog}
                  relations={relations}
                  disabled={!formCanManage}
                  loading={relationsLoading}
                  saving={relationsSaving}
                  onChange={setRelations}
                  onSave={saveRelations}
                />
              )}

              <div className="flex flex-col gap-3 rounded-3xl border border-[#D4AF37]/20 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Los destinos activos aparecen en /destinos. Los destacados se priorizan.
                </p>
                <Button
                  type="submit"
                  disabled={!formCanManage || saving}
                  className="rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar destino"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F6F2] p-4 text-[#0D2B52] sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
              SEO turistico
            </p>
            <h1 className="mt-2 text-3xl font-bold">Destinos</h1>
            <p className="mt-2 text-sm text-slate-500">
              Crea y optimiza zonas, barrios y lugares de interes de Cartagena.
            </p>
          </div>
          {canCreate && (
            <Button asChild className="rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]">
              <Link href="/admin/destinos/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo destino
              </Link>
            </Button>
          )}
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {message}
          </div>
        )}

        <section className="mb-5 rounded-3xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o slug"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
            <select
              value={featuredFilter}
              onChange={(event) =>
                setFeaturedFilter(event.target.value as typeof featuredFilter)
              }
              className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="FEATURED">Destacados</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 text-sm text-slate-500">
            Cargando destinos...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D4AF37]/30 bg-white p-10 text-center">
            <MapPinned className="mx-auto h-10 w-10 text-[#B68D40]" />
            <h2 className="mt-4 text-xl font-bold">No hay destinos para mostrar</h2>
            <p className="mt-2 text-sm text-slate-500">
              Ajusta los filtros o crea un nuevo destino si tienes permisos.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={item.isActive ? "default" : "outline"}>
                        {item.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      {item.isFeatured && (
                        <Badge variant="outline" className="border-[#D4AF37] text-[#B68D40]">
                          <Star className="h-3 w-3" /> Destacado
                        </Badge>
                      )}
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-bold">
                      {item.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      /destinos/{item.slug}
                    </p>
                    {item.shortDescription && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {item.shortDescription}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.location && <span>Ubicacion: {item.location}</span>}
                      <span>Orden: {item.sortOrder ?? 0}</span>
                      <span>Actualizado: {formatDate(item.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href={`/destinos/${item.slug}`} target="_blank">
                        <ExternalLink className="mr-1 h-4 w-4" /> Ver publico
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href={`/admin/destinos/${item.id}/editar`}>
                        <Edit className="mr-1 h-4 w-4" /> Editar
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => toggleActive(item)}
                      disabled={!canModerate}
                    >
                      {item.isActive ? (
                        <>
                          <EyeOff className="mr-1 h-4 w-4" /> Desactivar
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-4 w-4" /> Activar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => deleteDestination(item)}
                      disabled={!canModerate}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
