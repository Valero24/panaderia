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
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  faq?: unknown;
  active: boolean;
  images?: AdminMediaItem[];
  components?: PackageComponent[];
  translations?: unknown;
  translationStatus?: string | null;
  translationError?: string | null;
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
  id?: number;
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
  seoTitle: string;
  seoDescription: string;
  seoContent: string;
  faq: string;
  active: boolean;
  images: AdminMediaItem[];
  components: PackageComponent[];
  translations: TranslationMap;
  translationStatus?: string | null;
  translationError?: string | null;
};

export type PackageFormUpdate = (
  key: keyof PackageForm,
  value: string | boolean | AdminMediaItem[] | PackageComponent[] | TranslationMap | number | null
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
    label: "Información básica",
    description: "Título, ubicación, duración y capacidad.",
  },
  {
    key: "media",
    label: "Multimedia",
    description: "Imagen principal y galería.",
  },
  {
    key: "translations",
    label: "Traducciones",
    description: "Versiones EN, FR, PT e IT con fallback a español.",
  },
  {
    key: "features",
    label: "Características filtrables",
    description: "Filtros públicos PACKAGE + ALL del paquete.",
  },
  {
    key: "pricing",
    label: "Precios y condiciones",
    description: "Tarifa, incluye, políticas y recomendaciones.",
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
    label: "Revisión",
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
  seoTitle: "",
  seoDescription: "",
  seoContent: "",
  faq: "",
  active: true,
  images: [],
  components: [],
  translations: {},
  translationStatus: "NOT_REQUESTED",
  translationError: null,
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
    id: item.id,
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
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
    seoContent: item.seoContent || "",
    faq: item.faq ? JSON.stringify(item.faq, null, 2) : "",
    active: Boolean(item.active),
    images: item.images || [],
    components: (item.components || []).map((component) => ({
      ...component,
      translations: normalizeTranslations(component.translations),
    })),
    translations: normalizeTranslations(item.translations),
    translationStatus: (item as any).translationStatus || "NOT_REQUESTED",
    translationError: (item as any).translationError || null,
  };
}
