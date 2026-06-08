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
  Newspaper,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";

import SeoChecklist from "@/components/admin/SeoChecklist";
import TranslationEditor from "@/components/admin/TranslationEditor";
import type { TranslationMap } from "@/components/admin/translations-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";
import { normalizeSeoSlug } from "@/lib/slug";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  category?: string | null;
  tags?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: unknown;
  authorName?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  isFeatured: boolean;
  translations?: TranslationMap | null;
  updatedAt?: string | null;
};

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  authorName: string;
  isPublished: boolean;
  isFeatured: boolean;
  translations: TranslationMap;
};

const emptyForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  authorName: "Cartagena Tailored Travel",
  isPublished: false,
  isFeatured: false,
  translations: {},
};

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function arrayToText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }

  if (typeof value === "string") return value;

  return "";
}

function textToArray(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

function toForm(item: BlogPost): BlogForm {
  return {
    title: item.title || "",
    slug: item.slug || "",
    excerpt: item.excerpt || "",
    content: item.content || "",
    coverImage: item.coverImage || "",
    category: item.category || "",
    tags: arrayToText(item.tags),
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
    seoKeywords: arrayToText(item.seoKeywords),
    authorName: item.authorName || "",
    isPublished: Boolean(item.isPublished),
    isFeatured: Boolean(item.isFeatured),
    translations: item.translations || {},
  };
}

function friendlyError(error: any, fallback: string) {
  const message = error?.message;
  if (Array.isArray(message)) return fallback;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
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

export default function BlogAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const isNewRoute = pathname?.endsWith("/nuevo");
  const isEditRoute = pathname?.endsWith("/editar");
  const formMode = Boolean(isNewRoute || isEditRoute);
  const editId = Number(params?.id || 0);

  const [items, setItems] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  const canManage = useMemo(() => ["SUPERADMIN", "ADMIN"].includes(role), [role]);
  const canDelete = role === "SUPERADMIN";
  const filteredItems = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !cleanSearch ||
        item.title.toLowerCase().includes(cleanSearch) ||
        item.slug.toLowerCase().includes(cleanSearch) ||
        String(item.category || "").toLowerCase().includes(cleanSearch);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" ? item.isPublished : !item.isPublished);

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  function updateForm<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((current) => {
      if (key === "slug") {
        return { ...current, slug: normalizeSeoSlug(String(value)) };
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

      return { ...current, [key]: value };
    });
  }

  async function fetchPosts() {
    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(apiUrl("/blog/admin/all"), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudieron cargar articulos.");
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setMessage(friendlyError(error, "Error cargando articulos."));
    } finally {
      setLoading(false);
    }
  }

  async function loadPostForEdit(id: number) {
    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(apiUrl(`/blog/admin/${id}`), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo cargar el articulo.");
      }

      setForm(toForm(data));
    } catch (error: any) {
      setMessage(friendlyError(error, "Error cargando articulo."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(readRole());
  }, []);

  useEffect(() => {
    if (!role) return;
    if (formMode && isEditRoute && editId) {
      loadPostForEdit(editId);
      return;
    }
    if (formMode) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }
    fetchPosts();
  }, [editId, formMode, isEditRoute, role]);

  function payloadFromForm() {
    return {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      category: form.category,
      tags: textToArray(form.tags),
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      seoKeywords: textToArray(form.seoKeywords),
      authorName: form.authorName,
      isPublished: form.isPublished,
      isFeatured: form.isFeatured,
      translations: form.translations,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving) return;

    try {
      setSaving(true);
      setMessage("");
      const response = await fetch(
        apiUrl(isEditRoute ? `/blog/${editId}` : "/blog"),
        {
          method: isEditRoute ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payloadFromForm()),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo guardar el articulo.");
      }

      router.push("/admin/blog");
      router.refresh();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error guardando articulo."));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: BlogPost) {
    if (!canManage) return;

    try {
      setMessage("");
      const response = await fetch(apiUrl(`/blog/${item.id}/publish`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo actualizar el estado.");
      }

      await fetchPosts();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error actualizando estado."));
    }
  }

  async function deletePost(item: BlogPost) {
    if (!canDelete) return;
    if (!window.confirm(`Eliminar articulo "${item.title}"?`)) return;

    try {
      setMessage("");
      const response = await fetch(apiUrl(`/blog/${item.id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo eliminar el articulo.");
      }

      await fetchPosts();
    } catch (error: any) {
      setMessage(friendlyError(error, "Error eliminando articulo."));
    }
  }

  if (formMode) {
    return (
      <main className="min-h-screen bg-[#F8F6F2] p-4 text-[#0D2B52] sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#B68D40]">
                Blog SEO
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {isEditRoute ? "Editar articulo" : "Nuevo articulo"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Crea contenido editorial para posicionamiento organico.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/admin/blog">
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
              Cargando articulo...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Informacion editorial</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Titulo</span>
                    <Input
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Slug</span>
                    <Input
                      value={form.slug}
                      onChange={(event) => updateForm("slug", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Categoria</span>
                    <Input
                      value={form.category}
                      onChange={(event) => updateForm("category", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Autor</span>
                    <Input
                      value={form.authorName}
                      onChange={(event) => updateForm("authorName", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Resumen</span>
                    <Textarea
                      value={form.excerpt}
                      rows={3}
                      onChange={(event) => updateForm("excerpt", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Contenido</span>
                    <Textarea
                      value={form.content}
                      rows={12}
                      onChange={(event) => updateForm("content", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Imagen principal</span>
                    <Input
                      value={form.coverImage}
                      onChange={(event) => updateForm("coverImage", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Tags separados por coma</span>
                    <Input
                      value={form.tags}
                      onChange={(event) => updateForm("tags", event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#F8F6F2] px-4 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) =>
                        updateForm("isPublished", event.target.checked)
                      }
                      disabled={!canManage}
                    />
                    Publicado
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#F8F6F2] px-4 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(event) =>
                        updateForm("isFeatured", event.target.checked)
                      }
                      disabled={!canManage}
                    />
                    Destacado
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">SEO del articulo</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estos campos ayudan a posicionar el articulo en Google.
                </p>
                <div className="mt-4">
                  <SeoChecklist
                    slug={form.slug}
                    seoTitle={form.seoTitle}
                    seoDescription={form.seoDescription}
                    seoContent={form.content}
                    image={form.coverImage}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Keywords SEO separadas por coma</span>
                    <Input
                      value={form.seoKeywords}
                      onChange={(event) =>
                        updateForm("seoKeywords", event.target.value)
                      }
                      disabled={!canManage}
                    />
                  </label>
                </div>
              </section>

              <TranslationEditor
                title="Traducciones"
                fields={[
                  { key: "title", label: "Titulo", baseValue: form.title },
                  {
                    key: "excerpt",
                    label: "Resumen",
                    type: "textarea",
                    baseValue: form.excerpt,
                  },
                  {
                    key: "content",
                    label: "Contenido",
                    type: "textarea",
                    baseValue: form.content,
                  },
                  { key: "seoTitle", label: "Titulo SEO", baseValue: form.seoTitle },
                  {
                    key: "seoDescription",
                    label: "Meta descripcion",
                    type: "textarea",
                    baseValue: form.seoDescription,
                  },
                ]}
                value={form.translations}
                onChange={(value) => updateForm("translations", value)}
                disabled={!canManage}
              />

              <div className="flex flex-col gap-3 rounded-3xl border border-[#D4AF37]/20 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Solo los articulos publicados aparecen en /blog.
                </p>
                <Button
                  type="submit"
                  disabled={!canManage || saving}
                  className="rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar articulo"}
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
              SEO editorial
            </p>
            <h1 className="mt-2 text-3xl font-bold">Blog</h1>
            <p className="mt-2 text-sm text-slate-500">
              Administra articulos para posicionamiento organico turistico.
            </p>
          </div>
          {canManage && (
            <Button asChild className="rounded-xl bg-[#0D2B52] text-white hover:bg-[#12396d]">
              <Link href="/admin/blog/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo articulo
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
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo, slug o categoria"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="DRAFT">Borradores</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 text-sm text-slate-500">
            Cargando articulos...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D4AF37]/30 bg-white p-10 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-[#B68D40]" />
            <h2 className="mt-4 text-xl font-bold">No hay articulos para mostrar</h2>
            <p className="mt-2 text-sm text-slate-500">
              Crea el primer articulo SEO o ajusta los filtros.
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
                      <Badge variant={item.isPublished ? "default" : "outline"}>
                        {item.isPublished ? "Publicado" : "Borrador"}
                      </Badge>
                      {item.isFeatured && (
                        <Badge variant="outline" className="border-[#D4AF37] text-[#B68D40]">
                          <Star className="h-3 w-3" /> Destacado
                        </Badge>
                      )}
                      {item.category && <Badge variant="outline">{item.category}</Badge>}
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-bold">
                      {item.title}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      /blog/{item.slug}
                    </p>
                    {item.excerpt && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>Publicado: {formatDate(item.publishedAt)}</span>
                      <span>Actualizado: {formatDate(item.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.isPublished && (
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link href={`/blog/${item.slug}`} target="_blank">
                          <ExternalLink className="mr-1 h-4 w-4" /> Ver
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href={`/admin/blog/${item.id}/editar`}>
                        <Edit className="mr-1 h-4 w-4" /> Editar
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => togglePublished(item)}
                      disabled={!canManage}
                    >
                      {item.isPublished ? (
                        <>
                          <EyeOff className="mr-1 h-4 w-4" /> Despublicar
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-4 w-4" /> Publicar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => deletePost(item)}
                      disabled={!canDelete}
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
