import { BadRequestException, Injectable } from "@nestjs/common";
import { BulkImportType } from "@prisma/client";
import ExcelJS from "exceljs";

type WorksheetWithValidations = ExcelJS.Worksheet & {
  dataValidations: {
    add: (range: string, validation: Record<string, unknown>) => void;
  };
};

type TemplateColumn = {
  key: string;
  header: string;
  required?: boolean;
  maxLength?: number;
  rule: string;
  example: string;
  width?: number;
  allowedValues?: string[];
};

type TemplateConfig = {
  type: BulkImportType;
  label: string;
  sheetName: string;
  fileName: string;
  description: string;
  columns: TemplateColumn[];
};

const standardLimits = {
  name: 120,
  slug: 150,
  shortText: 300,
  description: 2000,
  seoTitle: 70,
  seoDescription: 160,
  seoContent: 15000,
  faq: 5000,
  itinerary: 8000,
  included: 3000,
  notIncluded: 3000,
  policies: 4000,
  recommendations: 4000,
  mediaUrl: 500,
  mediaTitle: 120,
  mediaDescription: 300,
  tags: 500,
};

const instructionLines = [
  "No modificar encabezados.",
  "No eliminar columnas.",
  "No usar macros.",
  "No usar fórmulas.",
  "Solo subir archivos .xlsx.",
  "Respetar límites de caracteres.",
  "Multimedia se carga por URL.",
  "Cada URL multimedia debe indicar tipo IMAGE o VIDEO.",
  "Solo una multimedia principal por fila.",
  "Campos SI/NO deben escribirse exactamente SI o NO.",
  "Listas separadas por coma.",
  "FAQ en formato pregunta|respuesta; pregunta|respuesta.",
  "Campos largos pueden contener saltos de línea, pero no deben superar el límite indicado.",
  "Si slug queda vacío, el sistema lo genera automáticamente.",
  "Si traducciones quedan vacías, el sistema podrá generarlas automáticamente después.",
];

function column(
  key: string,
  header: string,
  rule: string,
  example: string,
  options: Partial<TemplateColumn> = {}
): TemplateColumn {
  return {
    key,
    header,
    rule,
    example,
    width: options.width || 28,
    ...options,
  };
}

function mediaColumns(): TemplateColumn[] {
  return [1, 2, 3].flatMap((index) => [
    column(
      `media${index}Type`,
      `media_${index}_tipo`,
      "Obligatorio si media_url existe. Valores permitidos: IMAGE o VIDEO.",
      index === 1 ? "IMAGE" : "",
      {
        width: 18,
        allowedValues: ["IMAGE", "VIDEO"],
      }
    ),
    column(
      `media${index}Url`,
      `media_${index}_url`,
      "URL pública. No se descargan archivos; solo se guardará la URL en importación futura.",
      index === 1 ? "https://example.com/imagen.jpg" : "",
      {
        width: 44,
        maxLength: standardLimits.mediaUrl,
      }
    ),
    column(
      `media${index}Title`,
      `media_${index}_titulo`,
      "Título descriptivo de la multimedia.",
      index === 1 ? "Vista principal" : "",
      {
        width: 28,
        maxLength: standardLimits.mediaTitle,
      }
    ),
    column(
      `media${index}Description`,
      `media_${index}_descripcion`,
      "Descripción breve de la multimedia.",
      index === 1 ? "Imagen principal del servicio" : "",
      {
        width: 36,
        maxLength: standardLimits.mediaDescription,
      }
    ),
    column(
      `media${index}Main`,
      `media_${index}_principal`,
      "Usar SI o NO. Solo una multimedia principal por fila.",
      index === 1 ? "SI" : "NO",
      {
        width: 20,
        allowedValues: ["SI", "NO"],
      }
    ),
  ]);
}

function translationColumns(): TemplateColumn[] {
  return ["en", "fr", "pt", "it"].flatMap((locale) => [
    column(
      `${locale}Name`,
      `${locale}_nombre`,
      "Traducción opcional del nombre.",
      "",
      { maxLength: standardLimits.name, width: 28 }
    ),
    column(
      `${locale}ShortDescription`,
      `${locale}_descripcion_corta`,
      "Traducción opcional de la descripción corta.",
      "",
      { maxLength: standardLimits.shortText, width: 36 }
    ),
    column(
      `${locale}Description`,
      `${locale}_descripcion`,
      "Traducción opcional de la descripción.",
      "",
      { maxLength: standardLimits.description, width: 44 }
    ),
    column(
      `${locale}SeoTitle`,
      `${locale}_seo_titulo`,
      "Traducción opcional del título SEO.",
      "",
      { maxLength: standardLimits.seoTitle, width: 32 }
    ),
    column(
      `${locale}SeoDescription`,
      `${locale}_seo_descripcion`,
      "Traducción opcional de la meta descripción.",
      "",
      { maxLength: standardLimits.seoDescription, width: 38 }
    ),
    column(
      `${locale}SeoContent`,
      `${locale}_contenido_seo`,
      "Traducción opcional del contenido SEO.",
      "",
      { maxLength: standardLimits.seoContent, width: 48 }
    ),
  ]);
}

function experienceTranslationColumns(): TemplateColumn[] {
  const fields = [
    ["nombre", standardLimits.name],
    ["descripcion_corta", standardLimits.shortText],
    ["descripcion", standardLimits.description],
    ["itinerario", standardLimits.itinerary],
    ["incluye", standardLimits.included],
    ["no_incluye", standardLimits.notIncluded],
    ["condiciones", standardLimits.policies],
    ["recomendaciones", standardLimits.recommendations],
    ["faq", standardLimits.faq],
  ] as const;

  return ["en", "fr", "pt", "it"].flatMap((locale) =>
    fields.map(([field, maxLength]) =>
      column(
        `${locale}${field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`,
        `${locale}_${field}`,
        `Traducción opcional de ${field.replace(/_/g, " ")}.`,
        "",
        { maxLength, width: field === "faq" ? 48 : 36 }
      )
    )
  );
}

function packageTranslationColumns(): TemplateColumn[] {
  const fields = [
    ["nombre", standardLimits.name],
    ["descripcion_corta", standardLimits.shortText],
    ["descripcion", standardLimits.description],
    ["contenido_seo", standardLimits.seoContent],
    ["itinerario", standardLimits.itinerary],
    ["incluye", standardLimits.included],
    ["no_incluye", standardLimits.notIncluded],
    ["politicas", standardLimits.policies],
    ["recomendaciones", standardLimits.recommendations],
    ["faq", standardLimits.faq],
  ] as const;

  return ["en", "fr", "pt", "it"].flatMap((locale) =>
    fields.map(([field, maxLength]) =>
      column(
        `${locale}${field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`,
        `${locale}_${field}`,
        `Traducción opcional de ${field.replace(/_/g, " ")}.`,
        "",
        { maxLength, width: field === "faq" ? 48 : 36 }
      )
    )
  );
}

function packageComponentColumns(): TemplateColumn[] {
  const allowedValues = ["ALOJAMIENTO", "EXPERIENCIA", "TRANSPORTE", "SERVICIO", "OTRO"];

  return [1, 2, 3].flatMap((index) => [
    column(
      `component${index}Type`,
      `componente_${index}_tipo`,
      "Tipo de componente. Valores permitidos: ALOJAMIENTO, EXPERIENCIA, TRANSPORTE, SERVICIO, OTRO.",
      index === 1 ? "EXPERIENCIA" : "",
      { width: 24, allowedValues }
    ),
    column(
      `component${index}Name`,
      `componente_${index}_nombre`,
      "Nombre del componente.",
      index === 1 ? "Tour privado Islas del Rosario" : "",
      { width: 34, maxLength: standardLimits.name }
    ),
    column(
      `component${index}Description`,
      `componente_${index}_descripcion`,
      "Descripción breve del componente.",
      index === 1 ? "Experiencia privada incluida en el paquete." : "",
      { width: 44, maxLength: standardLimits.shortText }
    ),
    column(
      `component${index}Day`,
      `componente_${index}_dia`,
      "Día sugerido del itinerario.",
      index === 1 ? "1" : "",
      { width: 18 }
    ),
    column(
      `component${index}Order`,
      `componente_${index}_orden`,
      "Orden del componente dentro del día.",
      index === 1 ? "1" : "",
      { width: 20 }
    ),
  ]);
}

const propertyColumns: TemplateColumn[] = [
  column("name", "nombre", "Nombre visible del alojamiento.", "Villa Premium Centro Histórico", {
    required: true,
    maxLength: standardLimits.name,
    width: 30,
  }),
  column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "villa-premium-centro-historico", {
    maxLength: standardLimits.slug,
    width: 34,
  }),
  column("shortDescription", "descripcion_corta", "Resumen comercial breve.", "Villa premium con ubicación estratégica en Cartagena.", {
    required: true,
    maxLength: standardLimits.shortText,
    width: 42,
  }),
  column("description", "descripcion", "Descripción principal en español.", "Alojamiento premium para disfrutar Cartagena con comodidad.", {
    maxLength: standardLimits.description,
    width: 48,
  }),
  column("location", "ubicacion", "Ubicación general o dirección aproximada.", "Cartagena, Colombia", {
    maxLength: standardLimits.shortText,
    width: 30,
  }),
  column("neighborhood", "barrio", "Barrio o zona turística.", "Centro Histórico", {
    maxLength: standardLimits.name,
    width: 24,
  }),
  column("capacity", "capacidad", "Número máximo de huéspedes.", "8", { width: 14 }),
  column("bedrooms", "habitaciones", "Número de habitaciones.", "4", { width: 16 }),
  column("bathrooms", "banos", "Número de baños.", "3", { width: 12 }),
  column("priceCop", "precio_cop", "Precio base en pesos colombianos.", "980000", {
    required: true,
    width: 18,
  }),
  column("active", "activo", "Usar SI o NO.", "SI", {
    width: 14,
    allowedValues: ["SI", "NO"],
  }),
  column("featured", "destacado", "Usar SI o NO.", "NO", {
    width: 14,
    allowedValues: ["SI", "NO"],
  }),
  column("destinationSlugs", "destinos_relacionados", "Slugs separados por coma.", "centro-historico,bocagrande", {
    maxLength: standardLimits.tags,
    width: 38,
  }),
  column("features", "caracteristicas", "Características separadas por coma.", "piscina,terraza privada,vista al mar", {
    maxLength: standardLimits.tags,
    width: 38,
  }),
  column("includedServices", "servicios_incluidos", "Servicios incluidos separados por coma.", "limpieza,asistencia personalizada", {
    maxLength: standardLimits.tags,
    width: 40,
  }),
  column("availableExtras", "extras_disponibles", "Servicios extra separados por coma.", "chef privado,transporte aeropuerto", {
    maxLength: standardLimits.tags,
    width: 40,
  }),
  column("checkIn", "check_in", "Hora sugerida de ingreso.", "15:00", { width: 14 }),
  column("checkOut", "check_out", "Hora sugerida de salida.", "11:00", { width: 14 }),
  column("minimumStay", "estadia_minima", "Número mínimo de noches.", "2", { width: 18 }),
  column("manualValidation", "validacion_manual", "Usar SI o NO.", "SI", {
    width: 20,
    allowedValues: ["SI", "NO"],
  }),
  column("seoTitle", "seo_titulo", "Título SEO recomendado.", "Villa Premium en Cartagena | Cartagena Tailored Travel", {
    maxLength: standardLimits.seoTitle,
    width: 38,
  }),
  column("seoDescription", "seo_descripcion", "Meta description SEO.", "Hospédate en una villa premium en Cartagena con atención personalizada.", {
    maxLength: standardLimits.seoDescription,
    width: 44,
  }),
  column("seoContent", "contenido_seo", "Contenido SEO visible y extendido.", "Contenido SEO sobre ubicación, servicios y experiencia del huésped.", {
    maxLength: standardLimits.seoContent,
    width: 56,
  }),
  column("locationDescription", "descripcion_ubicacion", "Contexto local, barrio y ventajas de ubicación.", "Ubicado cerca del Centro Histórico y zonas turísticas.", {
    maxLength: standardLimits.description,
    width: 46,
  }),
  column("nearbyAttractions", "atracciones_cercanas", "Atracciones separadas por coma.", "Ciudad Amurallada,Getsemaní,Castillo San Felipe", {
    maxLength: standardLimits.tags,
    width: 44,
  }),
  column("guestRecommendations", "recomendaciones_huesped", "Recomendaciones para el huésped.", "Ideal para familias y grupos que buscan comodidad premium.", {
    maxLength: standardLimits.recommendations,
    width: 48,
  }),
  column("faq", "faq", "Formato pregunta|respuesta; pregunta|respuesta.", "¿Incluye limpieza?|Sí, según disponibilidad.; ¿Tiene piscina?|Sí.", {
    maxLength: standardLimits.faq,
    width: 58,
  }),
  ...mediaColumns(),
  ...translationColumns(),
];

const compactBaseColumns: TemplateColumn[] = [
  column("name", "nombre", "Nombre principal.", "Ejemplo Cartagena", {
    required: true,
    maxLength: standardLimits.name,
    width: 30,
  }),
  column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "ejemplo-cartagena", {
    maxLength: standardLimits.slug,
    width: 32,
  }),
  column("shortDescription", "descripcion_corta", "Resumen comercial breve.", "Resumen breve del contenido.", {
    maxLength: standardLimits.shortText,
    width: 40,
  }),
  column("description", "descripcion", "Descripción principal.", "Descripción completa en español.", {
    maxLength: standardLimits.description,
    width: 48,
  }),
  column("seoTitle", "seo_titulo", "Título SEO.", "Título SEO | Cartagena Tailored Travel", {
    maxLength: standardLimits.seoTitle,
    width: 36,
  }),
  column("seoDescription", "seo_descripcion", "Meta description.", "Descripción SEO para resultados de búsqueda.", {
    maxLength: standardLimits.seoDescription,
    width: 44,
  }),
  column("seoContent", "contenido_seo", "Contenido SEO visible.", "Contenido SEO extendido.", {
    maxLength: standardLimits.seoContent,
    width: 54,
  }),
  column("faq", "faq", "Formato pregunta|respuesta; pregunta|respuesta.", "¿Se puede personalizar?|Sí.", {
    maxLength: standardLimits.faq,
    width: 54,
  }),
  ...mediaColumns(),
];

const templateConfigs: Record<BulkImportType, TemplateConfig> = {
  PROPERTY: {
    type: "PROPERTY",
    label: "Alojamientos",
    sheetName: "Alojamientos",
    fileName: "plantilla-alojamientos.xlsx",
    description: "Plantilla oficial para crear alojamientos masivamente.",
    columns: propertyColumns,
  },
  EXPERIENCE: {
    type: "EXPERIENCE",
    label: "Experiencias",
    sheetName: "Experiencias",
    fileName: "plantilla-experiencias.xlsx",
    description: "Plantilla oficial para crear experiencias masivamente.",
    columns: [
      column("name", "nombre", "Nombre visible de la experiencia.", "Tour privado Islas del Rosario", {
        required: true,
        maxLength: standardLimits.name,
        width: 32,
      }),
      column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "tour-privado-islas-del-rosario", {
        maxLength: standardLimits.slug,
        width: 36,
      }),
      column("shortDescription", "descripcion_corta", "Resumen comercial breve.", "Experiencia privada en Cartagena con asistencia personalizada.", {
        required: true,
        maxLength: standardLimits.shortText,
        width: 44,
      }),
      column("description", "descripcion", "Descripción principal en español.", "Tour privado para disfrutar Cartagena con servicio premium.", {
        maxLength: standardLimits.description,
        width: 48,
      }),
      column("location", "ubicacion", "Ubicación o zona donde ocurre la experiencia.", "Islas del Rosario", {
        maxLength: standardLimits.shortText,
        width: 30,
      }),
      column("duration", "duracion", "Duración corta para filtros o cards.", "8 horas", {
        maxLength: standardLimits.name,
        width: 20,
      }),
      column("priceCop", "precio_cop", "Precio base en pesos colombianos.", "1500000", {
        required: true,
        width: 18,
      }),
      column("minCapacity", "capacidad_minima", "Número mínimo de participantes.", "2", { width: 20 }),
      column("maxCapacity", "capacidad_maxima", "Número máximo de participantes.", "10", { width: 20 }),
      column("active", "activo", "Usar SI o NO.", "SI", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("featured", "destacado", "Usar SI o NO.", "NO", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("experienceCategory", "categoria_experiencia", "Categoría SEO u operativa de la experiencia.", "YACHT", {
        maxLength: standardLimits.name,
        width: 28,
      }),
      column("destinationSlugs", "destinos_relacionados", "Slugs de destinos separados por coma.", "islas-del-rosario,cartagena", {
        maxLength: standardLimits.tags,
        width: 38,
      }),
      column("premiumServices", "servicios_premium", "Servicios premium separados por coma.", "transporte privado,asistencia personalizada", {
        maxLength: standardLimits.tags,
        width: 40,
      }),
      column("manualValidation", "validacion_manual", "Usar SI o NO.", "SI", {
        width: 20,
        allowedValues: ["SI", "NO"],
      }),
      column("seoTitle", "seo_titulo", "Título SEO recomendado.", "Tour Privado Islas del Rosario | Cartagena Tailored Travel", {
        maxLength: standardLimits.seoTitle,
        width: 40,
      }),
      column("seoDescription", "seo_descripcion", "Meta description SEO.", "Tour privado a Islas del Rosario con servicio premium y atención personalizada.", {
        maxLength: standardLimits.seoDescription,
        width: 46,
      }),
      column("seoContent", "contenido_seo", "Contenido SEO visible y extendido.", "Contenido SEO sobre la experiencia, logística, beneficios y recomendaciones.", {
        maxLength: standardLimits.seoContent,
        width: 56,
      }),
      column("itinerary", "itinerario", "Itinerario visible.", "08:00 Salida; 09:00 Llegada; 15:00 Regreso", {
        maxLength: standardLimits.itinerary,
        width: 52,
      }),
      column("included", "incluye", "Lista separada por coma.", "transporte,asistencia,entradas", {
        maxLength: standardLimits.included,
        width: 40,
      }),
      column("notIncluded", "no_incluye", "Lista separada por coma.", "gastos personales,propinas", {
        maxLength: standardLimits.notIncluded,
        width: 40,
      }),
      column("meetingPoint", "punto_encuentro", "Punto de encuentro o recogida.", "Hotel del cliente o muelle acordado.", {
        maxLength: standardLimits.shortText,
        width: 38,
      }),
      column("durationDescription", "duracion_descripcion", "Descripción detallada de duración.", "Duración aproximada de 8 horas, sujeta a clima y logística.", {
        maxLength: standardLimits.shortText,
        width: 44,
      }),
      column("schedule", "horarios", "Horarios disponibles.", "Salida recomendada entre 08:00 y 09:00.", {
        maxLength: standardLimits.shortText,
        width: 36,
      }),
      column("conditions", "condiciones", "Condiciones operativas.", "Sujeto a clima y disponibilidad.", {
        maxLength: standardLimits.policies,
        width: 44,
      }),
      column("recommendations", "recomendaciones", "Recomendaciones visibles.", "Llevar ropa cómoda.", {
        maxLength: standardLimits.recommendations,
        width: 44,
      }),
      column("faq", "faq", "Formato pregunta|respuesta; pregunta|respuesta.", "¿La experiencia es privada?|Sí.; ¿Incluye transporte?|Según disponibilidad.", {
        maxLength: standardLimits.faq,
        width: 58,
      }),
      ...mediaColumns(),
      ...experienceTranslationColumns(),
    ],
  },
  PACKAGE: {
    type: "PACKAGE",
    label: "Paquetes",
    sheetName: "Paquetes",
    fileName: "plantilla-paquetes.xlsx",
    description: "Plantilla oficial para crear paquetes masivamente.",
    columns: [
      column("name", "nombre", "Nombre visible del paquete.", "Cartagena Premium 3 Días", {
        required: true,
        maxLength: standardLimits.name,
        width: 34,
      }),
      column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "cartagena-premium-3-dias", {
        maxLength: standardLimits.slug,
        width: 36,
      }),
      column("shortDescription", "descripcion_corta", "Resumen comercial breve.", "Paquete premium para disfrutar Cartagena con asesoría personalizada.", {
        required: true,
        maxLength: standardLimits.shortText,
        width: 46,
      }),
      column("description", "descripcion", "Descripción principal en español.", "Paquete turístico premium con experiencias y alojamiento sugerido.", {
        maxLength: standardLimits.description,
        width: 48,
      }),
      column("priceCop", "precio_cop", "Precio base en pesos colombianos.", "3500000", {
        required: true,
        width: 18,
      }),
      column("duration", "duracion", "Duración corta para filtros o cards.", "3 días", {
        maxLength: standardLimits.name,
        width: 18,
      }),
      column("minPeople", "personas_minimas", "Número mínimo de personas.", "2", { width: 20 }),
      column("maxPeople", "personas_maximas", "Número máximo de personas.", "8", { width: 20 }),
      column("active", "activo", "Usar SI o NO.", "SI", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("featured", "destacado", "Usar SI o NO.", "NO", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("destinationSlugs", "destinos_relacionados", "Slugs de destinos separados por coma.", "centro-historico,islas-del-rosario", {
        maxLength: standardLimits.tags,
        width: 38,
      }),
      column("seoTitle", "seo_titulo", "Título SEO recomendado.", "Cartagena Premium 3 Días | Cartagena Tailored Travel", {
        maxLength: standardLimits.seoTitle,
        width: 40,
      }),
      column("seoDescription", "seo_descripcion", "Meta description SEO.", "Paquete premium en Cartagena con alojamiento, tours privados y asesoría personalizada.", {
        maxLength: standardLimits.seoDescription,
        width: 46,
      }),
      column("seoContent", "contenido_seo", "Contenido SEO visible y extendido.", "Contenido SEO sobre el paquete, itinerario, beneficios y recomendaciones.", {
        maxLength: standardLimits.seoContent,
        width: 56,
      }),
      column("itinerary", "itinerario", "Itinerario por días.", "Día 1: llegada; Día 2: experiencia privada; Día 3: salida", {
        maxLength: standardLimits.itinerary,
        width: 54,
      }),
      column("includes", "incluye", "Lista separada por coma.", "alojamiento,experiencias,asistencia", {
        maxLength: standardLimits.included,
        width: 42,
      }),
      column("notIncludes", "no_incluye", "Lista separada por coma.", "vuelos,gastos personales", {
        maxLength: standardLimits.notIncluded,
        width: 42,
      }),
      column("policies", "politicas", "Políticas del paquete.", "Sujeto a disponibilidad.", {
        maxLength: standardLimits.policies,
        width: 46,
      }),
      column("recommendations", "recomendaciones", "Recomendaciones visibles.", "Reservar con anticipación.", {
        maxLength: standardLimits.recommendations,
        width: 44,
      }),
      column("faq", "faq", "Formato pregunta|respuesta; pregunta|respuesta.", "¿Puedo personalizar el itinerario?|Sí.; ¿Incluye alojamiento?|Según paquete.", {
        maxLength: standardLimits.faq,
        width: 58,
      }),
      ...packageComponentColumns(),
      ...mediaColumns(),
      ...packageTranslationColumns(),
    ],
  },
  DESTINATION: {
    type: "DESTINATION",
    label: "Destinos",
    sheetName: "Destinos",
    fileName: "plantilla-destinos.xlsx",
    description: "Plantilla oficial para crear destinos masivamente.",
    columns: [
      column("name", "nombre", "Nombre visible del destino.", "Centro Histórico", {
        required: true,
        maxLength: standardLimits.name,
        width: 30,
      }),
      column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "centro-historico", {
        maxLength: standardLimits.slug,
        width: 32,
      }),
      column("shortDescription", "descripcion_corta", "Resumen breve del destino.", "Zona histórica y cultural de Cartagena.", {
        required: true,
        maxLength: standardLimits.shortText,
        width: 42,
      }),
      column("description", "descripcion", "Descripción principal en español.", "Destino turístico clave de Cartagena con valor histórico.", {
        maxLength: standardLimits.description,
        width: 48,
      }),
      column("location", "ubicacion", "Ubicación general.", "Cartagena, Colombia", {
        maxLength: standardLimits.shortText,
        width: 34,
      }),
      column("active", "activo", "Usar SI o NO.", "SI", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("featured", "destacado", "Usar SI o NO.", "NO", {
        width: 14,
        allowedValues: ["SI", "NO"],
      }),
      column("sortOrder", "orden", "Número entero para ordenar.", "1", { width: 14 }),
      column("seoTitle", "seo_titulo", "Título SEO recomendado.", "Centro Histórico de Cartagena | Cartagena Tailored Travel", {
        maxLength: standardLimits.seoTitle,
        width: 40,
      }),
      column("seoDescription", "seo_descripcion", "Meta description SEO.", "Explora el Centro Histórico de Cartagena con alojamientos y experiencias premium.", {
        maxLength: standardLimits.seoDescription,
        width: 46,
      }),
      column("seoContent", "contenido_seo", "Contenido SEO visible y extendido.", "Contenido SEO sobre historia, actividades y recomendaciones del destino.", {
        maxLength: standardLimits.seoContent,
        width: 56,
      }),
      column("faq", "faq", "Formato pregunta|respuesta; pregunta|respuesta.", "¿Qué hacer en esta zona?|Recorrer plazas, restaurantes y calles coloniales.", {
        maxLength: standardLimits.faq,
        width: 58,
      }),
      column("relatedProperties", "alojamientos_relacionados", "Slugs de alojamientos separados por coma.", "villa-centro-historico,penthouse-cartagena", {
        maxLength: standardLimits.tags,
        width: 42,
      }),
      column("relatedExperiences", "experiencias_relacionadas", "Slugs de experiencias separados por coma.", "tour-ciudad-amurallada,cena-romantica", {
        maxLength: standardLimits.tags,
        width: 42,
      }),
      column("relatedPackages", "paquetes_relacionados", "Slugs de paquetes separados por coma.", "cartagena-premium-3-dias", {
        maxLength: standardLimits.tags,
        width: 42,
      }),
      ...mediaColumns(),
      ...["en", "fr", "pt", "it"].flatMap((locale) => [
        column(`${locale}Name`, `${locale}_nombre`, "Traducción opcional del nombre.", "", {
          maxLength: standardLimits.name,
          width: 30,
        }),
        column(`${locale}ShortDescription`, `${locale}_descripcion_corta`, "Traducción opcional de la descripción corta.", "", {
          maxLength: standardLimits.shortText,
          width: 38,
        }),
        column(`${locale}Description`, `${locale}_descripcion`, "Traducción opcional de la descripción.", "", {
          maxLength: standardLimits.description,
          width: 44,
        }),
        column(`${locale}SeoContent`, `${locale}_contenido_seo`, "Traducción opcional del contenido SEO.", "", {
          maxLength: standardLimits.seoContent,
          width: 48,
        }),
        column(`${locale}Faq`, `${locale}_faq`, "Traducción opcional del FAQ.", "", {
          maxLength: standardLimits.faq,
          width: 44,
        }),
      ]),
    ],
  },
  BLOG: {
    type: "BLOG",
    label: "Blog",
    sheetName: "Blog",
    fileName: "plantilla-blog.xlsx",
    description: "Plantilla oficial para crear artículos de blog masivamente.",
    columns: [
      column("title", "titulo", "Título del artículo.", "Qué hacer en Cartagena en 3 días", {
        required: true,
        maxLength: standardLimits.name,
        width: 38,
      }),
      column("slug", "slug", "Opcional. Si queda vacío, el sistema lo genera automáticamente.", "que-hacer-en-cartagena-en-3-dias", {
        maxLength: standardLimits.slug,
        width: 36,
      }),
      column("excerpt", "extracto", "Extracto del artículo.", "Guía práctica para disfrutar Cartagena.", {
        required: true,
        maxLength: standardLimits.shortText,
        width: 44,
      }),
      column("content", "contenido", "Contenido principal del artículo.", "Contenido editorial completo en español.", {
        required: true,
        maxLength: standardLimits.seoContent,
        width: 60,
      }),
      column("category", "categoria", "Categoría editorial.", "Guías de Cartagena", {
        maxLength: standardLimits.name,
        width: 28,
      }),
      column("tags", "tags", "Tags separados por coma.", "Cartagena,Islas del Rosario,lujo", {
        maxLength: standardLimits.tags,
        width: 36,
      }),
      column("author", "autor", "Autor visible del artículo.", "Cartagena Tailored Travel", {
        maxLength: standardLimits.name,
        width: 30,
      }),
      column("published", "publicado", "Usar SI o NO.", "NO", {
        width: 16,
        allowedValues: ["SI", "NO"],
      }),
      column("featured", "destacado", "Usar SI o NO.", "NO", {
        width: 16,
        allowedValues: ["SI", "NO"],
      }),
      column("publishedAt", "fecha_publicacion", "Fecha sugerida en formato YYYY-MM-DD.", "2026-06-09", {
        width: 22,
      }),
      column("seoTitle", "seo_titulo", "Título SEO.", "Qué hacer en Cartagena en 3 días", {
        maxLength: standardLimits.seoTitle,
        width: 38,
      }),
      column("seoDescription", "seo_descripcion", "Meta description.", "Guía para planear tres días en Cartagena con experiencias premium.", {
        maxLength: standardLimits.seoDescription,
        width: 44,
      }),
      column("keywords", "palabras_clave", "Palabras clave separadas por coma.", "Cartagena,guía de viaje,Islas del Rosario", {
        maxLength: standardLimits.tags,
        width: 38,
      }),
      column("destinationSlugs", "destinos_relacionados", "Slugs de destinos separados por coma.", "cartagena,islas-del-rosario", {
        maxLength: standardLimits.tags,
        width: 38,
      }),
      column("propertySlugs", "alojamientos_relacionados", "Slugs de alojamientos separados por coma.", "villa-centro-historico", {
        maxLength: standardLimits.tags,
        width: 42,
      }),
      column("experienceSlugs", "experiencias_relacionadas", "Slugs de experiencias separados por coma.", "tour-islas-del-rosario", {
        maxLength: standardLimits.tags,
        width: 42,
      }),
      column("packageSlugs", "paquetes_relacionados", "Slugs de paquetes separados por coma.", "cartagena-premium-3-dias", {
        maxLength: standardLimits.tags,
        width: 38,
      }),
      ...mediaColumns(),
      ...["en", "fr", "pt", "it"].flatMap((locale) => [
        column(`${locale}Title`, `${locale}_titulo`, "Traducción opcional del título.", "", {
          maxLength: standardLimits.name,
          width: 34,
        }),
        column(`${locale}Excerpt`, `${locale}_extracto`, "Traducción opcional del extracto.", "", {
          maxLength: standardLimits.shortText,
          width: 40,
        }),
        column(`${locale}Content`, `${locale}_contenido`, "Traducción opcional del contenido.", "", {
          maxLength: standardLimits.seoContent,
          width: 52,
        }),
        column(`${locale}SeoTitle`, `${locale}_seo_titulo`, "Traducción opcional del título SEO.", "", {
          maxLength: standardLimits.seoTitle,
          width: 34,
        }),
        column(`${locale}SeoDescription`, `${locale}_seo_descripcion`, "Traducción opcional de la meta descripción.", "", {
          maxLength: standardLimits.seoDescription,
          width: 42,
        }),
      ]),
    ],
  },
};

@Injectable()
export class BulkImportTemplatesService {
  getTemplateFileName(type: BulkImportType) {
    return this.getConfig(type).fileName;
  }

  getTemplateSpec(type: BulkImportType) {
    const config = this.getConfig(type);

    return {
      type: config.type,
      label: config.label,
      sheetName: config.sheetName,
      columns: config.columns.map((column) => ({
        header: column.header,
        required: Boolean(column.required),
        maxLength: column.maxLength ?? null,
        allowedValues: column.allowedValues || [],
      })),
      headers: config.columns.map((column) => column.header),
      requiredHeaders: config.columns
        .filter((column) => column.required)
        .map((column) => column.header),
    };
  }

  async buildTemplate(type: BulkImportType) {
    const config = this.getConfig(type);
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Cartagena Tailored Travel";
    workbook.subject = `Plantilla de carga masiva - ${config.label}`;
    workbook.title = config.fileName;
    workbook.created = new Date();

    this.addInstructionsSheet(workbook, config);
    this.addDataSheet(workbook, config);

    return workbook.xlsx.writeBuffer();
  }

  private getConfig(type: BulkImportType) {
    const config = templateConfigs[type];

    if (!config) {
      throw new BadRequestException("Tipo de plantilla no válido");
    }

    return config;
  }

  private addInstructionsSheet(
    workbook: ExcelJS.Workbook,
    config: TemplateConfig
  ) {
    const sheet = workbook.addWorksheet("Instrucciones", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { width: 34 },
      { width: 18 },
      { width: 20 },
      { width: 72 },
      { width: 58 },
    ];

    sheet.mergeCells("A1:E1");
    sheet.getCell("A1").value = `Plantilla oficial de carga masiva - ${config.label}`;
    sheet.getCell("A1").font = {
      bold: true,
      size: 16,
      color: { argb: "FF0D2B52" },
    };

    sheet.mergeCells("A2:E2");
    sheet.getCell("A2").value = config.description;
    sheet.getCell("A2").font = { italic: true, color: { argb: "FF475569" } };

    instructionLines.forEach((line, index) => {
      const row = sheet.getRow(index + 4);
      row.getCell(1).value = `• ${line}`;
      row.getCell(1).alignment = { wrapText: true, vertical: "top" };
      sheet.mergeCells(index + 4, 1, index + 4, 5);
    });

    const tableStart = instructionLines.length + 6;
    const headerRow = sheet.getRow(tableStart);
    headerRow.values = [
      "Campo",
      "Obligatorio",
      "Límite",
      "Regla de llenado",
      "Ejemplo",
    ];
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D2B52" },
    };

    config.columns.forEach((templateColumn, index) => {
      const row = sheet.getRow(tableStart + index + 1);
      row.values = [
        templateColumn.header,
        templateColumn.required ? "SI" : "NO",
        templateColumn.maxLength
          ? `${templateColumn.maxLength} caracteres`
          : "Según formato",
        templateColumn.rule,
        templateColumn.example,
      ];
      row.alignment = { vertical: "top", wrapText: true };
    });
  }

  private addDataSheet(workbook: ExcelJS.Workbook, config: TemplateConfig) {
    const sheet = workbook.addWorksheet(config.sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = config.columns.map((templateColumn) => ({
      header: templateColumn.header,
      key: templateColumn.key,
      width: templateColumn.width || 28,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.height = 34;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", wrapText: true };

    config.columns.forEach((templateColumn, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: templateColumn.required ? "FFB48A5A" : "FF0D2B52",
        },
      };
      (cell as any).note = this.buildHeaderNote(templateColumn);
    });

    sheet.addRow(
      config.columns.reduce<Record<string, string>>((row, templateColumn) => {
        row[templateColumn.key] = templateColumn.example;
        return row;
      }, {})
    );

    sheet.getRow(2).height = 54;
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });

    config.columns.forEach((templateColumn, index) => {
      const letter = sheet.getColumn(index + 1).letter;

      if (templateColumn.maxLength) {
        (sheet as WorksheetWithValidations).dataValidations.add(
          `${letter}2:${letter}1000`,
          {
            type: "textLength",
            operator: "lessThanOrEqual",
            formulae: [templateColumn.maxLength],
            allowBlank: !templateColumn.required,
            showErrorMessage: true,
            errorTitle: "Límite de caracteres",
            error: `Máximo ${templateColumn.maxLength} caracteres.`,
          }
        );
      }

      if (templateColumn.allowedValues?.length) {
        (sheet as WorksheetWithValidations).dataValidations.add(
          `${letter}2:${letter}1000`,
          {
            type: "list",
            formulae: [`"${templateColumn.allowedValues.join(",")}"`],
            allowBlank: !templateColumn.required,
            showErrorMessage: true,
            errorTitle: "Valor no permitido",
            error: `Usa exactamente: ${templateColumn.allowedValues.join(", ")}.`,
          }
        );
      }
    });

    sheet.autoFilter = {
      from: "A1",
      to: `${sheet.getColumn(config.columns.length).letter}1`,
    };
  }

  private buildHeaderNote(templateColumn: TemplateColumn) {
    const lines = [
      templateColumn.required ? "Obligatorio: SI" : "Obligatorio: NO",
      templateColumn.maxLength
        ? `Límite: ${templateColumn.maxLength} caracteres`
        : "Límite: según formato",
      `Regla: ${templateColumn.rule}`,
    ];

    if (templateColumn.allowedValues?.length) {
      lines.push(`Valores permitidos: ${templateColumn.allowedValues.join(", ")}`);
    }

    return lines.join("\n");
  }
}
