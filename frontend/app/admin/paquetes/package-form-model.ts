import type { AdminMediaItem } from "@/components/admin/MediaGalleryEditor";
import type { ProductWizardStep } from "@/components/admin/ProductWizardProgress";
import {
  normalizeTranslations,
  type TranslationMap,
} from "@/components/admin/translations-model";

export type PackageComponent = {
  id?: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  includes?: string | null;
  excludes?: string | null;
  conditions?: string | null;
  duration?: string | null;
  location?: string | null;
  recommendations?: string | null;
  sortOrder?: number;
  active?: boolean;
  translations?: TranslationMap;
};

export type PackageItem = {
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
  translations?: unknown;
};

export type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
  packageId?: number | null;
  translations?: unknown;
};

export type PackageForm = {
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
  translations: TranslationMap;
};

export type PackageFormUpdate = (
  key: keyof PackageForm,
  value: string | boolean | AdminMediaItem[] | PackageComponent[] | TranslationMap
) => void;

export type ExtraForm = {
  name: string;
  description: string;
  price: string;
  translations: TranslationMap;
};

export type PackageWizardStep =
  | "basic"
  | "media"
  | "translations"
  | "features"
  | "pricing"
  | "premium"
  | "components"
  | "review";

export const packageWizardSteps: ProductWizardStep<PackageWizardStep>[] = [
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
    key: "translations",
    label: "Traducciones",
    description: "Versiones EN, FR, PT e IT con fallback a espanol.",
  },
  {
    key: "features",
    label: "Caracteristicas filtrables",
    description: "Filtros publicos PACKAGE + ALL del paquete.",
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
];

export const emptyForm: PackageForm = {
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
  translations: {},
};

export const emptyComponent: PackageComponent = {
  title: "",
  shortDescription: "",
  description: "",
  includes: "",
  excludes: "",
  conditions: "",
  duration: "",
  location: "",
  recommendations: "",
  sortOrder: 0,
  active: true,
  translations: {},
};

export const emptyExtraForm: ExtraForm = {
  name: "",
  description: "",
  price: "0",
  translations: {},
};

export function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

export function previewImage(item: PackageItem) {
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

export function toForm(item: PackageItem): PackageForm {
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
    components: (item.components || []).map((component) => ({
      ...component,
      translations: normalizeTranslations(component.translations),
    })),
    translations: normalizeTranslations(item.translations),
  };
}
