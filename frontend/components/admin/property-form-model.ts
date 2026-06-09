import type { AdminMediaItem } from "@/components/admin/MediaGalleryEditor";
import type { ProductWizardStep } from "@/components/admin/ProductWizardProgress";
import {
  normalizeTranslations,
  type TranslationMap,
} from "@/components/admin/translations-model";

export type PropertyStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FEATURED"
  | "MAINTENANCE"
  | "ARCHIVED";

export type PropertyFormStep =
  | "basic"
  | "translations"
  | "pricing"
  | "media"
  | "features"
  | "premium"
  | "review";

export type PropertyFormState = {
  id?: number;
  title: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  description: string;
  status: PropertyStatus;
  pricePerNight: string;
  basePrice: string;
  cleaningFee: string;
  serviceFee: string;
  taxes: string;
  highSeasonPrice: string;
  lowSeasonPrice: string;
  twoGuestsIncrease: string;
  extraGuestIncrease: string;
  maxGuests: string;
  maxCapacity: string;
  bedrooms: string;
  bathrooms: string;
  minimumNights: string;
  allowsPets: boolean;
  allowsSmoking: boolean;
  allowsEvents: boolean;
  allowsChildren: boolean;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  latitude: string;
  longitude: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoContent: string;
  nearbyAttractions: string;
  locationDescription: string;
  guestRecommendations: string;
  faq: string;
  internalNotes: string;
  images: AdminMediaItem[];
  featureIds: number[];
  translations: TranslationMap;
  translationStatus?: string | null;
  translationError?: string | null;
};

export type PropertyFormUpdate = (
  key: keyof PropertyFormState,
  value: any
) => void;

export const propertyWizardSteps: ProductWizardStep<PropertyFormStep>[] = [
  {
    key: "basic",
    label: "Información básica",
    description: "Nombre, ubicación, capacidad y estado.",
  },
  {
    key: "media",
    label: "Multimedia",
    description: "Fotos, videos y recorrido visual.",
  },
  {
    key: "translations",
    label: "Traducciones",
    description: "Versiones EN, FR, PT e IT con fallback a español.",
  },
  {
    key: "features",
    label: "Características filtrables",
    description: "Filtros públicos PROPERTY + ALL aplicables al alojamiento.",
  },
  {
    key: "pricing",
    label: "Precios y condiciones",
    description: "Tarifas, reglas, SEO y notas internas.",
  },
  {
    key: "premium",
    label: "Servicios premium",
    description: "Complementos opcionales del alojamiento.",
  },
  {
    key: "review",
    label: "Revisión",
    description: "Vista final antes de publicar.",
  },
];

export function emptyPropertyForm(): PropertyFormState {
  return {
    title: "",
    slug: "",
    city: "",
    area: "",
    address: "",
    description: "",
    status: "DRAFT",
    pricePerNight: "",
    basePrice: "",
    cleaningFee: "",
    serviceFee: "",
    taxes: "",
    highSeasonPrice: "",
    lowSeasonPrice: "",
    twoGuestsIncrease: "",
    extraGuestIncrease: "",
    maxGuests: "",
    maxCapacity: "",
    bedrooms: "",
    bathrooms: "",
    minimumNights: "",
    allowsPets: false,
    allowsSmoking: false,
    allowsEvents: false,
    allowsChildren: true,
    checkInTime: "",
    checkOutTime: "",
    cancellationPolicy: "",
    latitude: "",
    longitude: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoContent: "",
    nearbyAttractions: "",
    locationDescription: "",
    guestRecommendations: "",
    faq: "",
    internalNotes: "",
    images: [],
    featureIds: [],
    translations: {},
    translationStatus: "NOT_REQUESTED",
    translationError: null,
  };
}

export function toInputValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function toNumber(value: string) {
  if (!value || value === "") {
    return 0;
  }

  return Number(value);
}

export function buildPropertyFormState(
  property: any,
  featureAssignments: Array<{ featureId: number | string }>
): PropertyFormState {
  return {
    id: property.id,
    title: toInputValue(property.title),
    slug: toInputValue(property.slug),
    city: toInputValue(property.city),
    area: toInputValue(property.area),
    address: toInputValue(property.address),
    description: toInputValue(property.description),
    status: property.status || "DRAFT",
    pricePerNight: toInputValue(property.pricePerNight),
    basePrice: toInputValue(property.basePrice),
    cleaningFee: toInputValue(property.cleaningFee),
    serviceFee: toInputValue(property.serviceFee),
    taxes: toInputValue(property.taxes),
    highSeasonPrice: toInputValue(property.highSeasonPrice),
    lowSeasonPrice: toInputValue(property.lowSeasonPrice),
    twoGuestsIncrease: toInputValue(property.twoGuestsIncrease),
    extraGuestIncrease: toInputValue(property.extraGuestIncrease),
    maxGuests: toInputValue(property.maxGuests),
    maxCapacity: toInputValue(property.maxCapacity),
    bedrooms: toInputValue(property.bedrooms),
    bathrooms: toInputValue(property.bathrooms),
    minimumNights: toInputValue(property.minimumNights),
    allowsPets: Boolean(property.allowsPets),
    allowsSmoking: Boolean(property.allowsSmoking),
    allowsEvents: Boolean(property.allowsEvents),
    allowsChildren: property.allowsChildren ?? true,
    checkInTime: toInputValue(property.checkInTime),
    checkOutTime: toInputValue(property.checkOutTime),
    cancellationPolicy: toInputValue(property.cancellationPolicy),
    latitude: toInputValue(property.latitude),
    longitude: toInputValue(property.longitude),
    seoTitle: toInputValue(property.seoTitle),
    seoDescription: toInputValue(property.seoDescription),
    seoKeywords: toInputValue(property.seoKeywords),
    seoContent: toInputValue(property.seoContent),
    nearbyAttractions: toInputValue(property.nearbyAttractions),
    locationDescription: toInputValue(property.locationDescription),
    guestRecommendations: toInputValue(property.guestRecommendations),
    faq: property.faq ? JSON.stringify(property.faq, null, 2) : "",
    internalNotes: toInputValue(property.internalNotes),
    images: Array.isArray(property.images) ? property.images : [],
    featureIds: featureAssignments.map((item) => Number(item.featureId)),
    translations: normalizeTranslations(property.translations),
    translationStatus: property.translationStatus || "NOT_REQUESTED",
    translationError: property.translationError || null,
  };
}
