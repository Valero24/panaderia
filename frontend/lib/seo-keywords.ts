export type SeoPageType =
  | "home"
  | "properties"
  | "experiences"
  | "packages"
  | "destinations"
  | "blog";

export type SeoKeywordGroup = {
  primary: string[];
  secondary: string[];
  spanish: string[];
  english: string[];
};

export const seoKeywordMap: Record<SeoPageType, SeoKeywordGroup> = {
  home: {
    primary: [
      "luxury travel Cartagena",
      "turismo de lujo Cartagena",
      "private tours Cartagena",
      "luxury accommodations Cartagena",
    ],
    secondary: [
      "Cartagena Tailored Travel",
      "luxury tourism Cartagena",
      "Cartagena luxury experiences",
      "viajes personalizados Cartagena",
    ],
    spanish: [
      "turismo de lujo Cartagena",
      "tours privados Cartagena",
      "alojamientos premium Cartagena",
      "experiencias de lujo Cartagena",
    ],
    english: [
      "luxury travel Cartagena",
      "private tours Cartagena",
      "premium stays Cartagena",
      "luxury experiences Cartagena",
    ],
  },
  properties: {
    primary: [
      "villas de lujo Cartagena",
      "alojamiento en Cartagena",
      "luxury villas Cartagena",
      "luxury accommodations Cartagena",
      "luxury stays Cartagena",
      "alojamiento centro historico Cartagena",
    ],
    secondary: [
      "alojamientos Centro Historico Cartagena",
      "villa premium Cartagena",
      "premium stays Cartagena",
      "Cartagena luxury rentals",
    ],
    spanish: [
      "villas de lujo Cartagena",
      "alojamiento en Cartagena",
      "alojamiento Centro Historico Cartagena",
      "alojamientos premium Cartagena",
    ],
    english: [
      "luxury villas Cartagena",
      "luxury accommodations Cartagena",
      "premium stays Cartagena",
      "Cartagena luxury villa",
    ],
  },
  experiences: {
    primary: [
      "private tours Cartagena",
      "luxury experiences Cartagena",
      "yacht rental Cartagena",
      "Rosario Islands private tour",
      "gastronomy tour Cartagena",
    ],
    secondary: [
      "Cartagena private experiences",
      "Cartagena city tour private",
      "Rosario Islands private boat",
      "romantic dinner Cartagena",
    ],
    spanish: [
      "tours privados Cartagena",
      "experiencias de lujo Cartagena",
      "tour privado Islas del Rosario",
      "city tour privado Cartagena",
    ],
    english: [
      "private tours Cartagena",
      "yacht rental Cartagena",
      "luxury experiences Cartagena",
      "Rosario Islands private tour",
    ],
  },
  packages: {
    primary: [
      "Cartagena travel packages",
      "luxury Cartagena itinerary",
      "Cartagena premium package",
      "honeymoon package Cartagena",
      "Cartagena VIP package",
    ],
    secondary: [
      "Cartagena 3 day itinerary",
      "romantic Cartagena package",
      "Cartagena honeymoon package",
      "Cartagena islands package",
    ],
    spanish: [
      "paquetes turisticos Cartagena",
      "paquete premium Cartagena",
      "itinerario Cartagena 3 dias",
      "paquete romantico Cartagena",
    ],
    english: [
      "Cartagena travel packages",
      "luxury Cartagena itinerary",
      "Cartagena premium package",
      "Cartagena honeymoon package",
    ],
  },
  destinations: {
    primary: [
      "Centro Historico Cartagena",
      "Bocagrande Cartagena",
      "Getsemani Cartagena",
      "Islas del Rosario Cartagena",
      "Baru Cartagena",
    ],
    secondary: [
      "lugares turisticos Cartagena",
      "Cartagena destinations",
      "Cartagena neighborhoods",
      "Rosario Islands from Cartagena",
    ],
    spanish: [
      "que hacer en Cartagena",
      "Centro Historico Cartagena",
      "Bocagrande Cartagena",
      "Islas del Rosario Cartagena",
      "Getsemani Cartagena",
      "Iglesias de Cartagena",
    ],
    english: [
      "what to do in Cartagena",
      "Cartagena Historic Center",
      "Bocagrande Cartagena",
      "Rosario Islands Cartagena",
      "Getsemani Cartagena",
    ],
  },
  blog: {
    primary: [
      "que hacer en Cartagena",
      "mejores playas Cartagena",
      "guia Cartagena",
      "Cartagena en 3 dias",
      "why visit Cartagena",
    ],
    secondary: [
      "Cartagena travel guide",
      "Cartagena luxury travel blog",
      "Cartagena itinerary",
      "Cartagena beaches guide",
      "Cartagena recommendations",
    ],
    spanish: [
      "que hacer en Cartagena",
      "mejores playas Cartagena",
      "guia Cartagena",
      "Cartagena en 3 dias",
      "recomendaciones Cartagena",
    ],
    english: [
      "why visit Cartagena",
      "Cartagena travel guide",
      "best beaches Cartagena",
      "Cartagena in 3 days",
      "Cartagena itinerary",
    ],
  },
};

export const propertySeoEditorialTemplate = [
  "Sobre este alojamiento",
  "Ubicacion y entorno",
  "Servicios y comodidades",
  "Ideal para",
  "Que hacer cerca",
  "Recomendaciones antes de reservar",
  "Preguntas frecuentes",
];

export const experienceSeoEditorialTemplate = [
  "Sobre esta experiencia",
  "Que viviras",
  "Itinerario sugerido",
  "Duracion y horarios",
  "Punto de encuentro",
  "Que incluye",
  "Que no incluye",
  "Recomendaciones",
  "Condiciones",
  "Preguntas frecuentes",
];

export const packageSeoEditorialTemplate = [
  "Sobre este paquete",
  "Para quien es ideal",
  "Itinerario sugerido",
  "Alojamientos o zonas recomendadas",
  "Experiencias incluidas o recomendadas",
  "Que incluye",
  "Que no incluye",
  "Politicas y condiciones",
  "Recomendaciones",
  "Preguntas frecuentes",
];

export const destinationSeoEditorialTemplate = [
  "Introduccion al destino",
  "Por que visitar esta zona",
  "Que hacer alli",
  "Donde hospedarse cerca",
  "Experiencias recomendadas",
  "Consejos para visitantes",
  "Preguntas frecuentes",
];

export const blogSeoEditorialTemplate = [
  "Titulo principal",
  "Introduccion util",
  "Secciones con H2 y H3",
  "Listas practicas",
  "Enlaces internos a destinos y productos",
  "Recomendaciones accionables",
  "CTA final",
];
