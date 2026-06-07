import type { AdminMediaItem } from "@/components/admin/MediaGalleryEditor";
import type { ProductWizardStep } from "@/components/admin/ProductWizardProgress";
import {
  normalizeTranslations,
  type TranslationMap,
} from "@/components/admin/translations-model";

export type Experience = {
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoContent?: string | null;
  itinerary?: string | null;
  included?: string | null;
  notIncluded?: string | null;
  meetingPoint?: string | null;
  durationDescription?: string | null;
  schedule?: string | null;
  conditions?: string | null;
  faq?: unknown;
  experienceCategory?: string | null;
  images?: AdminMediaItem[];
  translations?: unknown;
};

export type ExtraService = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
  experienceId?: number | null;
  translations?: unknown;
};

export type ExperienceForm = {
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
  seoTitle: string;
  seoDescription: string;
  seoContent: string;
  itinerary: string;
  included: string;
  notIncluded: string;
  meetingPoint: string;
  durationDescription: string;
  schedule: string;
  conditions: string;
  faq: string;
  experienceCategory: string;
  images: AdminMediaItem[];
  active: boolean;
  translations: TranslationMap;
};

export type ExperienceFormUpdate = (
  key: keyof ExperienceForm,
  value: string | boolean | AdminMediaItem[] | TranslationMap
) => void;

export type ExtraForm = {
  name: string;
  description: string;
  price: string;
  translations: TranslationMap;
};

export type ExperienceWizardStep =
  | "basic"
  | "media"
  | "translations"
  | "features"
  | "pricing"
  | "premium"
  | "review";

export const experienceWizardSteps: ProductWizardStep<ExperienceWizardStep>[] = [
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
    description: "Filtros públicos EXPERIENCE + ALL de experiencias.",
  },
  {
    key: "pricing",
    label: "Precios y condiciones",
    description: "Tarifa, políticas y recomendaciones.",
  },
  {
    key: "premium",
    label: "Servicios premium",
    description: "Complementos opcionales.",
  },
  {
    key: "review",
    label: "Revisión",
    description: "Resumen antes de guardar.",
  },
];

export const emptyForm: ExperienceForm = {
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
  seoTitle: "",
  seoDescription: "",
  seoContent: "",
  itinerary: "",
  included: "",
  notIncluded: "",
  meetingPoint: "",
  durationDescription: "",
  schedule: "",
  conditions: "",
  faq: "",
  experienceCategory: "",
  images: [],
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

export function previewImage(experience: Experience) {
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

export function toForm(experience: Experience): ExperienceForm {
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
    seoTitle: experience.seoTitle || "",
    seoDescription: experience.seoDescription || "",
    seoContent: experience.seoContent || "",
    itinerary: experience.itinerary || "",
    included: experience.included || "",
    notIncluded: experience.notIncluded || "",
    meetingPoint: experience.meetingPoint || "",
    durationDescription: experience.durationDescription || "",
    schedule: experience.schedule || "",
    conditions: experience.conditions || "",
    faq: experience.faq ? JSON.stringify(experience.faq, null, 2) : "",
    experienceCategory: experience.experienceCategory || "",
    images: experience.images || [],
    active: Boolean(experience.active),
    translations: normalizeTranslations(experience.translations),
  };
}
