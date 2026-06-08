import {
  BookingType,
  Prisma,
  PrismaClient,
  ProductFeatureAppliesTo,
  ProductFeatureCategory,
  PropertyStatus,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function paragraphs(...parts: string[]) {
  return parts.join("\n\n");
}

const initialPropertyFaq: Prisma.InputJsonArray = [
  {
    question: "El alojamiento esta cerca del centro historico?",
    answer:
      "Depende de la propiedad seleccionada. El asesor confirma ubicacion, zona y tiempos de traslado antes de cerrar la reserva.",
  },
  {
    question: "Incluye servicio de limpieza?",
    answer:
      "Algunos alojamientos lo incluyen y otros lo manejan como servicio adicional. El detalle se valida antes de confirmar.",
  },
  {
    question: "Se puede solicitar transporte desde el aeropuerto?",
    answer:
      "Si. El equipo puede coordinar transporte privado sujeto a disponibilidad, horario de llegada y numero de pasajeros.",
  },
  {
    question: "La reserva queda confirmada automaticamente?",
    answer:
      "No. Cada solicitud pasa por validacion asistida para revisar disponibilidad, condiciones y servicios antes de confirmar.",
  },
  {
    question: "Puedo recibir atencion personalizada?",
    answer:
      "Si. Un asesor puede ayudarte a ajustar alojamiento, fechas, servicios premium y experiencias relacionadas.",
  },
];

const initialExperienceFaq: Prisma.InputJsonArray = [
  {
    question: "La experiencia es privada?",
    answer:
      "Puede ser privada o asistida segun el servicio, disponibilidad y condiciones del proveedor.",
  },
  {
    question: "Cuanto dura la experiencia?",
    answer:
      "La duracion depende del tipo de experiencia. El horario final se confirma con el asesor antes de reservar.",
  },
  {
    question: "Incluye transporte?",
    answer:
      "Algunas experiencias pueden incluir transporte y otras lo manejan como adicional. Se valida en la propuesta final.",
  },
  {
    question: "Que pasa si llueve?",
    answer:
      "El asesor revisa condiciones climaticas y disponibilidad para proponer ajustes de horario, fecha o alternativa.",
  },
  {
    question: "Puedo personalizar el horario?",
    answer:
      "Si el proveedor y la operacion lo permiten, el horario puede ajustarse antes de confirmar la reserva.",
  },
];

const initialPackageFaq: Prisma.InputJsonArray = [
  {
    question: "El paquete incluye alojamiento?",
    answer:
      "Puede incluir alojamiento si se confirma disponibilidad y condiciones con el asesor.",
  },
  {
    question: "Puedo personalizar el itinerario?",
    answer:
      "Si. El itinerario puede ajustarse segun fechas, presupuesto, intereses y disponibilidad de proveedores.",
  },
  {
    question: "El precio incluye todas las experiencias?",
    answer:
      "Solo incluye los servicios especificados y validados por el asesor. Los extras se cotizan por separado.",
  },
  {
    question: "Como se confirma la disponibilidad?",
    answer:
      "El equipo revisa alojamiento, experiencias, horarios y proveedores antes de confirmar la reserva.",
  },
  {
    question: "Puedo agregar servicios premium?",
    answer:
      "Si. Se pueden solicitar servicios como transporte, decoracion, fotografia o experiencias adicionales segun disponibilidad.",
  },
];

const initialDestinationFaq: Prisma.InputJsonArray = [
  {
    question: "Cual es la mejor epoca para visitar este destino?",
    answer:
      "Cartagena puede visitarse durante todo el ano, pero en temporada alta conviene reservar con mayor anticipacion.",
  },
  {
    question: "Que puedo hacer en esta zona?",
    answer:
      "Depende del destino. El asesor puede sugerir alojamientos, experiencias, gastronomia, recorridos y servicios cercanos.",
  },
  {
    question: "Hay alojamientos cercanos?",
    answer:
      "Si existen alojamientos relacionados, se muestran en la pagina del destino o se validan con el asesor.",
  },
  {
    question: "Se pueden reservar experiencias relacionadas?",
    answer:
      "Si. Las experiencias se pueden conectar con el destino segun disponibilidad, clima y perfil del viajero.",
  },
  {
    question: "Es recomendable ir con asesoria?",
    answer:
      "Si. La asesoria ayuda a ordenar horarios, traslados, disponibilidad y condiciones para evitar improvisaciones.",
  },
];

async function upsertProductFeature(data: {
  name: string;
  description?: string;
  translations?: Record<string, Record<string, string>>;
  icon?: string;
  category: ProductFeatureCategory;
  appliesTo: ProductFeatureAppliesTo;
}) {
  const slug = slugify(data.name);

  return prisma.productFeature.upsert({
    where: { slug },
    update: {
      name: data.name,
      description: data.description || null,
      translations: data.translations || undefined,
      icon: data.icon || null,
      category: data.category,
      appliesTo: data.appliesTo,
      active: true,
    },
    create: {
      name: data.name,
      slug,
      description: data.description || null,
      translations: data.translations || undefined,
      icon: data.icon || null,
      category: data.category,
      appliesTo: data.appliesTo,
      active: true,
    },
  });
}

async function assignFeature(data: {
  featureName: string;
  productType: BookingType;
  productId?: number;
}) {
  if (!data.productId) return;

  const feature = await prisma.productFeature.findUnique({
    where: { slug: slugify(data.featureName) },
  });

  if (!feature) return;

  if (
    feature.appliesTo !== ProductFeatureAppliesTo.ALL &&
    feature.appliesTo !== data.productType
  ) {
    throw new Error(
      `Seed invalido: ${feature.name} aplica a ${feature.appliesTo}, no a ${data.productType}`
    );
  }

  await prisma.productFeatureAssignment.upsert({
    where: {
      featureId_productType_productId: {
        featureId: feature.id,
        productType: data.productType,
        productId: data.productId,
      },
    },
    update: {},
    create: {
      featureId: feature.id,
      productType: data.productType,
      productId: data.productId,
    },
  });
}

async function upsertExtra(data: {
  name: string;
  description: string;
  translations?: Record<string, Record<string, string>>;
  price: number;
  propertyId?: number;
  experienceId?: number;
  packageId?: number;
}) {
  const existing = await prisma.extraService.findFirst({
    where: {
      name: data.name,
      propertyId: data.propertyId || null,
      experienceId: data.experienceId || null,
      packageId: data.packageId || null,
    },
  });

  if (existing) {
    return prisma.extraService.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        translations: data.translations || undefined,
        price: data.price,
        priceCop: data.price,
        baseCurrency: "COP",
        active: true,
      },
    });
  }

  return prisma.extraService.create({
    data: {
      ...data,
      priceCop: data.price,
      baseCurrency: "COP",
      active: true,
    },
  });
}

async function upsertDestination(data: {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoContent?: string;
  faq?: Prisma.InputJsonArray;
  heroImage?: string;
  gallery?: Prisma.InputJsonArray;
  location?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  translations?: Prisma.InputJsonObject;
}) {
  const slug = data.slug || slugify(data.name);

  return prisma.destination.upsert({
    where: { slug },
    update: {
      name: data.name,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoContent: data.seoContent || null,
      faq: data.faq || undefined,
      heroImage: data.heroImage || null,
      gallery: data.gallery || undefined,
      location: data.location || null,
      isActive: true,
      isFeatured: data.isFeatured || false,
      sortOrder: data.sortOrder || 0,
      translations: data.translations || undefined,
    },
    create: {
      name: data.name,
      slug,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoContent: data.seoContent || null,
      faq: data.faq || undefined,
      heroImage: data.heroImage || null,
      gallery: data.gallery || undefined,
      location: data.location || null,
      isActive: true,
      isFeatured: data.isFeatured || false,
      sortOrder: data.sortOrder || 0,
      translations: data.translations || undefined,
    },
  });
}

async function upsertBlogPost(data: {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  authorName?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  translations?: Prisma.InputJsonObject;
}) {
  const slug = data.slug || slugify(data.title);

  return prisma.blogPost.upsert({
    where: { slug },
    update: {
      title: data.title,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImage: data.coverImage || null,
      category: data.category || null,
      tags: data.tags || undefined,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoKeywords: data.seoKeywords || undefined,
      authorName: data.authorName || "Cartagena Tailored Travel",
      isPublished: data.isPublished || false,
      publishedAt: data.isPublished ? new Date() : null,
      isFeatured: data.isFeatured || false,
      translations: data.translations || undefined,
    },
    create: {
      title: data.title,
      slug,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImage: data.coverImage || null,
      category: data.category || null,
      tags: data.tags || undefined,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoKeywords: data.seoKeywords || undefined,
      authorName: data.authorName || "Cartagena Tailored Travel",
      isPublished: data.isPublished || false,
      publishedAt: data.isPublished ? new Date() : null,
      isFeatured: data.isFeatured || false,
      translations: data.translations || undefined,
    },
  });
}

async function linkDestinationProperty(data: {
  destinationSlug: string;
  propertySlug: string;
  sortOrder?: number;
  isFeatured?: boolean;
}) {
  const destination = await prisma.destination.findUnique({
    where: { slug: data.destinationSlug },
  });
  const property = await prisma.property.findUnique({
    where: { slug: data.propertySlug },
  });

  if (!destination || !property) return;

  await prisma.destinationProperty.upsert({
    where: {
      destinationId_propertyId: {
        destinationId: destination.id,
        propertyId: property.id,
      },
    },
    update: {
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
    create: {
      destinationId: destination.id,
      propertyId: property.id,
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
  });
}

async function linkDestinationExperience(data: {
  destinationSlug: string;
  experienceSlug: string;
  sortOrder?: number;
  isFeatured?: boolean;
}) {
  const destination = await prisma.destination.findUnique({
    where: { slug: data.destinationSlug },
  });
  const experience = await prisma.experience.findUnique({
    where: { slug: data.experienceSlug },
  });

  if (!destination || !experience) return;

  await prisma.destinationExperience.upsert({
    where: {
      destinationId_experienceId: {
        destinationId: destination.id,
        experienceId: experience.id,
      },
    },
    update: {
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
    create: {
      destinationId: destination.id,
      experienceId: experience.id,
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
  });
}

async function linkDestinationPackage(data: {
  destinationSlug: string;
  packageSlug: string;
  sortOrder?: number;
  isFeatured?: boolean;
}) {
  const destination = await prisma.destination.findUnique({
    where: { slug: data.destinationSlug },
  });
  const packageItem = await prisma.package.findUnique({
    where: { slug: data.packageSlug },
  });

  if (!destination || !packageItem) return;

  await prisma.destinationPackage.upsert({
    where: {
      destinationId_packageId: {
        destinationId: destination.id,
        packageId: packageItem.id,
      },
    },
    update: {
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
    create: {
      destinationId: destination.id,
      packageId: packageItem.id,
      sortOrder: data.sortOrder || 0,
      isFeatured: data.isFeatured || false,
    },
  });
}

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // 🔥 SUPER ADMIN
  await prisma.user.upsert({
    where: { email: "superadmin@test.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@test.com",
      password,
      role: Role.SUPERADMIN,
    },
  });

  // 🔥 ADMIN
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@test.com",
      password,
      role: Role.ADMIN,
    },
  });

  // 🔥 ADVISOR
  await prisma.user.upsert({
    where: { email: "advisor@test.com" },
    update: {},
    create: {
      name: "Advisor",
      email: "advisor@test.com",
      password,
      role: Role.ADVISOR,
    },
  });

  console.log("✅ Usuarios base creados:");
  console.log("SUPERADMIN → superadmin@test.com / 123456");
  console.log("ADMIN → admin@test.com / 123456");
  console.log("ADVISOR → advisor@test.com / 123456");
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {
      companyName: "Cartagena Tailored Travel",
      businessName: "Cartagena Tailored Travel",
      city: "Cartagena",
      country: "Colombia",
      defaultCurrency: "COP",
      baseCurrency: "COP",
      enabledDisplayCurrencies: ["COP", "USD", "EUR", "BRL"],
      defaultDisplayCurrency: "COP",
      exchangeRateMode: "MANUAL",
      exchangeRateSource: "MANUAL",
      exchangeRateDate: new Date(),
      currencyConversionEnabled: true,
      exchangeRatesFromCOP: {
        COP: 1,
        USD: 0.00025,
        EUR: 0.00023,
        BRL: 0.0014,
      },
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
      factusEnabled: false,
      factusMode: "mock",
      factusDefaultDocumentCode: "01",
      footerText:
        "Cartagena Tailored Travel - Viajes premium con atencion personalizada.",
      invoiceNotes:
        "Comprobante interno de reserva. No constituye factura electronica DIAN.",
    },
    create: {
      id: 1,
      companyName: "Cartagena Tailored Travel",
      businessName: "Cartagena Tailored Travel",
      city: "Cartagena",
      country: "Colombia",
      defaultCurrency: "COP",
      baseCurrency: "COP",
      enabledDisplayCurrencies: ["COP", "USD", "EUR", "BRL"],
      defaultDisplayCurrency: "COP",
      exchangeRateMode: "MANUAL",
      exchangeRateSource: "MANUAL",
      exchangeRateDate: new Date(),
      currencyConversionEnabled: true,
      exchangeRatesFromCOP: {
        COP: 1,
        USD: 0.00025,
        EUR: 0.00023,
        BRL: 0.0014,
      },
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
      factusEnabled: false,
      factusMode: "mock",
      factusDefaultDocumentCode: "01",
      footerText:
        "Cartagena Tailored Travel - Viajes premium con atencion personalizada.",
      invoiceNotes:
        "Comprobante interno de reserva. No constituye factura electronica DIAN.",
    },
  });

  console.log("Configuracion demo creada o actualizada.");

  const demoDestinations = [
    {
      name: "Cartagena",
      slug: "cartagena",
      shortDescription:
        "Ciudad historica del Caribe colombiano con alojamientos, experiencias privadas y servicios premium.",
      description:
        "Cartagena combina historia, gastronomia, arquitectura colonial, mar Caribe y una oferta ideal para viajes personalizados. Es el punto de partida para alojamientos de lujo, recorridos privados, experiencias nauticas y paquetes completos.",
      seoTitle: "Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Explora Cartagena, Colombia, con alojamientos premium, tours privados, experiencias de lujo y asesoria personalizada.",
      seoContent: paragraphs(
        "Introduccion al destino. Cartagena es uno de los destinos mas completos del Caribe colombiano para viajeros que buscan una experiencia premium con historia, mar, gastronomia y asistencia personalizada. La ciudad permite combinar alojamientos de lujo, recorridos privados, salidas nauticas, cenas especiales y paquetes hechos a la medida sin perder comodidad operativa. Su valor no esta solo en la belleza del Centro Historico o en el mar de las Islas del Rosario, sino en la posibilidad de crear un viaje equilibrado entre descanso, cultura, servicio y seguridad.",
        "Por que visitar esta zona. Cartagena es una ciudad ideal para viajeros internacionales, parejas, familias y grupos privados que desean un destino con identidad caribena, buena oferta gastronomica, zonas historicas caminables y planes de mar cercanos. A diferencia de destinos donde cada actividad queda aislada, Cartagena permite construir una experiencia por capas: hospedarse en una villa o apartamento premium, recorrer plazas coloniales, reservar una cena romantica, salir a islas y cerrar con recomendaciones locales.",
        "Que hacer alli. En Cartagena se puede caminar la ciudad amurallada, visitar Getsemani, conocer iglesias coloniales, reservar un city tour privado, disfrutar restaurantes de comida tipica, coordinar fotografia profesional, salir hacia Islas del Rosario o planear una noche especial. Tambien es posible crear paquetes de 2 o 3 dias que integren alojamiento, traslados, experiencias privadas y servicios premium. La clave esta en ordenar bien los horarios para no saturar el viaje.",
        "Donde hospedarse cerca. El Centro Historico es recomendable para quienes quieren caminar, acceder a restaurantes y vivir la zona cultural. Bocagrande puede funcionar para viajeros que prefieren playa, edificios modernos y una base urbana frente al mar. Getsemani es atractivo para quienes buscan energia cultural y arte urbano. La eleccion del alojamiento debe considerar numero de huespedes, movilidad, presupuesto, interes por playa o cultura y disponibilidad real.",
        "Experiencias recomendadas. Los planes mas solicitados suelen incluir tour privado a Islas del Rosario, city tour historico premium, cena romantica, experiencia gastronomica local, recorridos nocturnos y paquetes que mezclan ciudad e islas. Cartagena Tailored Travel conecta estos servicios con un flujo asistido, lo que permite validar proveedores, condiciones, clima, horarios y expectativas antes de confirmar.",
        "Consejos para visitantes. Reservar con anticipacion en temporada alta, informar restricciones alimentarias, compartir edades y necesidades de movilidad, dejar margen entre vuelos y actividades nauticas, y solicitar servicios adicionales antes de viajar. La ciudad puede sentirse muy diferente segun la zona elegida, por eso conviene definir si el objetivo principal es cultura, playa, celebracion, descanso o una mezcla de todo.",
        "Perfil de viajero. Cartagena funciona para parejas que buscan una escapada romantica, familias que necesitan alojamientos comodos, grupos que desean experiencias privadas y viajeros internacionales que valoran asistencia local. Tambien es fuerte para celebraciones, lunas de miel, viajes cortos y paquetes premium de pocos dias. Cada perfil necesita una organizacion distinta: no es lo mismo una pareja que desea cena privada que una familia que requiere capacidad, cocina y traslados claros.",
        "Como conectar el destino con productos. Desde Cartagena se pueden enlazar alojamientos en Centro Historico o Bocagrande, experiencias como city tour, cena romantica e Islas del Rosario, y paquetes como Cartagena premium 3 dias. Esta red interna permite que el visitante no lea una pagina aislada, sino que entienda que el destino se puede convertir en reserva asistida, paquete o experiencia concreta.",
        "Planificacion recomendada. Para un primer viaje, conviene dedicar al menos un dia a la ciudad historica, un dia a una experiencia de mar y un momento a gastronomia o celebracion. Si el viaje es corto, el asesor puede priorizar actividades segun energia, clima, presupuesto y horarios de llegada. Si el viaje es largo, se pueden distribuir experiencias para evitar saturacion y mantener un ritmo mas premium.",
        "Oportunidad SEO y comercial. Cartagena concentra busquedas de alto valor como luxury travel Cartagena, private tours Cartagena, alojamientos premium Cartagena y paquetes turisticos Cartagena. Por eso esta pagina debe funcionar como eje editorial: explica el destino, enlaza productos relacionados y ayuda al visitante a pasar de una idea general de viaje a una solicitud concreta con fechas, huespedes y expectativas claras.",
        "Oportunidad SEO y comercial. Cartagena concentra busquedas de alto valor como luxury travel Cartagena, private tours Cartagena, alojamientos premium Cartagena y paquetes turisticos Cartagena. Por eso esta pagina debe funcionar como eje editorial: explica el destino, enlaza productos relacionados y ayuda al visitante a pasar de una idea general de viaje a una solicitud concreta con fechas, huespedes y expectativas claras.",
        "Preguntas frecuentes. Cartagena es adecuada para viajes de lujo, viajes romanticos, familias y grupos pequenos. Se puede combinar alojamiento con tours privados, islas, gastronomia y servicios premium. Las salidas a islas dependen del clima. Los alojamientos y experiencias deben validarse antes de confirmar para evitar errores de disponibilidad y para ajustar el plan al perfil real del viajero."
      ),
      faq: initialDestinationFaq,
      heroImage:
        "https://images.unsplash.com/photo-1583531352515-8884af319dc1?auto=format&fit=crop&q=70&w=1600",
      location: "Cartagena, Colombia",
      isFeatured: true,
      sortOrder: 1,
      translations: {
        en: {
          name: "Cartagena",
          shortDescription:
            "Historic Caribbean city in Colombia with premium stays, private experiences and luxury services.",
          description:
            "Cartagena combines history, gastronomy, colonial architecture, the Caribbean Sea and a strong base for tailored travel.",
          seoTitle: "Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Explore Cartagena, Colombia, with premium accommodations, private tours, luxury experiences and personalized assistance.",
          seoContent: paragraphs(
            "Cartagena is one of the most complete Caribbean destinations in Colombia for travelers looking for premium travel, culture, sea, gastronomy and personalized assistance.",
            "A luxury trip to Cartagena works best when accommodation, timing, transfers, private experiences and trusted providers are coordinated in advance.",
            "The destination is ideal for couples, families, private groups, honeymoons and international travelers who want the walled city, the Rosario Islands and curated local experiences."
          ),
          faq: [
            {
              question: "What kind of trip can be planned in Cartagena?",
              answer:
                "You can combine accommodations, private tours, gastronomy, islands, transfers and premium services.",
            },
            {
              question: "Is Cartagena suitable for luxury travel?",
              answer:
                "Yes. Cartagena offers premium stays, private experiences, recognized restaurants, nautical plans and local assistance for comfortable travel.",
            },
          ],
        },
      },
    },
    {
      name: "Centro Historico",
      slug: "centro-historico",
      shortDescription:
        "Zona amurallada con arquitectura colonial, plazas, restaurantes y alojamientos estrategicos.",
      description:
        "El Centro Historico es ideal para quienes quieren caminar Cartagena, estar cerca de restaurantes, plazas, iglesias, boutiques y puntos culturales. Es una de las zonas mas buscadas para estadias premium.",
      seoTitle: "Centro Historico de Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Descubre el Centro Historico de Cartagena para alojamientos premium, restaurantes, plazas coloniales y experiencias privadas.",
      seoContent: paragraphs(
        "Introduccion al destino. El Centro Historico de Cartagena es una de las zonas mas valiosas para viajeros que quieren alojarse cerca de la ciudad amurallada, caminar entre plazas coloniales y tener restaurantes, iglesias, boutiques y terrazas a pocos minutos. Es el corazon patrimonial de la ciudad y una de las areas que mejor conecta alojamiento premium, gastronomia, cultura y experiencias privadas.",
        "Por que visitar esta zona. Visitar o hospedarse en el Centro Historico permite vivir Cartagena con menos traslados y mas tiempo disponible para disfrutar arquitectura colonial, balcones, murallas, plazas y atardeceres. Para viajeros que llegan por pocos dias, esta zona aporta eficiencia: muchas actividades pueden iniciar caminando o con traslados cortos. Para viajes romanticos, es una ubicacion especialmente fuerte por su atmosfera nocturna, restaurantes y terrazas.",
        "Que hacer alli. En el Centro Historico se pueden visitar plazas como Santo Domingo, caminar hacia la Torre del Reloj, recorrer murallas, entrar a iglesias coloniales, reservar una cena especial, tomar fotografias y comenzar un city tour privado. Tambien se puede conectar con Getsemani, el Castillo de San Felipe o el muelle para salidas a islas. La zona funciona muy bien para recorridos culturales y experiencias gastronomicas.",
        "Donde hospedarse cerca. Los viajeros que buscan villas de lujo en Cartagena suelen considerar el Centro Historico por ubicacion y caracter. Una villa, casa colonial o apartamento premium en esta zona permite combinar descanso, historia y vida local. La seleccion debe revisar capacidad, accesos, servicios, nivel de privacidad y cercania a puntos de interes. Para familias o grupos, conviene validar habitaciones, banos, zonas comunes y posibilidades de servicios adicionales.",
        "Experiencias recomendadas. City tour historico premium, cena romantica, recorrido nocturno, fotografia profesional, experiencia gastronomica local y paquetes de 3 dias funcionan muy bien desde esta zona. El Centro Historico tambien es un punto natural para iniciar un viaje que luego incluya Islas del Rosario o Bocagrande.",
        "Consejos para visitantes. Usar calzado comodo, llevar ropa fresca, reservar restaurantes con anticipacion en temporada alta y confirmar horarios de llegada si el alojamiento esta dentro de la zona amurallada. Las calles pueden tener restricciones de movilidad, eventos o alta afluencia, por eso la validacion del asesor ayuda a ordenar traslados y experiencias.",
        "Perfil de viajero. Esta zona es ideal para parejas que quieren ambiente romantico, viajeros que buscan arquitectura colonial, familias que desean estar cerca de restaurantes y grupos que prefieren reducir tiempos de traslado. Tambien es una base fuerte para viajeros internacionales que visitan Cartagena por primera vez y desean entender la ciudad desde su centro patrimonial.",
        "Como conectar el destino con productos. El Centro Historico puede conectarse con villas premium, city tours privados, cenas romanticas, experiencias gastronomicas, rutas fotograficas y paquetes como Cartagena premium 3 dias. Esta relacion ayuda a convertir la visita cultural en una solicitud concreta: alojamiento, experiencia o paquete ajustado al tipo de viajero.",
        "Planificacion recomendada. Para aprovechar la zona, conviene combinar recorrido cultural en la manana o tarde, pausa para gastronomia y una experiencia nocturna si el grupo tiene energia. Si hay salida a islas al dia siguiente, es mejor no extender demasiado la noche previa. El asesor puede ordenar estos tiempos para que el viaje se sienta fluido.",
        "Oportunidad SEO y comercial. Centro Historico Cartagena es una busqueda clave para viajeros que desean ubicacion, cultura y alojamientos con caracter. Esta pagina ayuda a posicionar alojamientos en Cartagena, villas de lujo Cartagena, city tour privado Cartagena y experiencias romanticas cerca de la ciudad amurallada. Tambien fortalece enlaces internos hacia paquetes premium y destinos complementarios como Getsemani e Islas del Rosario.",
        "Contexto practico. Aunque es una zona caminable, no todos los viajeros tienen el mismo ritmo. Familias, adultos mayores o grupos con agendas apretadas deben revisar horarios, distancias y pausas. La asistencia local permite transformar una visita bonita en una experiencia ordenada, especialmente cuando se combinan alojamiento, cena, fotografia y recorridos.",
        "Cierre editorial. Por eso el Centro Historico debe tratarse como destino, zona de hospedaje y punto de partida comercial al mismo tiempo. La pagina debe orientar a quien busca donde quedarse, que hacer cerca y como convertir la inspiracion cultural en una reserva asistida.",
        "Preguntas frecuentes. El Centro Historico es buena zona para hospedarse si se busca cultura, restaurantes y movilidad corta. Es conveniente para viajeros internacionales y parejas. Se puede combinar con islas, cenas y city tours. Para quienes priorizan playa diaria, el asesor puede comparar esta zona con Bocagrande o proponer un itinerario mixto."
      ),
      faq: [
        {
          question: "El Centro Historico es buena zona para hospedarse?",
          answer:
            "Si. Es una zona estrategica para moverse a pie, visitar lugares historicos y disfrutar restaurantes y vida cultural.",
        },
        {
          question: "Que experiencias combinan bien con esta zona?",
          answer:
            "City tours privados, recorridos nocturnos, cenas romanticas, experiencias gastronomicas y planes fotograficos funcionan especialmente bien desde el Centro Historico.",
        },
        {
          question: "Es una zona conveniente para viajeros internacionales?",
          answer:
            "Si. Tiene buena oferta de restaurantes, cercania a puntos turisticos y facil coordinacion de traslados asistidos.",
        },
      ],
      heroImage:
        "https://images.unsplash.com/photo-1596139003991-53b03de123f5?auto=format&fit=crop&q=70&w=1600",
      location: "Centro Historico, Cartagena",
      isFeatured: true,
      sortOrder: 2,
      translations: {
        en: {
          name: "Historic Center",
          shortDescription:
            "Walled district with colonial architecture, plazas, restaurants and strategic premium stays.",
          description:
            "The Historic Center is ideal for travelers who want to walk Cartagena and stay close to restaurants, churches, boutiques and cultural spots.",
          seoTitle: "Cartagena Historic Center | Cartagena Tailored Travel",
          seoDescription:
            "Discover Cartagena's Historic Center for premium stays, restaurants, colonial plazas and private experiences.",
          seoContent: paragraphs(
            "Cartagena's Historic Center is one of the most strategic areas for travelers who want to stay close to the walled city, colonial plazas, restaurants, churches, boutiques and terraces.",
            "For premium stays, this area reduces transfer time and creates more space to enjoy architecture, sunsets, gastronomy and private guided experiences.",
            "It is ideal for couples, families and private groups looking for a refined, cultural and practical Cartagena experience."
          ),
          faq: [
            {
              question: "Is the Historic Center a good area to stay?",
              answer:
                "Yes. It is strategic for walking, visiting historic places and enjoying restaurants and culture.",
            },
            {
              question: "What experiences work well from this area?",
              answer:
                "Private city tours, night walks, romantic dinners, gastronomy and photography experiences are especially convenient from the Historic Center.",
            },
          ],
        },
      },
    },
    {
      name: "Bocagrande",
      slug: "bocagrande",
      shortDescription:
        "Sector moderno frente al mar con hoteles, apartamentos, playa, restaurantes y facil acceso.",
      description:
        "Bocagrande ofrece una Cartagena moderna, cercana a la playa y con acceso comodo a restaurantes, comercio y transporte. Es una alternativa practica para familias, parejas y viajeros que buscan mar y ciudad.",
      seoTitle: "Bocagrande Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Conoce Bocagrande, zona moderna de Cartagena con playa, apartamentos, restaurantes y servicios para viajes premium.",
      seoContent: paragraphs(
        "Introduccion al destino. Bocagrande representa la Cartagena moderna frente al mar. Es una zona practica para viajeros que quieren playa, edificios contemporaneos, restaurantes, comercio, servicios urbanos y acceso rapido a otros puntos de la ciudad. Su perfil es diferente al Centro Historico: menos colonial, mas costero y con una dinamica ideal para quienes buscan una base funcional cerca del Caribe.",
        "Por que visitar esta zona. Bocagrande es atractiva para familias, parejas y grupos que desean combinar descanso, playa, alojamiento moderno y movilidad sencilla. Para viajes premium, puede funcionar como base comoda cuando el plan incluye salidas a islas, cenas, traslados y recorridos por el Centro Historico. Tambien puede ser conveniente para viajeros que prefieren apartamentos o edificios con servicios y vista al mar.",
        "Que hacer alli. En Bocagrande se puede caminar frente al mar, visitar playas urbanas, acceder a restaurantes, organizar compras, coordinar transporte hacia el Centro Historico y preparar salidas hacia islas. Aunque no reemplaza la experiencia historica de la ciudad amurallada, si ofrece un punto de apoyo practico para itinerarios que mezclan playa, descanso y actividades privadas.",
        "Donde hospedarse cerca. Esta zona puede ser adecuada para apartamentos premium, alojamientos frente al mar y estadias con servicios urbanos. La seleccion debe considerar vista, acceso, capacidad, cercania a playa, seguridad, tiempos de traslado y tipo de viaje. Para familias, conviene revisar cocina, zonas comunes y facilidad de transporte. Para parejas, puede combinarse con cenas y experiencias romanticas en otras zonas.",
        "Experiencias recomendadas. Bocagrande conecta bien con tours privados a Islas del Rosario, cenas especiales, transporte privado, city tours por el Centro Historico y paquetes que mezclan ciudad e islas. Tambien puede ser una buena zona para descansar entre actividades, especialmente si el itinerario tiene varios dias.",
        "Consejos para visitantes. No asumir que todas las playas tienen la misma tranquilidad; conviene recibir recomendaciones locales sobre horarios y zonas. Si el plan principal es cultura, el Centro Historico puede ser mejor base. Si el plan principal es descanso, playa y movilidad moderna, Bocagrande puede ser muy conveniente. Confirmar tiempos de traslado en temporada alta ayuda a evitar retrasos.",
        "Perfil de viajero. Bocagrande funciona para familias que quieren servicios urbanos, viajeros que prefieren edificios modernos, parejas que desean vista al mar y grupos que necesitan movilidad practica. Tambien es atractivo para quienes buscan alternar playa urbana con actividades privadas sin alojarse necesariamente dentro de la ciudad amurallada.",
        "Como conectar el destino con productos. La zona puede relacionarse con alojamientos modernos, salidas a Islas del Rosario, paquetes de ciudad e islas, transporte privado y experiencias gastronomicas. Aunque muchas experiencias se desarrollan en Centro Historico o islas, Bocagrande puede ser una base logistica eficiente para iniciar o cerrar actividades.",
        "Planificacion recomendada. Si el alojamiento esta en Bocagrande, conviene revisar traslados hacia Centro Historico, muelles y restaurantes antes de confirmar horarios. Para paquetes de varios dias, puede funcionar alternar una jornada de ciudad, una jornada de islas y un dia mas tranquilo frente al mar.",
        "Oportunidad SEO y comercial. Bocagrande Cartagena atrae busquedas de viajeros que desean playa, apartamentos, hoteles y una ubicacion moderna. Esta pagina puede conectar alojamiento en Cartagena, luxury accommodations Cartagena, paquetes con islas y experiencias privadas. Tambien ayuda a explicar diferencias entre hospedarse en playa urbana o en Centro Historico.",
        "Contexto practico. Bocagrande puede parecer sencillo por su oferta comercial, pero la experiencia cambia mucho segun edificio, vista, acceso y tiempos de traslado. Un asesor puede ayudar a elegir si conviene esta zona o si es mejor alojarse en la ciudad amurallada y visitar Bocagrande solo como complemento.",
        "Cierre editorial. Para SEO turistico, Bocagrande ayuda a cubrir la intencion de busqueda de playa y alojamiento moderno, complementando el contenido historico de Cartagena. Su pagina debe orientar, comparar zonas y conducir hacia productos reales como alojamientos, paquetes con islas y experiencias privadas. Tambien permite explicar cuando conviene elegir playa urbana y cuando conviene priorizar cultura, cercania a murallas o vida nocturna. Esa comparacion mejora la decision del viajero y reduce solicitudes mal enfocadas.",
        "Preguntas frecuentes. Bocagrande esta relativamente cerca del Centro Historico y permite combinar playa con ciudad amurallada. Es recomendable para viajeros que quieren playa urbana, restaurantes y base moderna. Tambien puede integrarse con paquetes premium, salidas a islas y experiencias privadas."
      ),
      faq: [
        {
          question: "Bocagrande esta cerca del Centro Historico?",
          answer:
            "Si. Normalmente el traslado al Centro Historico es corto y permite combinar playa con ciudad amurallada.",
        },
        {
          question: "Para que tipo de viajero conviene Bocagrande?",
          answer:
            "Conviene a viajeros que quieren playa cercana, acceso a restaurantes, movilidad sencilla y una base moderna para combinar ciudad e islas.",
        },
      ],
      heroImage:
        "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=70&w=1600",
      location: "Bocagrande, Cartagena",
      sortOrder: 3,
      translations: {
        en: {
          name: "Bocagrande",
          shortDescription:
            "Modern seaside area with hotels, apartments, beach, restaurants and easy access.",
          description:
            "Bocagrande offers a modern side of Cartagena, close to the beach and convenient for restaurants, commerce and transportation.",
          seoTitle: "Bocagrande Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Discover Bocagrande, Cartagena's modern beach area with apartments, restaurants and premium travel services.",
          seoContent: paragraphs(
            "Bocagrande represents modern Cartagena by the sea, with beach access, contemporary buildings, restaurants and practical mobility.",
            "For premium travel, it works well as a comfortable base when the itinerary combines rest, island outings, dinners, transfers and visits to the Historic Center.",
            "It is a strong option for families, couples and groups who prefer an urban Caribbean setting with services that can be coordinated easily."
          ),
          faq: [
            {
              question: "Is Bocagrande close to the Historic Center?",
              answer:
                "Yes. The transfer to the Historic Center is usually short and lets travelers combine beach and the walled city.",
            },
            {
              question: "Who should choose Bocagrande?",
              answer:
                "Travelers who want beach proximity, restaurants, easy mobility and a modern base for combining city and islands.",
            },
          ],
        },
      },
    },
    {
      name: "Getsemani",
      slug: "getsemani",
      shortDescription:
        "Barrio cultural con arte urbano, plazas, gastronomia local y ambiente caribeno.",
      description:
        "Getsemani es una zona vibrante de Cartagena, reconocida por sus murales, calles coloridas, restaurantes, bares y vida local. Funciona muy bien para recorridos culturales y experiencias autenticas.",
      seoTitle: "Getsemani Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Explora Getsemani en Cartagena, barrio cultural con arte urbano, gastronomia, plazas y experiencias locales.",
      seoContent: paragraphs(
        "Introduccion al destino. Getsemani es uno de los barrios mas expresivos de Cartagena. Sus murales, plazas, fachadas coloridas, bares y restaurantes lo convierten en una zona ideal para descubrir el lado cultural y local de la ciudad. Aunque esta cerca del Centro Historico, tiene una personalidad distinta: mas artistica, mas urbana y con una energia caribena muy marcada.",
        "Por que visitar esta zona. Getsemani atrae a viajeros que quieren algo mas autentico sin alejarse demasiado de los principales puntos turisticos. En un viaje premium, funciona muy bien como complemento del Centro Historico: permite vivir recorridos privados con mas caracter, fotografia urbana, gastronomia local y experiencias nocturnas con acompanamiento cuando sea necesario.",
        "Que hacer alli. Se pueden recorrer calles con arte urbano, visitar plazas, conocer historias de barrio, tomar fotografias, probar gastronomia local y conectar con rutas culturales. Tambien es una zona interesante para experiencias al atardecer o de noche, siempre con recomendaciones claras sobre ruta y horarios.",
        "Donde hospedarse cerca. Algunos viajeros eligen Getsemani por su ambiente cultural, aunque para estadias premium muchos prefieren alojarse en el Centro Historico y visitar Getsemani como experiencia. La decision depende del nivel de ruido tolerado, tipo de alojamiento, seguridad, movilidad y objetivo del viaje. El asesor puede comparar opciones segun perfil del grupo.",
        "Experiencias recomendadas. City tour historico, recorrido fotografico, ruta nocturna, experiencia gastronomica local y paquetes de Cartagena completa combinan bien con Getsemani. Tambien se puede integrar como parada dentro de un itinerario que incluya Centro Historico, murallas y cena.",
        "Consejos para visitantes. Usar ropa fresca, calzado comodo y llevar una ruta definida. De noche, conviene seguir recomendaciones locales y evitar improvisar desplazamientos si no se conoce la ciudad. Para fotografia, los mejores momentos suelen ser manana o tarde, cuando la luz resalta colores y murales.",
        "Perfil de viajero. Getsemani atrae a viajeros que quieren cultura, color, vida local y una Cartagena menos formal. Es interesante para parejas jovenes, grupos de amigos, viajeros internacionales curiosos y personas que buscan fotografia urbana. Para familias o viajeros que prefieren mas tranquilidad, puede ser mejor visitarlo como experiencia y alojarse en una zona mas calmada.",
        "Como conectar el destino con productos. Getsemani puede relacionarse con city tours, rutas fotograficas, experiencias gastronomicas y paquetes de Cartagena completa. Tambien puede aparecer como parada recomendada en itinerarios que tienen alojamiento en Centro Historico y experiencias nocturnas o culturales.",
        "Planificacion recomendada. Visitar Getsemani con una ruta clara permite aprovechar mejor plazas, murales y restaurantes. Si se integra de noche, conviene coordinar transporte y horarios. Si se integra de dia, puede combinarse con Centro Historico para una lectura mas completa de la ciudad.",
        "Oportunidad SEO y comercial. Getsemani Cartagena es una busqueda importante para viajeros interesados en cultura, arte urbano y vida local. Esta pagina puede enlazar con city tours privados, fotografia, gastronomia y paquetes que combinen historia con experiencias mas autenticas. Tambien ayuda a explicar que Getsemani no es solo una parada rapida, sino una zona con identidad propia.",
        "Contexto practico. La energia de Getsemani puede ser maravillosa, pero tambien requiere criterio de horarios y rutas. Un viajero que busca tranquilidad puede preferir visitarlo de dia; otro que busca vida nocturna puede integrarlo al cierre de la jornada. Esa diferencia es clave para personalizar el viaje.",
        "Integracion con itinerarios. Getsemani puede aparecer despues de un recorrido por murallas, antes de una cena o como parte de un paquete de 3 dias. Al conectarlo con productos reales, el destino deja de ser una descripcion generica y se vuelve una puerta hacia una reserva asistida.",
        "Cierre editorial. Esta pagina debe capturar busquedas culturales y convertirlas en recorridos, paquetes o recomendaciones de zona con apoyo del asesor. Tambien aporta diversidad semantica al sitio porque habla de arte urbano, vida local, plazas y gastronomia, no solo de lujo o playa. Esa variedad ayuda a construir una presencia organica mas completa para Cartagena. Tambien mejora enlaces hacia experiencias culturales, paquetes urbanos y rutas fotograficas privadas. Su valor esta en mostrar otra cara de la ciudad. Muy local.",
        "Preguntas frecuentes. Getsemani se puede visitar de dia o de noche, pero conviene hacerlo con ruta clara. Es ideal para cultura, arte urbano, fotografia y gastronomia local. Puede combinarse con Centro Historico, city tour o experiencias nocturnas."
      ),
      faq: [
        {
          question: "Que se puede hacer en Getsemani?",
          answer:
            "Recorridos culturales, fotografia, gastronomia local, plazas y visitas a calles con arte urbano.",
        },
        {
          question: "Getsemani se puede visitar de noche?",
          answer:
            "Si, pero conviene hacerlo con una ruta definida y recomendaciones locales, especialmente para viajeros que no conocen la ciudad.",
        },
      ],
      heroImage:
        "https://images.unsplash.com/photo-1583531352515-8884af319dc1?auto=format&fit=crop&q=70&w=1600",
      location: "Getsemani, Cartagena",
      sortOrder: 4,
      translations: {
        en: {
          name: "Getsemani",
          shortDescription:
            "Cultural neighborhood with street art, plazas, local gastronomy and Caribbean atmosphere.",
          description:
            "Getsemani is a vibrant area of Cartagena known for murals, colorful streets, restaurants, bars and local life.",
          seoTitle: "Getsemani Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Explore Getsemani in Cartagena, a cultural neighborhood with street art, gastronomy, plazas and local experiences.",
          seoContent: paragraphs(
            "Getsemani is one of Cartagena's most expressive neighborhoods, known for murals, colorful streets, plazas, restaurants and local energy.",
            "In a premium itinerary, it complements the Historic Center with private cultural walks, urban photography, local gastronomy and nightlife experiences.",
            "It is recommended for travelers who want authenticity while keeping the comfort of planned routes and local guidance."
          ),
          faq: [
            {
              question: "What can you do in Getsemani?",
              answer:
                "Cultural walks, photography, local gastronomy, plazas and streets with urban art.",
            },
            {
              question: "Can Getsemani be visited at night?",
              answer:
                "Yes, but it is better with a defined route and local recommendations, especially for first-time visitors.",
            },
          ],
        },
      },
    },
    {
      name: "Islas del Rosario",
      slug: "islas-del-rosario",
      shortDescription:
        "Destino de mar Caribe para yates, pasadias, aguas turquesa y planes privados desde Cartagena.",
      description:
        "Las Islas del Rosario son uno de los planes mas solicitados desde Cartagena. Permiten organizar yates privados, pasadias, almuerzos frente al mar y experiencias nauticas con atencion personalizada.",
      seoTitle: "Islas del Rosario Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Planea experiencias privadas en Islas del Rosario desde Cartagena: yates, pasadias, almuerzos y mar Caribe.",
      seoContent: paragraphs(
        "Introduccion al destino. Las Islas del Rosario son uno de los planes mas buscados desde Cartagena para quienes desean mar turquesa, embarcaciones privadas, pasadias y almuerzos frente al Caribe. La experiencia puede ser tranquila, familiar, romantica o enfocada en celebraciones, siempre que se planifique con atencion a clima, horarios y disponibilidad.",
        "Por que visitar esta zona. Este destino permite complementar la energia historica de Cartagena con una jornada de mar. Para viajeros premium, el valor esta en evitar una excursion masiva y construir una salida mas cuidada, con ruta, proveedor y servicios validados. Las islas son ideales para parejas, familias, grupos privados, celebraciones y viajeros internacionales que quieren una experiencia nautica memorable.",
        "Que hacer alli. Se puede navegar, descansar, tomar fotografias, disfrutar aguas turquesa, coordinar almuerzo, visitar puntos sugeridos y vivir un dia de desconexion. La ruta exacta depende del clima, tipo de embarcacion y disponibilidad de proveedores. Tambien pueden integrarse servicios adicionales como fotografia, decoracion, transporte o experiencia gastronomica si se validan previamente.",
        "Donde hospedarse cerca. Normalmente los viajeros se hospedan en Cartagena y salen a las islas por el dia. El Centro Historico funciona bien para quienes quieren combinar cultura y salida nautica; Bocagrande puede ser practico para quienes prefieren una base moderna frente al mar. La seleccion debe considerar horarios de salida y regreso.",
        "Experiencias recomendadas. Tour privado a Islas del Rosario, paquete Islas + ciudad amurallada, Cartagena premium 3 dias, salida en embarcacion privada y experiencias de celebracion son las combinaciones mas naturales. Si el viaje es romantico, las islas pueden integrarse con cena privada o decoracion especial en otro momento del itinerario.",
        "Consejos para visitantes. Llevar documento, protector solar, ropa ligera, traje de bano, cambio adicional e hidratacion. Evitar programar salidas a islas inmediatamente despues de vuelos largos. Informar si hay ninos, adultos mayores o restricciones de movilidad. La validacion del asesor es importante porque clima y mar pueden cambiar el plan.",
        "Perfil de viajero. Las Islas del Rosario son ideales para parejas, familias, celebraciones, grupos privados y viajeros que priorizan experiencias de mar. Tambien funcionan para quienes buscan una actividad memorable dentro de un viaje corto. Si el viajero prefiere historia y gastronomia, las islas pueden ser complemento; si busca descanso y paisaje, pueden convertirse en el eje principal del itinerario.",
        "Como conectar el destino con productos. Este destino se conecta con tours privados, paquetes de islas y ciudad, servicios premium, fotografia y alojamientos en Cartagena que sirven como base antes o despues de la salida. La relacion entre destino, experiencia y paquete ayuda a que el usuario entienda como pasar de inspiracion a reserva asistida.",
        "Planificacion recomendada. Reservar con anticipacion, salir temprano, dejar margen al regreso y no sobrecargar la noche posterior. En temporada alta, la disponibilidad de embarcaciones y proveedores cambia rapido. El asesor revisa condiciones maritimas, ruta y servicios para que el viajero no dependa de informacion incompleta.",
        "Oportunidad SEO y comercial. Islas del Rosario Cartagena, yacht rental Cartagena e Islas del Rosario private tour son busquedas de alto valor comercial. Esta pagina debe aclarar que la experiencia no es un producto unico, sino una categoria de planes que puede incluir yate, lancha, almuerzo, celebracion, fotografia o paquete combinado con la ciudad amurallada.",
        "Contexto practico. Las islas requieren mas validacion que otros destinos porque dependen de mar, clima, disponibilidad de embarcacion y punto de salida. La asistencia local evita que el viajero compre un plan que no corresponde a su expectativa de privacidad, comodidad o nivel de servicio.",
        "Cierre editorial. Por eso el contenido debe explicar la diferencia entre inspirarse con las islas y reservar una experiencia real, validada y adecuada al grupo. Esta pagina debe conectar busquedas de yates, tours privados, pasadias y paquetes con una solicitud asistida. Tambien debe recordar que el valor premium esta en la coordinacion previa, no solo en llegar al mar. Esa claridad mejora conversion, confianza y calidad de la solicitud. Tambien evita expectativas poco realistas. Muy importante.",
        "Preguntas frecuentes. Las Islas del Rosario se visitan normalmente en lancha o yate desde Cartagena. El plan depende del clima y condiciones maritimas. Puede ser privado o asistido segun disponibilidad. Se recomienda reservar con anticipacion en temporada alta y confirmar que servicios estan incluidos antes de pagar."
      ),
      faq: [
        {
          question: "Como se visitan las Islas del Rosario?",
          answer:
            "Normalmente se visitan en lancha o yate desde Cartagena, con ruta y servicios coordinados previamente.",
        },
        {
          question: "El plan depende del clima?",
          answer:
            "Si. Las condiciones climaticas y maritimas pueden modificar horarios, rutas o disponibilidad de proveedores.",
        },
        {
          question: "Para quienes es ideal?",
          answer:
            "Para parejas, familias, grupos privados, celebraciones y viajeros que quieren una experiencia de mar con asistencia personalizada.",
        },
      ],
      heroImage:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=70&w=1600",
      location: "Islas del Rosario, Cartagena",
      isFeatured: true,
      sortOrder: 5,
      translations: {
        en: {
          name: "Rosario Islands",
          shortDescription:
            "Caribbean sea destination for yachts, day trips, turquoise waters and private plans from Cartagena.",
          description:
            "The Rosario Islands are one of the most requested plans from Cartagena, ideal for private yachts, day trips and seaside lunches.",
          seoTitle: "Rosario Islands Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Plan private Rosario Islands experiences from Cartagena: yachts, day trips, lunches and the Caribbean Sea.",
          seoContent: paragraphs(
            "The Rosario Islands are one of the most requested plans from Cartagena for travelers who want turquoise water, private boats, day trips and Caribbean seaside lunches.",
            "Planning matters: weather, boat type, departure point, route, timing, included services and group preferences should be validated before confirmation.",
            "This destination connects naturally with multi-day packages, private nautical experiences and premium stays in Cartagena."
          ),
          faq: [
            {
              question: "How do you visit the Rosario Islands?",
              answer:
                "They are usually visited by boat or yacht from Cartagena, with route and services coordinated in advance.",
            },
            {
              question: "Does the plan depend on weather?",
              answer:
                "Yes. Weather and sea conditions may affect schedules, routes or provider availability.",
            },
          ],
        },
      },
    },
    {
      name: "Iglesias de Cartagena",
      slug: "iglesias-de-cartagena",
      shortDescription:
        "Ruta patrimonial por iglesias coloniales, plazas y arquitectura religiosa del Centro Historico.",
      description:
        "Las iglesias de Cartagena forman parte esencial de la identidad historica de la ciudad. Son puntos de interes para recorridos culturales, fotografia, arquitectura colonial y experiencias privadas dentro del Centro Historico.",
      seoTitle: "Iglesias de Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Descubre iglesias coloniales de Cartagena, arquitectura historica, plazas y recorridos culturales privados.",
      seoContent: paragraphs(
        "Introduccion al destino. Las iglesias de Cartagena forman parte esencial de la identidad historica, cultural y arquitectonica de la ciudad. Dentro del Centro Historico y sus alrededores, estos espacios conectan la historia colonial, las plazas, las calles amuralladas y la vida espiritual que marco buena parte del desarrollo urbano de Cartagena. Para viajeros interesados en cultura, fotografia y patrimonio, las iglesias ofrecen una lectura mas profunda del destino.",
        "Por que visitar esta zona. Visitar iglesias coloniales permite entender Cartagena mas alla de sus murallas y restaurantes. Cada templo se relaciona con una plaza, una calle, una historia local y una epoca. En un viaje premium, esta ruta puede integrarse como experiencia privada para viajeros que prefieren recorridos con contexto, ritmo tranquilo y explicaciones cuidadas. Tambien es una alternativa atractiva para parejas, familias y visitantes internacionales que buscan una Cartagena historica y elegante.",
        "Que hacer alli. Se pueden recorrer fachadas coloniales, plazas cercanas, detalles arquitectonicos, altares, calles historicas y puntos fotograficos. La ruta puede incluir explicaciones sobre la ciudad amurallada, vida religiosa, arquitectura, tradiciones y transformacion urbana. Tambien puede conectarse con un city tour historico, una experiencia fotografica o una cena en el Centro Historico.",
        "Donde hospedarse cerca. El Centro Historico es la zona mas conveniente para quienes desean visitar iglesias de Cartagena sin traslados largos. Alojarse cerca permite caminar hacia varios puntos patrimoniales, combinar la ruta con restaurantes y aprovechar mejor el dia. Para viajeros que prefieren playa, Bocagrande puede ser una base alternativa, pero requerira traslados hacia el circuito historico.",
        "Experiencias recomendadas. Las iglesias combinan bien con city tour historico premium, recorrido fotografico, ruta nocturna por Cartagena, experiencias gastronomicas y paquetes de 3 dias. Tambien pueden ser parte de un itinerario romantico, especialmente si el viaje incluye celebracion, aniversario o interes por locaciones historicas.",
        "Consejos para visitantes. Usar ropa fresca pero respetuosa, revisar horarios de apertura, evitar interrumpir ceremonias y confirmar si se permite fotografia en interiores. En temporada alta o fechas religiosas, algunos espacios pueden tener restricciones. Un guia o asesor ayuda a ordenar la ruta para evitar tiempos muertos y conectar mejor cada parada.",
        "Perfil de viajero. Esta ruta es adecuada para viajeros culturales, parejas interesadas en locaciones historicas, familias que quieren una actividad tranquila y visitantes internacionales que desean entender Cartagena desde su patrimonio religioso. Tambien funciona para personas que disfrutan arquitectura, fotografia y relatos locales sin necesidad de una experiencia fisicamente exigente.",
        "Como conectar el destino con productos. Iglesias de Cartagena puede conectarse con city tour historico premium, alojamientos en Centro Historico, paquetes culturales y experiencias fotograficas. Si el viajero ya esta hospedado en la zona amurallada, la ruta puede integrarse de forma natural sin traslados largos.",
        "Planificacion recomendada. La visita debe organizarse segun horarios de apertura, ceremonias, clima y nivel de detalle deseado. Una ruta corta puede enfocarse en fachadas y plazas; una ruta mas profunda puede incluir contexto historico, arquitectura, simbolos religiosos y relacion con la vida colonial de Cartagena.",
        "Oportunidad SEO y comercial. Iglesias de Cartagena ayuda a posicionar contenido cultural mas especifico que las paginas generales de destino. Aporta profundidad para busquedas de arquitectura, patrimonio, Centro Historico Cartagena y recorridos culturales privados. Tambien fortalece el city tour historico premium porque ofrece un subtema concreto que puede convertirse en experiencia.",
        "Contexto practico. Algunas iglesias pueden estar abiertas solo en ciertos horarios o tener actividades religiosas. Por eso conviene planear con respeto, evitar visitas invasivas y adaptar el recorrido a la agenda real del grupo. Un asesor o guia puede convertir la ruta en una experiencia cultural fluida en lugar de una lista de paradas sin contexto.",
        "Cierre editorial. Este destino complementa la estrategia SEO al cubrir patrimonio religioso, historia colonial y rutas culturales para viajeros que buscan profundidad. Tambien ayuda a enriquecer el city tour historico con subtemas concretos y enlaces internos hacia productos reales. Es una pieza util para diferenciar el sitio frente a contenidos turisticos demasiado generales. Tambien apoya busquedas culturales de larga cola.",
        "Preguntas frecuentes. Las iglesias se pueden visitar como parte de un city tour privado. Algunas pueden tener horarios limitados o restricciones de acceso. La ruta es recomendable para cultura, fotografia y arquitectura. Se puede combinar con alojamiento en el Centro Historico, cena romantica o paquetes culturales de Cartagena."
      ),
      faq: [
        {
          question: "Se pueden visitar iglesias en un tour privado?",
          answer:
            "Si. Pueden integrarse a un city tour historico o ruta cultural privada segun horarios y disponibilidad.",
        },
        {
          question: "Las iglesias tienen horarios especiales?",
          answer:
            "Algunas pueden tener horarios limitados, ceremonias o restricciones de acceso, por eso conviene validar antes de la visita.",
        },
        {
          question: "Es una ruta recomendada para fotografia?",
          answer:
            "Si. Fachadas, plazas y detalles coloniales funcionan muy bien para fotografia cultural y arquitectonica.",
        },
      ],
      heroImage:
        "https://images.unsplash.com/photo-1596139003991-53b03de123f5?auto=format&fit=crop&q=70&w=1600",
      location: "Centro Historico, Cartagena",
      sortOrder: 6,
      translations: {
        en: {
          name: "Churches of Cartagena",
          shortDescription:
            "Heritage route through colonial churches, plazas and religious architecture in the Historic Center.",
          description:
            "Cartagena's churches are part of the city's historic identity, ideal for cultural routes, photography and colonial architecture.",
          seoTitle: "Churches of Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Discover Cartagena's colonial churches, historic architecture, plazas and private cultural routes.",
          seoContent: paragraphs(
            "Cartagena's churches are an essential part of the city's historical, cultural and architectural identity.",
            "A private route through these spaces helps travelers understand the walled city beyond restaurants and viewpoints.",
            "The experience can connect with a historic city tour, photography route, romantic itinerary or cultural package."
          ),
          faq: [
            {
              question: "Can churches be visited on a private tour?",
              answer:
                "Yes. They can be included in a historic city tour or private cultural route depending on access and schedules.",
            },
          ],
        },
      },
    },
  ];

  for (const destination of demoDestinations) {
    await upsertDestination(destination);
  }

  console.log("Destinos demo creados o actualizados.");

  const demoBlogPosts = [
    {
      title: "Que hacer en Cartagena en 3 dias",
      slug: "que-hacer-en-cartagena-en-3-dias",
      excerpt:
        "Borrador editorial para una guia de tres dias en Cartagena combinando ciudad amurallada, experiencias privadas, gastronomia y planes de mar.",
      content: paragraphs(
        "Cartagena puede vivirse en tres dias si el itinerario esta bien organizado. Este borrador propone una estructura inicial para convertir la visita en un viaje premium: llegada con reconocimiento del Centro Historico, recorrido privado por plazas y murallas, experiencia gastronomica, salida a Islas del Rosario y cierre con una actividad personalizada segun el perfil del viajero.",
        "El articulo debe ampliarse antes de publicarse con recomendaciones por horario, zonas sugeridas para hospedaje, enlaces internos a alojamientos, experiencias y paquetes, consejos de movilidad, temporada alta, clima y una propuesta clara para reservar con asesoria. Por estar incompleto, queda como borrador y no se muestra publicamente."
      ),
      coverImage:
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=70&w=1200",
      category: "Guias de viaje",
      tags: ["Cartagena 3 dias", "itinerario", "turismo de lujo"],
      seoTitle: "Que hacer en Cartagena en 3 dias | Cartagena Tailored Travel",
      seoDescription:
        "Guia inicial para planear que hacer en Cartagena en 3 dias con alojamientos premium, tours privados y experiencias personalizadas.",
      seoKeywords: [
        "que hacer en Cartagena en 3 dias",
        "Cartagena itinerary",
        "turismo de lujo Cartagena",
      ],
      isPublished: false,
      isFeatured: false,
      translations: {
        en: {
          title: "What to do in Cartagena in 3 days",
          excerpt:
            "Editorial draft for a three-day Cartagena guide combining the walled city, private experiences, gastronomy and island plans.",
          content: paragraphs(
            "Cartagena can be experienced in three days when the itinerary is organized with care. This draft proposes an initial structure for a premium trip: arrival and Historic Center orientation, private tour through plazas and walls, gastronomy, Rosario Islands and a final tailored activity.",
            "Before publishing, this article should be expanded with timing, accommodation areas, internal links to stays, experiences and packages, mobility tips, high-season advice and a clear assisted-booking proposal."
          ),
          seoTitle: "What to do in Cartagena in 3 days | Cartagena Tailored Travel",
          seoDescription:
            "Initial guide to plan what to do in Cartagena in 3 days with premium stays, private tours and tailored experiences.",
        },
      },
    },
    {
      title: "Mejores playas de Cartagena",
      slug: "mejores-playas-de-cartagena",
      excerpt:
        "Borrador para comparar playas urbanas, zonas cercanas e islas recomendadas para viajeros que buscan comodidad y asistencia.",
      content: paragraphs(
        "Las playas de Cartagena ofrecen experiencias muy diferentes segun la zona, el nivel de servicio esperado y el tiempo disponible. Este borrador debe explicar diferencias entre playas urbanas, salidas a islas, planes privados y recomendaciones para evitar expectativas equivocadas.",
        "Antes de publicarse, el articulo debe incluir contexto sobre Bocagrande, playas cercanas, Islas del Rosario, Baru, movilidad, horarios, costos aproximados, seguridad, clima y enlaces hacia experiencias nauticas o paquetes relacionados."
      ),
      coverImage:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=70&w=1200",
      category: "Playas",
      tags: ["playas Cartagena", "Islas del Rosario", "Baru"],
      seoTitle: "Mejores playas de Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Borrador SEO sobre las mejores playas de Cartagena, islas cercanas y planes privados para disfrutar el Caribe colombiano.",
      seoKeywords: [
        "mejores playas de Cartagena",
        "playas Cartagena",
        "Islas del Rosario Cartagena",
      ],
      isPublished: false,
      isFeatured: false,
      translations: {
        en: {
          title: "Best beaches in Cartagena",
          excerpt:
            "Draft to compare urban beaches, nearby areas and recommended islands for travelers seeking comfort and assistance.",
          content: paragraphs(
            "Cartagena beaches offer very different experiences depending on the area, expected service level and available time. This draft should explain the difference between urban beaches, island plans, private tours and expectation management.",
            "Before publishing, the article should include Bocagrande, nearby beaches, Rosario Islands, Baru, transport, timing, approximate costs, safety, weather and links to nautical experiences or related packages."
          ),
          seoTitle: "Best beaches in Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "SEO draft about the best beaches in Cartagena, nearby islands and private plans to enjoy the Colombian Caribbean.",
        },
      },
    },
    {
      title: "Guia de Islas del Rosario",
      slug: "guia-de-islas-del-rosario",
      excerpt:
        "Borrador editorial para explicar como visitar Islas del Rosario con tours privados, horarios, clima y recomendaciones.",
      content: paragraphs(
        "Islas del Rosario es uno de los planes mas buscados desde Cartagena, pero requiere explicar bien transporte, horarios, tipo de embarcacion, clima, expectativas de playa y diferencia entre tour compartido, experiencia privada y paquete premium.",
        "Este borrador debe ampliarse con recomendaciones reales para viajeros internacionales, preguntas frecuentes, enlaces a experiencias de yate privado, paquetes ciudad e islas, consejos sobre temporada y una nota clara sobre validacion asistida antes de reservar."
      ),
      coverImage:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=70&w=1200",
      category: "Islas",
      tags: ["Islas del Rosario", "yate privado", "Cartagena"],
      seoTitle: "Guia de Islas del Rosario | Cartagena Tailored Travel",
      seoDescription:
        "Borrador SEO para planear una visita a Islas del Rosario desde Cartagena con tours privados y asistencia personalizada.",
      seoKeywords: [
        "Guia Islas del Rosario",
        "Rosario Islands private tour",
        "yate privado Cartagena",
      ],
      isPublished: false,
      isFeatured: false,
      translations: {
        en: {
          title: "Rosario Islands Guide",
          excerpt:
            "Editorial draft explaining how to visit the Rosario Islands with private tours, timing, weather and recommendations.",
          content: paragraphs(
            "The Rosario Islands are one of the most requested plans from Cartagena, but they require clear guidance about transport, schedules, boat type, weather, beach expectations and the difference between shared tours, private experiences and premium packages.",
            "This draft should be expanded with real recommendations for international travelers, FAQs, links to private yacht experiences, city-and-island packages, season tips and assisted validation before booking."
          ),
          seoTitle: "Rosario Islands Guide | Cartagena Tailored Travel",
          seoDescription:
            "SEO draft to plan a Rosario Islands visit from Cartagena with private tours and personalized assistance.",
        },
      },
    },
    {
      title: "Donde hospedarse en Cartagena",
      slug: "donde-hospedarse-en-cartagena",
      excerpt:
        "Borrador para orientar al viajero entre Centro Historico, Bocagrande, Getsemani e islas segun su estilo de viaje.",
      content: paragraphs(
        "Elegir donde hospedarse en Cartagena cambia completamente la experiencia. Este borrador debe explicar diferencias entre Centro Historico, Bocagrande, Getsemani, zonas frente al mar y alternativas cercanas a islas para viajeros que buscan comodidad, movilidad y servicios premium.",
        "Antes de publicarlo se deben agregar criterios por tipo de viajero, capacidad, presupuesto, cercania a restaurantes, playa, seguridad, ruido, transporte, enlaces a alojamientos y recomendaciones para combinar la estadia con experiencias privadas."
      ),
      coverImage:
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=70&w=1200",
      category: "Alojamientos",
      tags: ["alojamiento Cartagena", "Centro Historico", "Bocagrande"],
      seoTitle: "Donde hospedarse en Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Borrador SEO sobre las mejores zonas para hospedarse en Cartagena segun estilo de viaje, movilidad y experiencias premium.",
      seoKeywords: [
        "donde hospedarse en Cartagena",
        "alojamiento en Cartagena",
        "luxury accommodations Cartagena",
      ],
      isPublished: false,
      isFeatured: false,
      translations: {
        en: {
          title: "Where to stay in Cartagena",
          excerpt:
            "Draft to guide travelers through the Historic Center, Bocagrande, Getsemani and islands according to their travel style.",
          content: paragraphs(
            "Choosing where to stay in Cartagena changes the entire experience. This draft should explain the differences between the Historic Center, Bocagrande, Getsemani, beachfront areas and island-adjacent alternatives for travelers seeking comfort, mobility and premium services.",
            "Before publishing, it should include traveler profiles, capacity, budget, restaurant access, beach access, safety, noise, transport, links to stays and recommendations to combine accommodation with private experiences."
          ),
          seoTitle: "Where to stay in Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "SEO draft about the best areas to stay in Cartagena according to travel style, mobility and premium experiences.",
        },
      },
    },
    {
      title: "Luxury Travel Guide Cartagena",
      slug: "luxury-travel-guide-cartagena",
      excerpt:
        "Borrador bilingue para captar busquedas internacionales sobre turismo de lujo, villas, tours privados y experiencias premium.",
      content: paragraphs(
        "Cartagena is a strong luxury travel destination when the trip is planned around premium accommodations, private tours, curated gastronomy, island experiences and reliable local assistance. This draft should become an English-first editorial piece with Spanish base content and international SEO intent.",
        "Before publishing, the article should include sections about where to stay, private tours, Rosario Islands, restaurants, safety, airport transfers, tailored packages, suggested length of stay, seasonal advice and internal links to accommodations, experiences, packages and destinations."
      ),
      coverImage:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
      category: "Luxury travel",
      tags: ["luxury travel Cartagena", "private tours", "premium stays"],
      seoTitle: "Luxury Travel Guide Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Draft SEO guide for luxury travel in Cartagena with premium accommodations, private tours and tailored experiences.",
      seoKeywords: [
        "Luxury Travel Guide Cartagena",
        "luxury travel Cartagena",
        "private tours Cartagena",
      ],
      isPublished: false,
      isFeatured: false,
      translations: {
        en: {
          title: "Luxury Travel Guide Cartagena",
          excerpt:
            "Bilingual draft for international searches about luxury tourism, villas, private tours and premium experiences.",
          content: paragraphs(
            "Cartagena is a strong luxury travel destination when the trip is planned around premium accommodations, private tours, curated gastronomy, island experiences and reliable local assistance.",
            "Before publishing, this article should include where to stay, private tours, Rosario Islands, restaurants, safety, transfers, tailored packages, seasonal advice and internal links."
          ),
          seoTitle: "Luxury Travel Guide Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Draft SEO guide for luxury travel in Cartagena with premium accommodations, private tours and tailored experiences.",
        },
      },
    },
  ];

  for (const post of demoBlogPosts) {
    await upsertBlogPost(post);
  }

  console.log("Articulos demo de blog creados o actualizados como borradores.");

  const demoExchangeRates = [
    { id: "demo_usd_cop_20260604", fromCurrency: "USD", rate: 4000 },
    { id: "demo_eur_cop_20260604", fromCurrency: "EUR", rate: 4300 },
    { id: "demo_brl_cop_20260604", fromCurrency: "BRL", rate: 780 },
  ];

  for (const exchangeRate of demoExchangeRates) {
    await prisma.exchangeRate.upsert({
      where: { id: exchangeRate.id },
      update: {
        toCurrency: "COP",
        rate: exchangeRate.rate,
        source: "MANUAL",
        rateDate: new Date(),
        isActive: true,
      },
      create: {
        id: exchangeRate.id,
        fromCurrency: exchangeRate.fromCurrency,
        toCurrency: "COP",
        rate: exchangeRate.rate,
        source: "MANUAL",
        rateDate: new Date(),
        isActive: true,
      },
    });
  }

  console.log("Tasas demo creadas o actualizadas.");

  const demoProperties = [
    {
      title: "Villa demo en Centro Historico",
      slug: "villa-demo-centro-historico",
      description:
        "Villa premium en el Centro Historico de Cartagena para validar el flujo asistido con una ficha comercial completa, contenido SEO visible y servicios preparados para viajeros internacionales.",
      seoTitle:
        "Villa premium en el Centro Historico de Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Villa premium en el Centro Historico de Cartagena con ubicacion estrategica, amenities de lujo y asesoria personalizada.",
      seoKeywords:
        "villa en Cartagena, alojamiento de lujo Cartagena, Centro Historico Cartagena, villa premium Cartagena, villas de lujo Cartagena, alojamiento Centro Historico Cartagena",
      seoContent: paragraphs(
        "Sobre este alojamiento. Esta villa premium en el Centro Historico de Cartagena esta pensada para viajeros que desean vivir la ciudad con comodidad, privacidad y una ubicacion estrategica. La propiedad esta configurada para hasta 6 huespedes, con 3 habitaciones y 3 banos, lo que la convierte en una opcion conveniente para familias, parejas que viajan con acompanantes o grupos pequenos que buscan una estadia mas cuidada que un alojamiento convencional. Su propuesta combina descanso, ubicacion y validacion asistida antes de confirmar, para que cada solicitud pueda revisarse con criterio operativo y no solo como una compra automatica.",
        "Ubicacion y entorno. El Centro Historico es una de las zonas mas buscadas para alojamiento en Cartagena porque permite caminar hacia plazas coloniales, restaurantes, iglesias, terrazas, boutiques, murallas y puntos culturales. Hospedarse en esta zona ayuda a reducir traslados y facilita organizar una agenda con city tours privados, cenas especiales, experiencias fotograficas y recomendaciones gastronomicas. Para viajeros internacionales, la ubicacion tambien aporta confianza: es facil coordinar llegada desde el aeropuerto, salidas hacia Bocagrande o conexiones con el muelle para planes de islas.",
        "Servicios y comodidades. La ficha esta preparada para mostrar servicios relevantes para una experiencia premium: cocina equipada para estadias flexibles, terraza privada para descansar o compartir, vista o cercania al Centro Historico y posibilidad de sumar servicios adicionales como transporte privado, fotografia profesional, decoracion especial o experiencias gastronomicas. Estos servicios no se tratan como extras genericos, sino como componentes que el asesor valida segun fechas, disponibilidad, tipo de viaje y preferencias del grupo.",
        "Ideal para. Este alojamiento es ideal para quienes quieren una villa en Cartagena con contexto local, acceso cercano a la vida cultural y una experiencia mas personalizada. Funciona bien para viajes familiares, escapadas romanticas, celebraciones privadas, aniversarios, grupos de amigos o viajeros que desean combinar hospedaje con recorridos, restaurantes y salidas a las Islas del Rosario. Tambien es una buena base para paquetes de 2 o 3 dias porque permite iniciar el viaje desde una zona con alta concentracion de atractivos turisticos.",
        "Que hacer cerca. Desde el Centro Historico se puede visitar la Ciudad Amurallada, Plaza Santo Domingo, Torre del Reloj, Getsemani, Castillo de San Felipe, Muelle de la Bodeguita y restaurantes de comida tipica. Tambien es una zona adecuada para caminar al atardecer, descubrir terrazas coloniales, reservar una cena romantica o empezar un city tour historico con guia privado. Si el viaje incluye mar, el asesor puede coordinar la salida hacia islas desde puntos definidos en Cartagena, revisando horarios y condiciones antes de confirmar.",
        "Recomendaciones antes de reservar. En temporada alta conviene solicitar disponibilidad con anticipacion para validar fechas, servicios premium y horarios de llegada. Si el viaje incluye ninos, adultos mayores o personas con movilidad reducida, es mejor informar al asesor antes de confirmar para revisar accesos, tiempos de traslado y ritmo de actividades. Tambien se recomienda definir si el grupo desea cocina disponible, servicios de limpieza, traslados, decoracion, fotografia o experiencias privadas, porque estos detalles ayudan a construir una estadia mas clara y segura.",
        "Como integrar este alojamiento al viaje. La villa puede funcionar como punto de partida para un itinerario premium en Cartagena. Un dia puede enfocarse en la ciudad amurallada, plazas coloniales y gastronomia local; otro puede conectar con una salida privada a Islas del Rosario; y una noche puede reservarse para una cena romantica, un recorrido nocturno o una experiencia fotograficamente cuidada. Esta combinacion permite que el alojamiento no sea solo un lugar para dormir, sino el centro operativo de un viaje personalizado.",
        "Valor de la validacion asistida. En alojamientos de lujo, la informacion visible debe complementarse con una confirmacion humana, porque disponibilidad, condiciones, horarios, servicios externos y necesidades del viajero pueden cambiar. Cartagena Tailored Travel mantiene un flujo asistido para revisar cada solicitud antes de convertirla en reserva, lo que ayuda a proteger al cliente de errores de disponibilidad y permite ajustar detalles como llegada, salida, servicios premium, recomendaciones de zona y experiencias relacionadas.",
        "Preguntas frecuentes. La reserva no se confirma de forma automatica: primero se revisa disponibilidad y condiciones con un asesor. La propiedad puede combinarse con servicios premium y experiencias de Cartagena segun agenda. Si el viajero quiere una estadia centrada en cultura, gastronomia y movilidad corta, el Centro Historico es una de las zonas mas convenientes. Si el objetivo principal es playa diaria, el asesor puede comparar esta ubicacion con Bocagrande o proponer un plan que combine alojamiento en ciudad y salida privada a islas."
      ),
      locationDescription:
        "Ubicada en el Centro Historico de Cartagena, cerca de restaurantes, plazas coloniales, murallas, boutiques, terrazas y puntos culturales. La zona permite caminar a muchos atractivos y coordinar facilmente traslados hacia el aeropuerto, Bocagrande o el muelle para salidas a islas. Es una ubicacion especialmente util para viajeros que quieren reducir tiempos de desplazamiento y aprovechar mejor una estadia corta.",
      nearbyAttractions:
        "Ciudad Amurallada\nPlaza Santo Domingo\nTorre del Reloj\nGetsemani\nCastillo de San Felipe\nMuelle de la Bodeguita\nRestaurantes de comida tipica\nBoutiques y terrazas coloniales",
      guestRecommendations:
        "Ideal para viajeros que quieren alojarse cerca de la vida cultural de Cartagena y combinar hospedaje con experiencias privadas. Se recomienda reservar con anticipacion en temporada alta, confirmar horarios de llegada, informar necesidades de movilidad y solicitar servicios premium como transporte privado, decoracion especial, fotografia o experiencias gastronomicas antes de la fecha del viaje.",
      faq: initialPropertyFaq,
      translations: {
        en: {
          title: "Demo villa in the Historic Center",
          description:
            "Premium villa in Cartagena's Historic Center prepared as a complete commercial page with visible SEO content and assisted booking validation.",
          seoTitle:
            "Premium villa in Cartagena Historic Center | Cartagena Tailored Travel",
          seoDescription:
            "Premium villa in Cartagena's Historic Center with strategic location, luxury amenities and personalized assistance.",
          seoContent: paragraphs(
            "This premium villa in Cartagena's Historic Center is designed for travelers who want comfort, privacy and a strategic location close to plazas, restaurants, walls and cultural routes.",
            "It works especially well for families, couples, small groups and celebration trips that need an elegant base for combining rest, gastronomy, private experiences and island outings.",
            "The booking is handled through assisted validation. An advisor confirms availability, conditions, premium services and additional needs before final confirmation."
          ),
          locationDescription:
            "Located in Cartagena's Historic Center, close to restaurants, colonial plazas, walls, boutiques and cultural sites.",
          nearbyAttractions:
            "Walled City\nSanto Domingo Square\nClock Tower\nGetsemani\nSan Felipe Castle\nBodeguita Pier\nLocal restaurants\nColonial terraces",
          guestRecommendations:
            "Ideal for travelers who want to stay near Cartagena's cultural life. Book early in high season and request premium services before arrival.",
          faq: [
            {
              question: "Is the villa close to the Historic Center?",
              answer:
                "Yes. The page is prepared for a strategic location in or near the Historic Center with practical access to restaurants, plazas and cultural routes.",
            },
            {
              question: "Can premium services be added?",
              answer:
                "Yes. An advisor can coordinate private transfer, decoration, photography, gastronomy experiences or other available services.",
            },
          ],
          area: "Historic Center",
          cancellationPolicy:
            "Reservation subject to manual advisor validation during the demo.",
        },
        fr: {
          title: "Villa demo dans le centre historique",
          description:
            "Hebergement demo pour valider le flux de reservation assistee sans inventaire reel.",
          seoTitle:
            "Villa premium dans le centre historique de Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Villa premium dans le centre historique de Cartagena avec emplacement strategique, services de luxe et assistance personnalisee.",
          seoContent: paragraphs(
            "Cette villa premium dans le centre historique de Cartagena est pensee pour les voyageurs qui souhaitent confort, intimite et proximite avec les places, restaurants et parcours culturels.",
            "Elle convient aux couples, familles et petits groupes qui veulent combiner repos, gastronomie, experiences privees et sorties vers les iles.",
            "La reservation reste assistee afin de valider disponibilite, conditions et services premium avant confirmation."
          ),
          locationDescription:
            "Situee dans le centre historique de Cartagena, proche des restaurants, places coloniales, murailles, boutiques et sites culturels.",
          nearbyAttractions:
            "Ville fortifiee\nPlace Santo Domingo\nTour de l'Horloge\nGetsemani\nChateau de San Felipe\nMuelle de la Bodeguita\nRestaurants locaux",
          guestRecommendations:
            "Ideale pour les voyageurs qui veulent rester pres de la vie culturelle de Cartagena. Il est recommande de reserver a l'avance en haute saison.",
          faq: [
            {
              question: "La villa est-elle proche du centre historique?",
              answer:
                "Oui. Elle est concue comme une base strategique proche des restaurants, places et parcours culturels.",
            },
          ],
          area: "Centre historique",
          address: "Adresse demo",
          cancellationPolicy:
            "Reservation soumise a la validation manuelle d'un conseiller pendant la demo.",
        },
        pt: {
          title: "Villa demo no Centro Historico",
          description:
            "Acomodacao demo para validar o fluxo de reserva assistida sem inventario real.",
          seoTitle:
            "Villa premium no Centro Historico de Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Villa premium no Centro Historico de Cartagena com localizacao estrategica, comodidades de luxo e assistencia personalizada.",
          seoContent: paragraphs(
            "Esta villa premium no Centro Historico de Cartagena foi pensada para viajantes que desejam conforto, privacidade e proximidade com pracas, restaurantes e rotas culturais.",
            "Funciona bem para casais, familias e pequenos grupos que querem combinar descanso, gastronomia, experiencias privativas e passeios para as ilhas.",
            "A reserva e assistida para validar disponibilidade, condicoes e servicos premium antes da confirmacao."
          ),
          locationDescription:
            "Localizada no Centro Historico de Cartagena, perto de restaurantes, pracas coloniais, muralhas, boutiques e pontos culturais.",
          nearbyAttractions:
            "Cidade Murada\nPraca Santo Domingo\nTorre do Relogio\nGetsemani\nCastelo de San Felipe\nMuelle de la Bodeguita\nRestaurantes locais",
          guestRecommendations:
            "Ideal para viajantes que querem ficar perto da vida cultural de Cartagena. Recomendamos reservar com antecedencia em alta temporada.",
          faq: [
            {
              question: "A villa fica perto do Centro Historico?",
              answer:
                "Sim. Foi preparada como uma base estrategica perto de restaurantes, pracas e percursos culturais.",
            },
          ],
          area: "Centro Historico",
          address: "Endereco demo",
          cancellationPolicy:
            "Reserva sujeita a validacao manual por assessor durante a demo.",
        },
        it: {
          title: "Villa demo nel Centro Storico",
          description:
            "Alloggio demo per validare il flusso di prenotazione assistita senza inventario reale.",
          seoTitle:
            "Villa premium nel Centro Storico di Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Villa premium nel Centro Storico di Cartagena con posizione strategica, servizi di lusso e assistenza personalizzata.",
          seoContent: paragraphs(
            "Questa villa premium nel Centro Storico di Cartagena e pensata per viaggiatori che desiderano comfort, privacy e vicinanza a piazze, ristoranti e percorsi culturali.",
            "E adatta a coppie, famiglie e piccoli gruppi che vogliono combinare relax, gastronomia, esperienze private e uscite verso le isole.",
            "La prenotazione rimane assistita per validare disponibilita, condizioni e servizi premium prima della conferma."
          ),
          locationDescription:
            "Situata nel Centro Storico di Cartagena, vicino a ristoranti, piazze coloniali, mura, boutique e siti culturali.",
          nearbyAttractions:
            "Citta murata\nPiazza Santo Domingo\nTorre dell'Orologio\nGetsemani\nCastello di San Felipe\nMuelle de la Bodeguita\nRistoranti locali",
          guestRecommendations:
            "Ideale per viaggiatori che vogliono soggiornare vicino alla vita culturale di Cartagena. Si consiglia di prenotare in anticipo in alta stagione.",
          faq: [
            {
              question: "La villa e vicina al Centro Storico?",
              answer:
                "Si. E preparata come base strategica vicina a ristoranti, piazze e percorsi culturali.",
            },
          ],
          area: "Centro Storico",
          address: "Indirizzo demo",
          cancellationPolicy:
            "Prenotazione soggetta a validazione manuale da parte di un consulente durante la demo.",
        },
      },
      city: "Cartagena",
      area: "Centro Historico",
      address: "Direccion demo",
      pricePerNight: 980000,
      priceCop: 980000,
      baseCurrency: "COP",
      cleaningFee: 120000,
      serviceFee: 90000,
      taxes: 0,
      basePrice: 980000,
      maxGuests: 6,
      maxCapacity: 6,
      bedrooms: 3,
      bathrooms: 3,
      minimumNights: 1,
      status: PropertyStatus.ACTIVE,
      cancellationPolicy:
        "Reserva sujeta a validacion manual por asesor durante la demo.",
      internalNotes: "Dato demo. No usar como inventario real.",
    },
  ];

  for (const property of demoProperties) {
    await prisma.property.upsert({
      where: { slug: property.slug },
      update: property,
      create: property,
    });
  }

  console.log("Alojamientos demo creados o actualizados.");

  const experiences = [
    {
      title: "Tour privado por Islas del Rosario",
      slug: "tour-privado-islas-del-rosario",
      shortDescription:
        "Dia privado en aguas turquesa con ruta curada por concierge.",
      description:
        "Experiencia privada hacia Islas del Rosario con coordinacion personalizada, paradas sugeridas y asistencia del equipo concierge.",
      seoTitle:
        "Tour privado a Islas del Rosario desde Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Tour privado a Islas del Rosario desde Cartagena con ruta curada, asistencia concierge y validacion de disponibilidad.",
      seoContent: paragraphs(
        "Sobre esta experiencia. Este tour privado a Islas del Rosario esta pensado para viajeros que quieren disfrutar el Caribe colombiano con una ruta organizada, asistencia local y una experiencia mas comoda que un pasadia masivo. La salida se plantea desde Cartagena y se valida manualmente antes de confirmar, porque clima, disponibilidad de embarcacion, horarios, punto de salida y preferencias del grupo influyen directamente en la calidad del plan.",
        "Que viviras. La experiencia combina navegacion, mar turquesa, descanso, posibles paradas sugeridas y tiempo para disfrutar el entorno natural de las Islas del Rosario. Puede adaptarse a parejas, familias, grupos de amigos, celebraciones privadas o viajeros internacionales que desean conocer una de las zonas nauticas mas reconocidas de Cartagena con acompanamiento profesional. El objetivo no es vender una ruta rigida, sino construir una salida clara, segura y alineada con el perfil del viajero.",
        "Itinerario sugerido. El dia inicia con coordinacion del punto de salida en Cartagena, normalmente en un muelle o zona definida por el proveedor. Despues se realiza la navegacion hacia Islas del Rosario, con paradas sugeridas segun clima, disponibilidad y preferencias. El grupo puede tener tiempo para mar, descanso, fotografia, almuerzo o experiencias adicionales si se validan previamente. El regreso se coordina con horario claro para evitar cruces de agenda con traslados, cenas o actividades posteriores.",
        "Duracion y horarios. Es una experiencia de dia completo. La duracion exacta depende del punto de salida, tiempos de navegacion, condiciones maritimas, paradas seleccionadas y horario del proveedor. Generalmente se recomienda salir en la manana para aprovechar mejor la luz, el clima y el tiempo en el agua. En temporada alta, la validacion anticipada es clave para acceder a mejores horarios y embarcaciones.",
        "Punto de encuentro. El punto de salida se define con el asesor segun proveedor, horario y tipo de embarcacion. Esta informacion no debe improvisarse el mismo dia, porque llegar tarde al muelle puede afectar la ruta y los tiempos de navegacion. El asesor puede orientar al viajero sobre transporte, documentos, horarios y recomendaciones para llegar preparado.",
        "Que incluye. La experiencia incluye coordinacion concierge, ruta sugerida hacia islas, validacion manual de disponibilidad, asistencia antes de la salida y recomendaciones para el dia. Si el cliente desea servicios adicionales como fotografia, decoracion, almuerzo especifico o upgrade de embarcacion, estos se revisan antes de confirmar para evitar expectativas no incluidas.",
        "Que no incluye. No se incluyen gastos personales, propinas, consumos no confirmados, upgrades de embarcacion no incluidos ni servicios que no hayan sido validados por asesor. Esta distincion ayuda a que el viajero entienda que la experiencia puede personalizarse, pero cada componente debe quedar confirmado antes de la reserva.",
        "Recomendaciones. Llevar documento, protector solar, ropa ligera, traje de bano, cambio adicional, hidratacion y una actitud flexible frente a condiciones climaticas. Para grupos con ninos, adultos mayores o necesidades especiales, conviene informar antes de confirmar. Si el viaje forma parte de un paquete de varios dias, se recomienda dejar la salida a islas en un dia con margen operativo.",
        "Condiciones. La salida esta sujeta a clima, condiciones maritimas, disponibilidad de embarcacion y validacion final del asesor. Si el clima cambia o el proveedor no esta disponible, el asesor puede sugerir ajustes de horario, ruta o fecha. La seguridad y claridad del plan tienen prioridad sobre forzar una salida en condiciones no convenientes.",
        "Preguntas frecuentes. El tour puede ser privado o asistido segun disponibilidad. La ruta puede personalizarse si el proveedor y el clima lo permiten. Si hay mal clima, se revisan alternativas. La experiencia es recomendable para viajeros que buscan un plan de mar con mayor control que una excursion general, especialmente si desean celebrar, descansar o conocer las islas con una agenda curada."
      ),
      itinerary:
        "Salida coordinada desde Cartagena\nNavegacion hacia Islas del Rosario\nParadas sugeridas segun clima y disponibilidad\nTiempo de descanso y mar\nRegreso asistido a Cartagena",
      included:
        "Coordinacion concierge\nRuta sugerida hacia islas\nValidacion manual de disponibilidad\nAsistencia antes de la salida\nRecomendaciones para el dia",
      notIncluded:
        "Gastos personales\nPropinas\nConsumos no confirmados\nUpgrades de embarcacion no incluidos\nServicios no validados por asesor",
      meetingPoint:
        "Punto de salida en Cartagena definido por el asesor segun proveedor, horario y tipo de embarcacion.",
      durationDescription:
        "Experiencia de dia completo. La duracion exacta depende del punto de salida, clima, ruta y tiempos de navegacion.",
      schedule:
        "Horario sugerido en la manana, sujeto a disponibilidad del proveedor y condiciones maritimas.",
      conditions:
        "La experiencia esta sujeta a clima, condiciones maritimas, disponibilidad de embarcacion y validacion final del asesor.",
      faq: initialExperienceFaq,
      experienceCategory: "Tour nautico privado",
      translations: {
        en: {
          title: "Private Rosario Islands tour",
          shortDescription:
            "A private day in turquoise waters with a curated route.",
          description:
            "Private experience to the Rosario Islands with personalized coordination, suggested stops and team assistance.",
          location: "Rosario Islands, Cartagena",
          duration: "Full day",
          category: "Sea and yachts",
          policies:
            "Subject to weather conditions and final advisor validation.",
          recommendations:
            "Bring ID, sunscreen, light clothing and an extra change of clothes.",
          seoTitle:
            "Private Rosario Islands tour from Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Private Rosario Islands tour from Cartagena with curated route, concierge assistance and availability validation.",
          seoContent: paragraphs(
            "This private Rosario Islands tour is designed for travelers who want to enjoy the Colombian Caribbean with a curated route, local support and a more comfortable alternative to a massive day trip.",
            "The experience can adjust stops, timing and services according to the group profile. Before confirmation, the advisor validates weather, boat availability, departure point and conditions.",
            "It is ideal for couples, families, celebrations and private groups looking for turquoise water, rest, photography and a premium nautical day."
          ),
          itinerary:
            "Coordinated departure from Cartagena\nNavigation to Rosario Islands\nSuggested stops according to weather and availability\nTime for sea and rest\nAssisted return to Cartagena",
          included:
            "Concierge coordination\nSuggested island route\nManual availability validation\nPre-departure assistance\nDay recommendations",
          notIncluded:
            "Personal expenses\nTips\nUnconfirmed consumption\nBoat upgrades not included\nServices not validated by an advisor",
          meetingPoint:
            "Departure point in Cartagena defined by the advisor according to provider, schedule and boat type.",
          durationDescription:
            "Full-day experience. Exact duration depends on departure point, weather, route and navigation times.",
          schedule:
            "Suggested morning departure, subject to provider availability and sea conditions.",
          conditions:
            "Subject to weather, maritime conditions, boat availability and final advisor validation.",
          faq: [
            {
              question: "Is the Rosario Islands tour private?",
              answer:
                "The experience is prepared as a private or assisted plan, subject to availability and advisor validation before confirmation.",
            },
            {
              question: "What happens if weather is not suitable?",
              answer:
                "The advisor reviews maritime conditions and may suggest timing, route or date adjustments according to availability.",
            },
          ],
          experienceCategory: "Private nautical tour",
        },
        fr: {
          title: "Tour prive aux iles du Rosaire",
          shortDescription:
            "Une journee privee dans des eaux turquoise avec un itineraire soigne.",
          description:
            "Experience privee vers les iles du Rosaire avec coordination personnalisee, arrets suggeres et assistance de l'equipe.",
          location: "Iles du Rosaire, Cartagena",
          duration: "Journee complete",
          category: "Mer et yachts",
          policies:
            "Sous reserve des conditions meteo et de la validation finale du conseiller.",
          recommendations:
            "Apportez une piece d'identite, de la creme solaire, des vetements legers et une tenue de rechange.",
        },
        pt: {
          title: "Tour privativo pelas Ilhas do Rosario",
          shortDescription:
            "Um dia privativo em aguas turquesa com rota selecionada.",
          description:
            "Experiencia privativa para as Ilhas do Rosario com coordenacao personalizada, paradas sugeridas e assistencia da equipe.",
          location: "Ilhas do Rosario, Cartagena",
          duration: "Dia completo",
          category: "Mar e iates",
          policies:
            "Sujeito a condicoes climaticas e validacao final do assessor.",
          recommendations:
            "Leve documento, protetor solar, roupas leves e uma muda extra.",
        },
        it: {
          title: "Tour privato alle Isole del Rosario",
          shortDescription:
            "Una giornata privata in acque turchesi con itinerario curato.",
          description:
            "Esperienza privata verso le Isole del Rosario con coordinamento personalizzato, soste suggerite e assistenza del team.",
          location: "Isole del Rosario, Cartagena",
          duration: "Giornata intera",
          category: "Mare e yacht",
          policies:
            "Soggetto alle condizioni meteo e alla validazione finale del consulente.",
          recommendations:
            "Porta documento, crema solare, abiti leggeri e un cambio extra.",
        },
      },
      location: "Islas del Rosario, Cartagena",
      duration: "Dia completo",
      maxGuests: 10,
      basePrice: 1800000,
      priceCop: 1800000,
      baseCurrency: "COP",
      category: "Mar y yates",
      mainImage:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=1600",
      policies:
        "Sujeto a condiciones climaticas y validacion final del asesor.",
      recommendations:
        "Llevar documento, protector solar, ropa ligera y cambio adicional.",
    },
    {
      title: "Cena romantica en Cartagena",
      slug: "cena-romantica-cartagena",
      shortDescription:
        "Cena privada con ambientacion especial para celebraciones.",
      description:
        "Cena romantica coordinada por concierge con montaje privado, menu personalizado y detalles premium.",
      seoTitle:
        "Cena romantica privada en Cartagena | Cartagena Tailored Travel",
      seoDescription:
        "Cena romantica privada en Cartagena con montaje especial, menu personalizado y coordinacion concierge.",
      seoContent: paragraphs(
        "Sobre esta experiencia. La cena romantica en Cartagena esta disenada para parejas que quieren celebrar una ocasion especial con un montaje cuidado, atencion personalizada y una experiencia intima dentro de la ciudad. Es una alternativa premium para aniversarios, propuestas, lunas de miel, cumpleanos de pareja o viajes donde la gastronomia y los detalles hacen parte central del recuerdo.",
        "Que viviras. La experiencia busca crear un momento privado y memorable, con una ambientacion que puede adaptarse al tipo de celebracion. El asesor revisa preferencias, alergias, restricciones alimentarias, horario, estilo de montaje y disponibilidad de proveedor antes de confirmar. Esto permite pasar de una idea romantica general a una cena concreta, con expectativas claras y menor improvisacion.",
        "Itinerario sugerido. El proceso inicia con validacion de preferencias: ocasion especial, tipo de comida, nivel de privacidad, detalles decorativos y horario deseado. Luego se confirma proveedor, ubicacion y menu. El dia de la experiencia se realiza el montaje privado, se desarrolla la cena y se cierra el servicio con acompanamiento operativo segun lo acordado. Si la cena forma parte de un paquete romantico, puede coordinarse con transporte, fotografia o decoracion especial.",
        "Duracion y horarios. La duracion estimada es de 3 a 4 horas, aunque puede variar segun montaje, ubicacion, menu y ritmo de la pareja. El horario nocturno suele ser el mas recomendado por ambiente, clima y sensacion de privacidad, pero siempre depende de disponibilidad del proveedor. En fechas de alta demanda, como fines de semana, aniversarios, San Valentin o temporada vacacional, conviene solicitar con anticipacion.",
        "Punto de encuentro. La ubicacion se confirma con el asesor segun disponibilidad, tipo de montaje y preferencias del cliente. Puede tratarse de una locacion privada, un espacio seleccionado o un punto coordinado con proveedor. No se debe asumir una ubicacion hasta recibir confirmacion, porque el menu, horario y decoracion dependen del lugar final.",
        "Que incluye. La experiencia incluye coordinacion concierge, montaje romantico sugerido, validacion de menu y asistencia previa. Tambien puede incluir ajustes segun la ocasion, como mensajes personalizados, decoracion tematica o recomendaciones para complementar la noche. Cualquier detalle adicional debe quedar confirmado por el asesor.",
        "Que no incluye. No incluye consumos adicionales, transporte no confirmado, propinas ni servicios no descritos en la confirmacion. Si la pareja desea fotografia, musica, transporte privado, decoracion extra o una locacion especifica, esos componentes deben validarse como servicios adicionales.",
        "Recomendaciones. Informar alergias, restricciones alimentarias, ocasion especial, estilo deseado y nivel de privacidad esperado. Si se trata de una propuesta o sorpresa, conviene compartir detalles con el asesor para coordinar tiempos y evitar que la experiencia revele la sorpresa antes del momento correcto.",
        "Condiciones. La ubicacion, menu y montaje final se confirman despues de validar disponibilidad y restricciones alimentarias. El proveedor puede cambiar segun fecha, horario y condiciones operativas. El asesor ayuda a mantener una propuesta realista y premium sin prometer elementos no confirmados.",
        "Preguntas frecuentes. La cena se puede personalizar segun disponibilidad. Es importante informar alergias antes de confirmar. Puede integrarse a una escapada romantica o paquete de varios dias. La reserva no se cierra automaticamente: primero se valida proveedor, horario, menu y condiciones para que la experiencia sea coherente con la ocasion."
      ),
      itinerary:
        "Validacion de preferencias\nConfirmacion de proveedor y horario\nMontaje privado\nCena personalizada\nCierre asistido de la experiencia",
      included:
        "Coordinacion concierge\nMontaje romantico sugerido\nValidacion de menu\nAsistencia antes de la experiencia",
      notIncluded:
        "Consumos adicionales\nTransporte no confirmado\nPropinas\nServicios no descritos en la confirmacion",
      meetingPoint:
        "La ubicacion se confirma con el asesor segun disponibilidad, tipo de montaje y preferencias del cliente.",
      durationDescription:
        "Duracion estimada de 3 a 4 horas, segun montaje, menu y ubicacion final.",
      schedule:
        "Horario nocturno recomendado, sujeto a disponibilidad del proveedor.",
      conditions:
        "La ubicacion, menu y montaje final se confirman despues de validar disponibilidad y restricciones alimentarias.",
      faq: [
        {
          question: "La cena romantica se puede personalizar?",
          answer:
            "Si. El asesor puede ajustar decoracion, horario, menu y detalles segun disponibilidad del proveedor.",
        },
        {
          question: "Debo informar alergias o restricciones?",
          answer:
            "Si. Es importante informar alergias, restricciones alimentarias y preferencias antes de confirmar la experiencia.",
        },
      ],
      experienceCategory: "Gastronomia romantica",
      translations: {
        en: {
          title: "Romantic dinner in Cartagena",
          shortDescription:
            "Private dinner with special styling for celebrations.",
          description:
            "Romantic dinner coordinated by the assistance team with a private setup, tailored menu and premium details.",
          location: "Historic Cartagena",
          duration: "3 to 4 hours",
          category: "Dining",
          policies:
            "The final location and menu are confirmed after availability is validated.",
          recommendations:
            "Share allergies, dietary restrictions and the special occasion.",
          seoTitle:
            "Private romantic dinner in Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Private romantic dinner in Cartagena with special styling, tailored menu and concierge coordination.",
          seoContent: paragraphs(
            "The romantic dinner in Cartagena is designed for couples who want to celebrate a special occasion with curated styling, personalized attention and an intimate setting.",
            "The advisor validates availability, setup style, food preferences, allergies, timing and location before confirmation.",
            "It is recommended for anniversaries, proposals, honeymoons, birthdays and trips where gastronomy and details matter."
          ),
          itinerary:
            "Preference validation\nProvider and schedule confirmation\nPrivate setup\nTailored dinner\nAssisted closing",
          included:
            "Concierge coordination\nSuggested romantic setup\nMenu validation\nPre-experience assistance",
          notIncluded:
            "Additional consumption\nUnconfirmed transportation\nTips\nServices not described in the confirmation",
          meetingPoint:
            "The location is confirmed by the advisor according to availability, setup type and customer preferences.",
          durationDescription:
            "Estimated duration of 3 to 4 hours, depending on setup, menu and final location.",
          schedule:
            "Recommended evening schedule, subject to provider availability.",
          conditions:
            "Final location, menu and setup are confirmed after availability and dietary restrictions are validated.",
          faq: [
            {
              question: "Can the romantic dinner be customized?",
              answer:
                "Yes. Decoration, timing, menu and details can be adjusted according to provider availability.",
            },
          ],
          experienceCategory: "Romantic gastronomy",
        },
        fr: {
          title: "Diner romantique a Cartagena",
          shortDescription:
            "Diner prive avec ambiance speciale pour les celebrations.",
          description:
            "Diner romantique coordonne par l'equipe d'assistance avec montage prive, menu personnalise et details premium.",
          location: "Cartagena historique",
          duration: "3 a 4 heures",
          category: "Gastronomie",
          policies:
            "Le lieu final et le menu sont confirmes apres validation de disponibilite.",
          recommendations:
            "Indiquez allergies, restrictions alimentaires et occasion speciale.",
        },
        pt: {
          title: "Jantar romantico em Cartagena",
          shortDescription:
            "Jantar privativo com ambientacao especial para celebracoes.",
          description:
            "Jantar romantico coordenado pela equipe de atendimento com montagem privativa, menu personalizado e detalhes premium.",
          location: "Cartagena historica",
          duration: "3 a 4 horas",
          category: "Gastronomia",
          policies:
            "O local final e o menu sao confirmados depois de validar disponibilidade.",
          recommendations:
            "Informe alergias, restricoes alimentares e a ocasiao especial.",
        },
        it: {
          title: "Cena romantica a Cartagena",
          shortDescription:
            "Cena privata con allestimento speciale per celebrazioni.",
          description:
            "Cena romantica coordinata dal team di assistenza con allestimento privato, menu personalizzato e dettagli premium.",
          location: "Cartagena storica",
          duration: "3-4 ore",
          category: "Gastronomia",
          policies:
            "La location finale e il menu vengono confermati dopo la validazione della disponibilita.",
          recommendations:
            "Comunica allergie, restrizioni alimentari e occasione speciale.",
        },
      },
      location: "Cartagena historica",
      duration: "3 a 4 horas",
      maxGuests: 2,
      basePrice: 950000,
      priceCop: 950000,
      baseCurrency: "COP",
      category: "Dining",
      mainImage:
        "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600",
      policies:
        "La ubicacion final y menu se confirman despues de validar disponibilidad.",
      recommendations:
        "Informar alergias, restricciones alimentarias y ocasion especial.",
    },
    {
      title: "City tour historico premium",
      slug: "city-tour-historico-premium",
      shortDescription:
        "Recorrido privado por la ciudad amurallada con guia experto.",
      description:
        "Tour historico privado por Cartagena con guia especializado, ritmo flexible y paradas seleccionadas.",
      seoTitle:
        "City tour privado por Cartagena historica | Cartagena Tailored Travel",
      seoDescription:
        "City tour privado por Cartagena con guia experto, ciudad amurallada, historia, plazas y ritmo flexible.",
      seoContent: paragraphs(
        "Sobre esta experiencia. El city tour historico premium permite conocer Cartagena desde una mirada cultural, privada y flexible. La ruta se concentra en la ciudad amurallada, plazas, arquitectura colonial, historias locales y puntos relevantes para entender la identidad del destino. Es una experiencia recomendada para viajeros que visitan Cartagena por primera vez y quieren una introduccion clara antes de profundizar en gastronomia, islas o paquetes de varios dias.",
        "Que viviras. A diferencia de un recorrido generico, este tour se coordina con guia especializado y puede adaptarse al ritmo del grupo, intereses fotograficos, horarios y condiciones de movilidad. El objetivo es que el viajero entienda por que Cartagena es uno de los destinos historicos mas importantes del Caribe colombiano, mientras descubre lugares, relatos y recomendaciones utiles para el resto del viaje.",
        "Itinerario sugerido. La experiencia inicia con encuentro con el guia en el Centro Historico. Luego se realiza un recorrido por la ciudad amurallada, con paradas en plazas, calles coloniales, puntos historicos y zonas de interes cultural. Segun el tiempo disponible, el guia puede integrar recomendaciones de restaurantes, terrazas, iglesias, murallas, Getsemani o zonas para fotografia. El cierre es flexible y puede conectarse con una cena, traslado o actividad posterior.",
        "Duracion y horarios. La duracion aproximada es de 4 horas. Puede realizarse en la manana o en la tarde, segun disponibilidad del guia y preferencia del viajero. En Cartagena, el clima y la luz influyen en la experiencia: la manana puede ser mas fresca para caminar, mientras que la tarde permite conectar con atardeceres y planes nocturnos. El asesor ayuda a elegir el mejor horario segun agenda y temporada.",
        "Punto de encuentro. El punto de encuentro se define en el Centro Historico segun ruta, horario y comodidad del grupo. Para viajeros alojados en la zona, puede ser posible iniciar cerca del alojamiento si se valida previamente. Para grupos con movilidad reducida, adultos mayores o ninos, conviene informar antes para ajustar distancias y pausas.",
        "Que incluye. Incluye guia especializado, ruta historica sugerida, coordinacion del asesor y recomendaciones locales. El valor diferencial esta en la lectura cultural, el ritmo privado y la capacidad de ajustar el recorrido a intereses reales: historia, arquitectura, fotografia, gastronomia, vida local o contexto general de Cartagena.",
        "Que no incluye. No incluye entradas no confirmadas, consumos personales, propinas ni transporte si no fue incluido por el asesor. Si el cliente desea integrar transporte privado, ingreso a espacios especificos o una experiencia gastronomica posterior, esos elementos deben validarse como componentes adicionales.",
        "Recomendaciones. Usar zapatos comodos, ropa fresca, hidratacion y proteccion solar. Si el grupo quiere fotografias, momentos de descanso o una ruta con menos caminata, debe informarlo antes de confirmar. Para viajeros internacionales, este tour funciona muy bien al inicio del viaje porque entrega contexto para entender mejor restaurantes, barrios, murallas y otros planes.",
        "Condiciones. La ruta puede ajustarse por clima, movilidad, eventos locales o disponibilidad del guia. El asesor confirma hora de inicio y recomendaciones antes de la experiencia. En temporadas de alta ocupacion, es mejor reservar con anticipacion para asegurar guia y horario.",
        "Preguntas frecuentes. El city tour es privado y se valida antes de confirmar. Puede adaptarse a familias, adultos mayores o grupos con intereses especificos. Es recomendable hacerlo el primer o segundo dia del viaje. Si el cliente quiere combinarlo con cena romantica, Getsemani o fotografia, el asesor puede proponer una secuencia mas completa."
      ),
      itinerary:
        "Encuentro con guia\nRecorrido por ciudad amurallada\nParadas en plazas y puntos historicos\nContexto cultural y recomendaciones locales\nCierre flexible segun ruta",
      included:
        "Guia especializado\nRuta historica sugerida\nCoordinacion del asesor\nRecomendaciones locales",
      notIncluded:
        "Entradas no confirmadas\nConsumos personales\nPropinas\nTransporte si no fue incluido por el asesor",
      meetingPoint:
        "Punto de encuentro en el Centro Historico definido segun ruta, horario y comodidad del grupo.",
      durationDescription:
        "Duracion aproximada de 4 horas con ritmo flexible segun el grupo.",
      schedule:
        "Horarios de manana o tarde sujetos a disponibilidad del guia.",
      conditions:
        "La ruta puede ajustarse por clima, movilidad, eventos locales o disponibilidad del guia.",
      faq: [
        {
          question: "El city tour es privado?",
          answer:
            "Si. La experiencia esta preparada como recorrido privado con guia y validacion previa del asesor.",
        },
        {
          question: "Se puede adaptar a familias?",
          answer:
            "Si. El ritmo y las paradas pueden ajustarse para familias, adultos mayores o grupos con intereses especificos.",
        },
      ],
      experienceCategory: "Tour cultural privado",
      translations: {
        en: {
          title: "Premium historic city tour",
          shortDescription:
            "Private walk through the walled city with an expert guide.",
          description:
            "Private historic tour of Cartagena with a specialized guide, flexible pace and selected stops.",
          location: "Historic Center, Cartagena",
          duration: "4 hours",
          category: "Culture",
          policies:
            "Start time is coordinated according to guide availability.",
          recommendations:
            "Wear comfortable shoes, light clothing and bring hydration.",
          seoTitle:
            "Private historic city tour in Cartagena | Cartagena Tailored Travel",
          seoDescription:
            "Private Cartagena city tour with expert guide, walled city, history, plazas and flexible pace.",
          seoContent: paragraphs(
            "The premium historic city tour introduces Cartagena through a private, cultural and flexible route across the walled city, colonial architecture, plazas and local stories.",
            "The experience is coordinated with a specialized guide and can adapt to the group's pace, photography interests, schedule and mobility conditions.",
            "It is ideal for first-time visitors, families, couples and private groups looking for a clear introduction before adding gastronomy, islands or multi-day packages."
          ),
          itinerary:
            "Meet the guide\nWalled city route\nStops at plazas and historic points\nCultural context and local recommendations\nFlexible closing",
          included:
            "Specialized guide\nSuggested historic route\nAdvisor coordination\nLocal recommendations",
          notIncluded:
            "Unconfirmed entrance fees\nPersonal consumption\nTips\nTransportation if not included by the advisor",
          meetingPoint:
            "Meeting point in the Historic Center defined according to route, schedule and group comfort.",
          durationDescription:
            "Approximate duration of 4 hours with flexible pace.",
          schedule:
            "Morning or afternoon schedules subject to guide availability.",
          conditions:
            "The route may be adjusted due to weather, mobility, local events or guide availability.",
          faq: [
            {
              question: "Is the city tour private?",
              answer:
                "Yes. The experience is prepared as a private guided tour with prior advisor validation.",
            },
          ],
          experienceCategory: "Private cultural tour",
        },
        fr: {
          title: "Visite historique premium de la ville",
          shortDescription:
            "Parcours prive dans la ville fortifiee avec un guide expert.",
          description:
            "Tour historique prive de Cartagena avec guide specialise, rythme flexible et arrets selectionnes.",
          location: "Centre historique, Cartagena",
          duration: "4 heures",
          category: "Culture",
          policies:
            "L'heure de depart est coordonnee selon la disponibilite du guide.",
          recommendations:
            "Portez des chaussures confortables, des vetements legers et apportez de l'eau.",
        },
        pt: {
          title: "City tour historico premium",
          shortDescription:
            "Passeio privativo pela cidade murada com guia especialista.",
          description:
            "Tour historico privativo por Cartagena com guia especializado, ritmo flexivel e paradas selecionadas.",
          location: "Centro historico, Cartagena",
          duration: "4 horas",
          category: "Cultura",
          policies:
            "O horario de inicio e coordenado conforme disponibilidade do guia.",
          recommendations:
            "Use calcados confortaveis, roupas leves e leve hidratacao.",
        },
        it: {
          title: "City tour storico premium",
          shortDescription:
            "Percorso privato nella citta murata con guida esperta.",
          description:
            "Tour storico privato di Cartagena con guida specializzata, ritmo flessibile e soste selezionate.",
          location: "Centro storico, Cartagena",
          duration: "4 ore",
          category: "Cultura",
          policies:
            "L'orario di inizio viene coordinato in base alla disponibilita della guida.",
          recommendations:
            "Indossa scarpe comode, abiti leggeri e porta acqua.",
        },
      },
      location: "Centro historico, Cartagena",
      duration: "4 horas",
      maxGuests: 8,
      basePrice: 650000,
      priceCop: 650000,
      baseCurrency: "COP",
      category: "Cultura",
      mainImage:
        "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=1600",
      policies:
        "La hora de inicio se coordina segun disponibilidad del guia.",
      recommendations:
        "Usar zapatos comodos, ropa fresca y llevar hidratacion.",
    },
  ];

  for (const experience of experiences) {
    await prisma.experience.upsert({
      where: { slug: experience.slug },
      update: {
        ...experience,
        active: true,
      },
      create: {
        ...experience,
        active: true,
      },
    });
  }

  console.log("Experiencias base creadas o actualizadas.");

  const packages = [
    {
      title: "Escapada romantica en Cartagena",
      slug: "escapada-romantica-cartagena",
      shortDescription:
        "Plan curado para pareja con estancia, cena y detalles especiales.",
      description:
        "Paquete romantico concierge para celebrar en Cartagena con coordinacion integral del equipo asesor.",
      seoTitle:
        "Paquete romantico en Cartagena para parejas | Cartagena Tailored Travel",
      seoDescription:
        "Paquete romantico en Cartagena con estancia, cena privada, decoracion especial y asistencia concierge.",
      seoContent: paragraphs(
        "Sobre este paquete. La escapada romantica en Cartagena esta pensada para parejas que desean celebrar una ocasion especial con una experiencia cuidada de principio a fin. El paquete puede integrar alojamiento, cena privada, decoracion, detalles personalizados y asistencia durante la estadia. No se plantea como un paquete rigido, sino como una base curada que el asesor ajusta segun fecha, presupuesto, disponibilidad y estilo de celebracion.",
        "Para quien es ideal. Este paquete funciona especialmente bien para aniversarios, propuestas, lunas de miel, cumpleanos de pareja, viajes sorpresa o escapadas de fin de semana. Cartagena es un destino ideal para viajes romanticos por su Centro Historico, terrazas, atardeceres, gastronomia y posibilidad de conectar con experiencias privadas o salidas a islas. Tambien es una buena opcion para viajeros internacionales que quieren celebrar sin improvisar proveedores ni detalles operativos.",
        "Itinerario sugerido. Dia 1: llegada, bienvenida y acomodacion asistida. El asesor puede coordinar transporte privado, recomendaciones para la primera noche y detalles de bienvenida si se validan previamente. Dia 2: experiencia romantica principal, que puede ser una cena privada, decoracion especial, plan fotografico o actividad seleccionada segun la pareja. Dia 3: cierre flexible, desayuno, recomendaciones finales o salida coordinada. El itinerario puede compactarse o ampliarse si la pareja desea agregar islas, city tour o experiencias gastronomicas.",
        "Alojamientos o zonas recomendadas. Para este tipo de viaje suelen funcionar bien alojamientos en el Centro Historico por cercania a restaurantes, plazas coloniales, terrazas y recorridos nocturnos. Tambien puede evaluarse Bocagrande si la pareja prefiere una base moderna frente al mar. La seleccion del alojamiento depende de disponibilidad, nivel de privacidad, presupuesto, capacidad y servicios deseados.",
        "Experiencias incluidas o recomendadas. La cena romantica privada es el componente natural de este paquete, pero tambien pueden recomendarse fotografia profesional, recorrido nocturno por Cartagena, salida privada a Islas del Rosario, decoracion especial o experiencia gastronomica local. Cada componente se valida antes de confirmar para que el viajero sepa que esta incluido y que queda como opcional.",
        "Que incluye. El paquete incluye coordinacion concierge, decoracion especial sugerida, cena privada sugerida y asistencia durante la estadia. Tambien incluye validacion de proveedores, organizacion de horarios y acompanamiento operativo para que la celebracion tenga coherencia con la fecha, la ocasion y las expectativas de la pareja.",
        "Que no incluye. No incluye tiquetes aereos, gastos no especificados, propinas voluntarias, consumos adicionales ni servicios que no hayan sido confirmados por el asesor. Si la pareja desea fotografia, transporte, upgrade de alojamiento, experiencias en islas o decoracion premium, esos elementos deben cotizarse y validarse por separado.",
        "Politicas y condiciones. El paquete esta sujeto a validacion de disponibilidad y ajustes del asesor. La ubicacion final de alojamiento, cena o decoracion depende de fecha, proveedor, clima, capacidad y condiciones operativas. La solicitud no equivale a reserva confirmada hasta que el equipo valide opciones y entregue condiciones claras.",
        "Recomendaciones. Informar ocasion especial, alergias, restricciones alimentarias, preferencias de horario, nivel de sorpresa deseado y tipo de ambiente. En fechas de alta demanda, conviene reservar con anticipacion. Si la experiencia involucra propuesta o aniversario, el asesor puede ayudar a ordenar la secuencia para que los detalles no se crucen con traslados, check-in o cansancio del viaje.",
        "Diferencial del paquete. La fortaleza de este plan esta en unir alojamiento, experiencia romantica, detalles y coordinacion en una sola conversacion. Muchas parejas saben que quieren celebrar en Cartagena, pero no saben si conviene priorizar Centro Historico, Bocagrande, islas, cena privada o fotografia. El asesor ayuda a ordenar esas decisiones y evita que la celebracion dependa de proveedores inconexos o reservas improvisadas.",
        "Como se confirma. Primero se recibe la solicitud, luego se revisan fechas, disponibilidad, tipo de alojamiento, proveedor de cena, decoracion y servicios adicionales. Despues se ajusta la propuesta segun presupuesto y preferencias. Solo cuando el viajero entiende que incluye, que no incluye, condiciones y costos, se avanza a la confirmacion. Este flujo asistido es especialmente importante para experiencias romanticas, donde los detalles y tiempos son parte del valor.",
        "Preguntas frecuentes. El paquete puede incluir alojamiento si se confirma disponibilidad. La decoracion puede personalizarse segun proveedor. Es adecuado para luna de miel y aniversarios. Tambien puede combinarse con salida a islas o city tour si la pareja desea una experiencia mas completa. Todo se valida manualmente antes de confirmar."
      ),
      faq: initialPackageFaq,
      translations: {
        en: {
          title: "Romantic Cartagena escape",
          shortDescription:
            "A curated plan for couples with stay, dinner and special details.",
          description:
            "Romantic assisted package to celebrate in Cartagena with full advisor coordination.",
          duration: "3 days / 2 nights",
          location: "Cartagena, Colombia",
          category: "Romance",
          includes:
            "Personalized coordination\nSpecial decoration\nSuggested private dinner\nAssistance during the stay",
          notIncludes:
            "Air tickets\nUnspecified expenses\nVoluntary tips",
          itinerary:
            "Day 1: arrival and welcome\nDay 2: romantic experience\nDay 3: closing and departure",
          policies:
            "Subject to availability validation and advisor adjustments.",
          recommendations:
            "Share the special occasion, allergies and preferred timing.",
          seoTitle:
            "Romantic Cartagena package for couples | Cartagena Tailored Travel",
          seoDescription:
            "Romantic Cartagena package with stay, private dinner, special decoration and concierge assistance.",
          seoContent: paragraphs(
            "The romantic Cartagena escape is designed for couples who want to celebrate a special occasion with a curated experience from start to finish.",
            "The package can integrate accommodation, private dinner, decoration, personalized details and assistance during the stay.",
            "An advisor validates availability, preferences, dates, providers and services before confirmation, adapting the package to anniversaries, proposals, honeymoons or surprise trips."
          ),
          faq: [
            {
              question: "Does the romantic package include accommodation?",
              answer:
                "It can include accommodation if availability and conditions are confirmed by the advisor.",
            },
            {
              question: "Can the decoration be personalized?",
              answer:
                "Yes. Decoration and special details are coordinated according to provider availability and couple preferences.",
            },
          ],
        },
        fr: {
          title: "Escapade romantique a Cartagena",
          shortDescription:
            "Un plan soigne pour couples avec sejour, diner et details speciaux.",
          description:
            "Forfait romantique assiste pour celebrer a Cartagena avec coordination integrale de l'equipe.",
          duration: "3 jours / 2 nuits",
          location: "Cartagena, Colombie",
          category: "Romance",
          includes:
            "Coordination personnalisee\nDecoration speciale\nDiner prive suggere\nAssistance pendant le sejour",
          notIncludes:
            "Billets d'avion\nDepenses non specifiees\nPourboires volontaires",
          itinerary:
            "Jour 1 : arrivee et bienvenue\nJour 2 : experience romantique\nJour 3 : cloture et depart",
          policies:
            "Sous reserve de validation de disponibilite et d'ajustements du conseiller.",
          recommendations:
            "Indiquez l'occasion speciale, les allergies et les preferences horaires.",
        },
        pt: {
          title: "Escapada romantica em Cartagena",
          shortDescription:
            "Um plano selecionado para casais com estadia, jantar e detalhes especiais.",
          description:
            "Pacote romantico assistido para celebrar em Cartagena com coordenacao integral da equipe.",
          duration: "3 dias / 2 noites",
          location: "Cartagena, Colombia",
          category: "Romance",
          includes:
            "Coordenacao personalizada\nDecoracao especial\nJantar privativo sugerido\nAssistencia durante a estadia",
          notIncludes:
            "Passagens aereas\nGastos nao especificados\nGorjetas voluntarias",
          itinerary:
            "Dia 1: chegada e boas-vindas\nDia 2: experiencia romantica\nDia 3: encerramento e saida",
          policies:
            "Sujeito a validacao de disponibilidade e ajustes do assessor.",
          recommendations:
            "Informe a ocasiao especial, alergias e preferencias de horario.",
        },
        it: {
          title: "Fuga romantica a Cartagena",
          shortDescription:
            "Un piano curato per coppie con soggiorno, cena e dettagli speciali.",
          description:
            "Pacchetto romantico assistito per celebrare a Cartagena con coordinamento completo del team.",
          duration: "3 giorni / 2 notti",
          location: "Cartagena, Colombia",
          category: "Romance",
          includes:
            "Coordinamento personalizzato\nDecorazione speciale\nCena privata suggerita\nAssistenza durante il soggiorno",
          notIncludes:
            "Biglietti aerei\nSpese non specificate\nMance volontarie",
          itinerary:
            "Giorno 1: arrivo e benvenuto\nGiorno 2: esperienza romantica\nGiorno 3: chiusura e partenza",
          policies:
            "Soggetto a validazione della disponibilita e adattamenti del consulente.",
          recommendations:
            "Comunica l'occasione speciale, allergie e preferenze di orario.",
        },
      },
      duration: "3 dias / 2 noches",
      location: "Cartagena, Colombia",
      maxGuests: 2,
      basePrice: 3800000,
      priceCop: 3800000,
      baseCurrency: "COP",
      mainImage:
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1600",
      category: "Romance",
      includes:
        "Coordinacion concierge\nDecoracion especial\nCena privada sugerida\nAsistencia durante la estadia",
      notIncludes:
        "Tiquetes aereos\nGastos no especificados\nPropinas voluntarias",
      itinerary:
        "Dia 1: llegada y bienvenida\nDia 2: experiencia romantica\nDia 3: cierre y salida",
      policies:
        "Sujeto a validacion de disponibilidad y ajustes del asesor.",
      recommendations:
        "Informar ocasion especial, alergias y preferencias de horario.",
    },
    {
      title: "Cartagena premium 3 dias",
      slug: "cartagena-premium-3-dias",
      shortDescription:
        "Una coleccion de ciudad, gastronomia y experiencias privadas.",
      description:
        "Paquete de tres dias para conocer Cartagena con una seleccion premium de actividades y asistencia concierge.",
      seoTitle:
        "Paquete Cartagena premium 3 dias | Cartagena Tailored Travel",
      seoDescription:
        "Paquete premium de 3 dias en Cartagena con ciudad amurallada, gastronomia, experiencias privadas y asistencia concierge.",
      seoContent: paragraphs(
        "Sobre este paquete. Cartagena premium 3 dias es un paquete disenado para viajeros que quieren conocer lo esencial de la ciudad sin perder comodidad, organizacion ni nivel de servicio. Combina cultura, gastronomia, experiencias privadas y asistencia concierge en una agenda flexible. La propuesta esta pensada para que el viajero no tenga que armar cada actividad por separado, pero mantenga margen para personalizar horarios, prioridades y servicios.",
        "Para quien es ideal. Es ideal para parejas, familias, viajeros internacionales y grupos pequenos que desean una primera experiencia completa en Cartagena con validacion manual de disponibilidad antes de confirmar. Tambien funciona para escapadas cortas, celebraciones, viajes corporativos pequenos o visitantes que quieren conocer ciudad, mar y gastronomia en pocos dias.",
        "Itinerario sugerido. Dia 1: llegada asistida, instalacion y recorrido inicial por la ciudad amurallada o recomendaciones para la primera noche. Dia 2: experiencia premium principal, que puede ser city tour privado, experiencia gastronomica o salida nautica segun disponibilidad y clima. Dia 3: cierre flexible con tiempo libre, recomendaciones locales, compras, terraza, traslado o actividad corta antes de salida. El asesor puede cambiar el orden segun vuelos, clima y prioridades del grupo.",
        "Alojamientos o zonas recomendadas. Para un paquete de 3 dias, el Centro Historico es una base muy conveniente porque reduce traslados y permite conectar con restaurantes, plazas y recorridos. Bocagrande puede ser buena alternativa para viajeros que priorizan mar y ciudad moderna. Si el paquete incluye islas, el asesor revisa tiempos de salida y regreso para no saturar la agenda.",
        "Experiencias incluidas o recomendadas. El paquete puede integrar city tour premium, experiencia gastronomica, cena especial, salida a Islas del Rosario, transporte privado y servicios premium como fotografia o decoracion. Las experiencias recomendadas dependen del tipo de viajero: parejas, familias, grupos de amigos o visitantes que quieren conocer Cartagena con enfoque cultural.",
        "Que incluye. Incluye asesoria concierge, city tour premium, experiencia gastronomica sugerida y coordinacion de traslados sugeridos. Tambien incluye validacion de horarios, proveedores, disponibilidad y ajustes del itinerario para ordenar el viaje antes de confirmar la reserva.",
        "Que no incluye. No incluye vuelos, consumos adicionales, servicios no confirmados por asesor, gastos personales, propinas ni upgrades que no hayan sido cotizados. Esta separacion es importante para que el viajero entienda que el paquete es personalizable, pero cada elemento adicional debe confirmarse.",
        "Politicas y condiciones. El asesor puede ajustar componentes segun disponibilidad, clima, agenda, horarios de llegada y condiciones de proveedores. Las experiencias de mar dependen de clima y condiciones maritimas. La confirmacion final se realiza despues de validar cada componente del viaje.",
        "Recomendaciones. Reservar con anticipacion para acceder a mejores horarios y proveedores. Compartir edades, tipo de viaje, restricciones alimentarias, preferencias de movilidad y expectativas del grupo. Para viajeros internacionales, se recomienda dejar margen entre llegada, actividades fuertes y salidas nauticas.",
        "Diferencial del paquete. La ventaja de un paquete premium de 3 dias es que evita una agenda fragmentada. En lugar de reservar alojamiento, tour, cena, traslados y recomendaciones por separado, el viajero recibe una propuesta conectada. Esto mejora tiempos, reduce dudas y permite que cada experiencia tenga sentido dentro del viaje completo. Tambien facilita ajustar el plan si cambia el clima, si el grupo llega tarde o si se requiere una actividad mas tranquila.",
        "Como se confirma. El asesor revisa fecha de llegada, numero de huespedes, idioma, intereses, presupuesto, zona de alojamiento preferida y nivel de servicio esperado. Con esa informacion se validan componentes reales: alojamiento disponible, guia, proveedor gastronomico, posibilidad de islas, servicios premium y traslados. La confirmacion no se basa en un calendario automatico, sino en una revision operativa pensada para evitar cruces y promesas no confirmadas.",
        "SEO y contexto turistico. Este paquete responde a busquedas como Cartagena travel packages, luxury Cartagena itinerary, Cartagena premium package e itinerario Cartagena 3 dias. El contenido visible ayuda al viajero a entender como se combinan ciudad, cultura, gastronomia y mar antes de solicitar la reserva.",
        "Uso comercial. Tambien permite que el asesor compare alternativas: mas cultura, mas mar, mas descanso o mas gastronomia, segun el motivo del viaje y el tiempo real disponible.",
        "Preguntas frecuentes. El itinerario se puede ajustar. El paquete sirve para viajeros internacionales. Puede combinar ciudad amurallada, gastronomia e islas. No es una compra automatica: primero se revisan disponibilidad, servicios incluidos y condiciones finales con el asesor."
      ),
      faq: [
        {
          question: "Que incluye el paquete Cartagena premium 3 dias?",
          answer:
            "Incluye asesoria concierge, city tour premium, experiencia gastronomica sugerida y coordinacion de servicios segun disponibilidad.",
        },
        {
          question: "Se puede ajustar el itinerario?",
          answer:
            "Si. El asesor puede ajustar componentes, horarios y servicios segun preferencias, disponibilidad y tipo de viaje.",
        },
        {
          question: "El paquete sirve para viajeros internacionales?",
          answer:
            "Si. Esta pensado para viajeros que desean conocer Cartagena con asistencia local, tiempos claros y proveedores validados.",
        },
      ],
      translations: {
        en: {
          title: "Premium Cartagena in 3 days",
          shortDescription:
            "A curated blend of city, gastronomy and private experiences.",
          description:
            "Three-day package to discover Cartagena with premium activities and advisor assistance.",
          duration: "3 days",
          location: "Historic Cartagena and islands",
          category: "Premium",
          includes:
            "Advisor assistance\nPremium city tour\nGastronomic experience\nSuggested transfer coordination",
          notIncludes:
            "Flights\nAdditional consumption\nServices not confirmed by an advisor",
          itinerary:
            "Day 1: arrival and walled city\nDay 2: private premium plan\nDay 3: flexible closing",
          policies:
            "The advisor can adjust components according to availability.",
          recommendations:
            "Book in advance for better schedules and providers.",
          seoTitle:
            "Premium Cartagena 3-day package | Cartagena Tailored Travel",
          seoDescription:
            "Premium 3-day Cartagena package with walled city, gastronomy, private experiences and concierge assistance.",
          seoContent: paragraphs(
            "Premium Cartagena in 3 days is designed for travelers who want to discover the city with comfort, organization and a high level of service.",
            "The itinerary can combine assisted arrival, the walled city, a private or gastronomy experience and flexible closing time with local recommendations.",
            "It is ideal for couples, families, international travelers and small groups who want a complete first Cartagena experience with manual availability validation."
          ),
          faq: [
            {
              question: "What does the premium Cartagena 3-day package include?",
              answer:
                "It includes concierge assistance, a premium city tour, suggested gastronomy experience and service coordination according to availability.",
            },
            {
              question: "Can the itinerary be adjusted?",
              answer:
                "Yes. The advisor can adjust components, timing and services according to preferences and availability.",
            },
          ],
        },
        fr: {
          title: "Cartagena premium en 3 jours",
          shortDescription:
            "Un melange soigne de ville, gastronomie et experiences privees.",
          description:
            "Forfait de trois jours pour decouvrir Cartagena avec activites premium et assistance d'un conseiller.",
          duration: "3 jours",
          location: "Cartagena historique et iles",
          category: "Premium",
          includes:
            "Assistance conseiller\nCity tour premium\nExperience gastronomique\nCoordination suggeree des transferts",
          notIncludes:
            "Vols\nConsommations additionnelles\nServices non confirmes par un conseiller",
          itinerary:
            "Jour 1 : arrivee et ville fortifiee\nJour 2 : plan prive premium\nJour 3 : cloture flexible",
          policies:
            "Le conseiller peut ajuster les composants selon la disponibilite.",
          recommendations:
            "Reservez a l'avance pour de meilleurs horaires et prestataires.",
        },
        pt: {
          title: "Cartagena premium em 3 dias",
          shortDescription:
            "Uma combinacao selecionada de cidade, gastronomia e experiencias privativas.",
          description:
            "Pacote de tres dias para conhecer Cartagena com atividades premium e assistencia de assessor.",
          duration: "3 dias",
          location: "Cartagena historica e ilhas",
          category: "Premium",
          includes:
            "Assistencia do assessor\nCity tour premium\nExperiencia gastronomica\nCoordenacao sugerida de traslados",
          notIncludes:
            "Voos\nConsumos adicionais\nServicos nao confirmados por assessor",
          itinerary:
            "Dia 1: chegada e cidade murada\nDia 2: plano premium privativo\nDia 3: encerramento flexivel",
          policies:
            "O assessor pode ajustar componentes conforme disponibilidade.",
          recommendations:
            "Reserve com antecedencia para melhores horarios e fornecedores.",
        },
        it: {
          title: "Cartagena premium in 3 giorni",
          shortDescription:
            "Un mix curato di citta, gastronomia ed esperienze private.",
          description:
            "Pacchetto di tre giorni per scoprire Cartagena con attivita premium e assistenza del consulente.",
          duration: "3 giorni",
          location: "Cartagena storica e isole",
          category: "Premium",
          includes:
            "Assistenza del consulente\nCity tour premium\nEsperienza gastronomica\nCoordinamento trasferimenti suggerito",
          notIncludes:
            "Voli\nConsumi aggiuntivi\nServizi non confermati da un consulente",
          itinerary:
            "Giorno 1: arrivo e citta murata\nGiorno 2: piano premium privato\nGiorno 3: chiusura flessibile",
          policies:
            "Il consulente puo adattare i componenti in base alla disponibilita.",
          recommendations:
            "Prenota in anticipo per migliori orari e fornitori.",
        },
      },
      duration: "3 dias",
      location: "Cartagena historica e islas",
      maxGuests: 6,
      basePrice: 5200000,
      priceCop: 5200000,
      baseCurrency: "COP",
      mainImage:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600",
      category: "Premium",
      includes:
        "Asesoria concierge\nCity tour premium\nExperiencia gastronomica\nCoordinacion de traslados sugeridos",
      notIncludes:
        "Vuelos\nConsumos adicionales\nServicios no confirmados por asesor",
      itinerary:
        "Dia 1: llegada y ciudad amurallada\nDia 2: plan premium privado\nDia 3: cierre flexible",
      policies:
        "El asesor puede ajustar componentes segun disponibilidad.",
      recommendations:
        "Reservar con anticipacion para mejores horarios y proveedores.",
    },
    {
      title: "Islas + ciudad amurallada",
      slug: "islas-ciudad-amurallada",
      shortDescription:
        "Combina mar Caribe y cultura historica en una sola solicitud.",
      description:
        "Paquete concierge que une una salida privada hacia islas con recorrido por los puntos mas emblematicos de Cartagena.",
      seoTitle:
        "Paquete Islas del Rosario y ciudad amurallada | Cartagena Tailored Travel",
      seoDescription:
        "Paquete en Cartagena que combina Islas del Rosario, ciudad amurallada, cultura y asistencia concierge.",
      seoContent: paragraphs(
        "Sobre este paquete. El paquete Islas + ciudad amurallada combina dos de las experiencias mas buscadas de Cartagena: el mar Caribe de las Islas del Rosario y el recorrido cultural por el Centro Historico. Es una propuesta pensada para viajeros que quieren equilibrar descanso, historia, fotografia, gastronomia y asistencia personalizada en una sola solicitud.",
        "Para quien es ideal. Funciona bien para parejas, familias, grupos de amigos y viajeros internacionales que tienen pocos dias en Cartagena y quieren vivir dos caras del destino: la ciudad patrimonial y el mar turquesa. Tambien es util para quienes no quieren elegir entre cultura e islas, sino organizar ambos planes con tiempos claros y validacion previa.",
        "Itinerario sugerido. Dia 1: experiencia de islas con salida coordinada desde Cartagena, ruta sugerida, tiempo de mar y regreso asistido. Dia 2: recorrido por ciudad amurallada, plazas, calles coloniales, puntos historicos y recomendaciones gastronomicas. El orden puede invertirse si el clima o la disponibilidad de proveedores lo hace mas conveniente.",
        "Alojamientos o zonas recomendadas. Para este paquete, el Centro Historico es una base practica si el viajero quiere caminar por la ciudad y acceder a restaurantes. Bocagrande puede ser conveniente si el grupo prioriza cercania al mar y desplazamientos hacia zonas modernas. La eleccion del alojamiento debe considerar horarios de salida a islas y tiempos de regreso.",
        "Experiencias incluidas o recomendadas. La salida privada o asistida hacia Islas del Rosario y el recorrido por ciudad amurallada son los ejes del paquete. Tambien pueden recomendarse cena romantica, fotografia profesional, experiencia gastronomica local, recorrido por Getsemani o transporte privado, segun el perfil del grupo.",
        "Que incluye. Incluye plan de islas sugerido, recorrido por ciudad amurallada, acompanamiento concierge y ajustes personalizados. Tambien incluye validacion de clima, disponibilidad de proveedor, horarios y recomendaciones para que el viajero llegue preparado a cada actividad.",
        "Que no incluye. No incluye entradas no especificadas, alimentos no descritos, gastos personales, upgrades de embarcacion, propinas ni servicios no confirmados por asesor. Si el viajero desea almuerzo especifico, embarcacion superior, fotografia o transporte adicional, esos elementos deben validarse antes de confirmar.",
        "Politicas y condiciones. La salida a islas depende de condiciones climaticas y maritimas. El recorrido por ciudad puede ajustarse por clima, eventos locales o ritmo del grupo. La confirmacion final ocurre cuando el asesor valida proveedores, horarios y condiciones de cada componente.",
        "Recomendaciones. Llevar ropa fresca, documento, protector solar, hidratacion y calzado comodo para el dia de ciudad. Informar si hay ninos, adultos mayores, restricciones de movilidad o necesidades alimentarias. Evitar programar actividades muy exigentes inmediatamente despues de vuelos largos.",
        "Diferencial del paquete. Este plan ayuda a resolver una de las dudas mas comunes en Cartagena: como combinar ciudad e islas sin que el viaje se sienta apretado. La ciudad amurallada aporta historia, arquitectura y gastronomia; las Islas del Rosario aportan mar, descanso y paisaje caribeno. Al unir ambos en una solicitud asistida, el asesor puede ordenar horarios, traslados y energia del grupo para que cada dia tenga un objetivo claro.",
        "Como se confirma. Antes de confirmar, se revisa clima, disponibilidad de embarcacion, proveedor de guia, horarios, punto de salida, numero de viajeros y servicios adicionales. Si las condiciones de mar no son favorables, el asesor puede proponer ajustes. Si el grupo quiere fotografia, almuerzo, transporte o una ruta mas privada, esos componentes se cotizan y se integran al paquete solo cuando quedan validados.",
        "SEO y contexto turistico. Este paquete responde a viajeros que buscan Islas del Rosario Cartagena, ciudad amurallada Cartagena, paquetes turisticos Cartagena y Cartagena islands package. El contenido visible explica como se conectan los dos atractivos principales del destino y ayuda a Google a entender la relacion entre cultura, mar y viaje personalizado.",
        "Uso comercial. Es una opcion fuerte para usuarios que aun no saben si reservar una experiencia suelta o un paquete. Al mostrar ambos componentes, la pagina facilita convertir la inspiracion en una solicitud completa. Esa flexibilidad convierte el paquete en una base comercial adaptable y no en una ruta cerrada.",
        "Preguntas frecuentes. El paquete puede hacerse en dos dias. Incluye un plan de islas sugerido y un recorrido historico, sujeto a disponibilidad. El itinerario puede ajustarse. Si el clima no permite salida a islas, el asesor puede revisar alternativas segun fecha y proveedores."
      ),
      faq: [
        {
          question: "El paquete incluye salida a islas?",
          answer:
            "Si, el paquete contempla un plan de islas sugerido sujeto a clima, disponibilidad y validacion del asesor.",
        },
        {
          question: "Tambien incluye recorrido historico?",
          answer:
            "Si. El paquete combina ciudad amurallada con una experiencia de mar, segun disponibilidad y preferencias del viajero.",
        },
        {
          question: "Se puede hacer en dos dias?",
          answer:
            "Si. Esta preparado como un plan de dos dias, aunque el asesor puede ajustar tiempos segun agenda y disponibilidad.",
        },
      ],
      translations: {
        en: {
          title: "Islands + walled city",
          shortDescription:
            "Combine the Caribbean Sea and historic culture in one assisted request.",
          description:
            "Assisted package combining a private island outing with a tour through Cartagena's most iconic landmarks.",
          duration: "2 days",
          location: "Rosario Islands and Historic Center",
          category: "Islands and culture",
          includes:
            "Suggested island plan\nWalled city tour\nAdvisor assistance\nPersonalized adjustments",
          notIncludes:
            "Unspecified entrance fees\nMeals not described\nPersonal expenses",
          itinerary:
            "Day 1: island experience\nDay 2: walled city and closing",
          policies:
            "The island outing depends on weather conditions.",
          recommendations:
            "Bring light clothing, ID, sunscreen and hydration.",
          seoTitle:
            "Rosario Islands and walled city package | Cartagena Tailored Travel",
          seoDescription:
            "Cartagena package combining Rosario Islands, the walled city, culture and concierge assistance.",
          seoContent: paragraphs(
            "The Islands + walled city package combines two of Cartagena's most requested experiences: the Caribbean Sea of the Rosario Islands and a cultural route through the Historic Center.",
            "It is useful for travelers who want to make the most of a short trip with a balanced agenda of rest, history, photography, gastronomy and personalized assistance.",
            "The advisor validates weather, timing, provider availability, group pace and included services before confirmation."
          ),
          faq: [
            {
              question: "Does the package include an island outing?",
              answer:
                "Yes. The package includes a suggested island plan subject to weather, availability and advisor validation.",
            },
            {
              question: "Does it include a historic route?",
              answer:
                "Yes. The package combines the walled city with a sea experience according to availability and traveler preferences.",
            },
          ],
        },
        fr: {
          title: "Iles + ville fortifiee",
          shortDescription:
            "Combinez la mer des Caraibes et la culture historique dans une seule demande assistee.",
          description:
            "Forfait assiste combinant une sortie privee vers les iles avec un parcours par les lieux emblematiques de Cartagena.",
          duration: "2 jours",
          location: "Iles du Rosaire et Centre historique",
          category: "Iles et culture",
          includes:
            "Plan d'iles suggere\nParcours ville fortifiee\nAssistance conseiller\nAjustements personnalises",
          notIncludes:
            "Entrees non specifiees\nRepas non decrits\nDepenses personnelles",
          itinerary:
            "Jour 1 : experience des iles\nJour 2 : ville fortifiee et cloture",
          policies:
            "La sortie vers les iles depend des conditions meteo.",
          recommendations:
            "Apportez des vetements legers, une piece d'identite, de la creme solaire et de l'hydratation.",
        },
        pt: {
          title: "Ilhas + cidade murada",
          shortDescription:
            "Combine mar do Caribe e cultura historica em uma unica solicitacao assistida.",
          description:
            "Pacote assistido que une uma saida privativa para ilhas com percurso pelos pontos mais emblematicos de Cartagena.",
          duration: "2 dias",
          location: "Ilhas do Rosario e Centro historico",
          category: "Ilhas e cultura",
          includes:
            "Plano de ilhas sugerido\nPercurso pela cidade murada\nAssistencia do assessor\nAjustes personalizados",
          notIncludes:
            "Entradas nao especificadas\nAlimentos nao descritos\nGastos pessoais",
          itinerary:
            "Dia 1: experiencia de ilhas\nDia 2: cidade murada e encerramento",
          policies:
            "A saida para as ilhas depende das condicoes climaticas.",
          recommendations:
            "Leve roupa leve, documento, protetor solar e hidratacao.",
        },
        it: {
          title: "Isole + citta murata",
          shortDescription:
            "Combina Mar dei Caraibi e cultura storica in un'unica richiesta assistita.",
          description:
            "Pacchetto assistito che unisce un'uscita privata verso le isole con un percorso nei luoghi piu emblematici di Cartagena.",
          duration: "2 giorni",
          location: "Isole del Rosario e Centro storico",
          category: "Isole e cultura",
          includes:
            "Piano isole suggerito\nPercorso citta murata\nAssistenza consulente\nAdattamenti personalizzati",
          notIncludes:
            "Ingressi non specificati\nPasti non descritti\nSpese personali",
          itinerary:
            "Giorno 1: esperienza alle isole\nGiorno 2: citta murata e chiusura",
          policies:
            "L'uscita alle isole dipende dalle condizioni meteo.",
          recommendations:
            "Porta abiti leggeri, documento, crema solare e idratazione.",
        },
      },
      duration: "2 dias",
      location: "Islas del Rosario y Centro historico",
      maxGuests: 8,
      basePrice: 4500000,
      priceCop: 4500000,
      baseCurrency: "COP",
      mainImage:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1600",
      category: "Islas y cultura",
      includes:
        "Plan de islas sugerido\nRecorrido ciudad amurallada\nAcompanamiento concierge\nAjustes personalizados",
      notIncludes:
        "Entradas no especificadas\nAlimentos no descritos\nGastos personales",
      itinerary:
        "Dia 1: experiencia de islas\nDia 2: ciudad amurallada y cierre",
      policies:
        "La salida a islas depende de condiciones climaticas.",
      recommendations:
        "Llevar ropa fresca, documento, protector solar e hidratacion.",
    },
  ];

  for (const packageItem of packages) {
    await prisma.package.upsert({
      where: { slug: packageItem.slug },
      update: {
        ...packageItem,
        active: true,
      },
      create: {
        ...packageItem,
        active: true,
      },
    });
  }

  console.log("Paquetes base creados o actualizados.");

  const demoProperty = await prisma.property.findUnique({
    where: { slug: "villa-demo-centro-historico" },
  });
  const demoExperience = await prisma.experience.findUnique({
    where: { slug: "tour-privado-islas-del-rosario" },
  });
  const demoPackage = await prisma.package.findUnique({
    where: { slug: "cartagena-premium-3-dias" },
  });

  if (demoPackage) {
    await prisma.packageComponent.deleteMany({
      where: { packageId: demoPackage.id },
    });

    const demoComponents = [
      {
        title: "Paseo nocturno por Cartagena",
        shortDescription:
          "Recorrido privado por zonas iconicas de la ciudad al caer la noche.",
        description:
          "Experiencia guiada para conocer Cartagena de noche, con ruta flexible, paradas sugeridas y acompanamiento operativo.",
        translations: {
          en: {
            title: "Private night tour through Cartagena",
            shortDescription:
              "A private route through iconic city areas after sunset.",
            description:
              "Guided experience to discover Cartagena at night, with a flexible route, suggested stops and operational support.",
            includes:
              "Suggested route\nAdvisor coordination\nOperational accompaniment",
            excludes:
              "Unspecified entrance fees\nPersonal consumption\nTips",
            conditions:
              "Route and schedule are confirmed according to availability and mobility conditions.",
            recommendations:
              "Wear comfortable clothing and share any mobility restriction in advance.",
            duration: "2 to 3 hours",
            location: "Historic Cartagena",
          },
          fr: {
            title: "Visite nocturne privee de Cartagena",
            shortDescription:
              "Un parcours prive dans les zones iconiques de la ville apres le coucher du soleil.",
            description:
              "Experience guidee pour decouvrir Cartagena de nuit, avec itineraire flexible, arrets suggeres et accompagnement operationnel.",
            includes:
              "Itineraire suggere\nCoordination conseiller\nAccompagnement operationnel",
            excludes:
              "Entrees non specifiees\nConsommations personnelles\nPourboires",
            conditions:
              "L'itineraire et l'horaire sont confirmes selon la disponibilite et les conditions de mobilite.",
            recommendations:
              "Portez des vetements confortables et signalez toute restriction de mobilite a l'avance.",
            duration: "2 a 3 heures",
            location: "Cartagena historique",
          },
          pt: {
            title: "Passeio noturno privativo por Cartagena",
            shortDescription:
              "Rota privativa por areas iconicas da cidade ao cair da noite.",
            description:
              "Experiencia guiada para conhecer Cartagena a noite, com rota flexivel, paradas sugeridas e acompanhamento operacional.",
            includes:
              "Rota sugerida\nCoordenacao do assessor\nAcompanhamento operacional",
            excludes:
              "Entradas nao especificadas\nConsumo pessoal\nGorjetas",
            conditions:
              "Rota e horario sao confirmados conforme disponibilidade e condicoes de mobilidade.",
            recommendations:
              "Use roupa confortavel e informe qualquer restricao de mobilidade com antecedencia.",
            duration: "2 a 3 horas",
            location: "Cartagena historica",
          },
          it: {
            title: "Tour notturno privato di Cartagena",
            shortDescription:
              "Percorso privato nelle zone iconiche della citta dopo il tramonto.",
            description:
              "Esperienza guidata per scoprire Cartagena di notte, con itinerario flessibile, soste suggerite e supporto operativo.",
            includes:
              "Itinerario suggerito\nCoordinamento consulente\nAccompagnamento operativo",
            excludes:
              "Ingressi non specificati\nConsumi personali\nMance",
            conditions:
              "Itinerario e orario vengono confermati in base a disponibilita e condizioni di mobilita.",
            recommendations:
              "Indossa abiti comodi e comunica in anticipo eventuali limitazioni di mobilita.",
            duration: "2-3 ore",
            location: "Cartagena storica",
          },
        },
        includes:
          "Ruta sugerida\nCoordinacion del asesor\nAcompanamiento operativo",
        excludes:
          "Entradas no especificadas\nConsumos personales\nPropinas",
        conditions:
          "Ruta y horario se confirman segun disponibilidad y condiciones de movilidad.",
        duration: "2 a 3 horas",
        location: "Cartagena historica",
        recommendations:
          "Usar ropa comoda e informar restricciones de movilidad con anticipacion.",
      },
      {
        title: "Experiencia gastronomica local",
        shortDescription:
          "Momento culinario seleccionado para probar sabores de Cartagena.",
        description:
          "Actividad gastronomica coordinada con proveedores locales, ideal para complementar el recorrido premium.",
        translations: {
          en: {
            title: "Local gastronomy experience",
            shortDescription:
              "A curated culinary moment to taste Cartagena flavors.",
            description:
              "Gastronomy activity coordinated with local providers, ideal to complement the premium route.",
            includes:
              "Suggested culinary experience\nAdvisor coordination\nOperational support",
            excludes:
              "Additional consumption\nTransportation not confirmed\nTips",
            conditions:
              "Provider, menu and schedule are validated before confirmation.",
            recommendations:
              "Share allergies, dietary restrictions and preferred cuisine.",
            duration: "2 hours",
            location: "Cartagena",
          },
          fr: {
            title: "Experience gastronomique locale",
            shortDescription:
              "Un moment culinaire soigne pour decouvrir les saveurs de Cartagena.",
            description:
              "Activite gastronomique coordonnee avec des prestataires locaux, ideale pour completer le parcours premium.",
            includes:
              "Experience culinaire suggeree\nCoordination conseiller\nSupport operationnel",
            excludes:
              "Consommations additionnelles\nTransport non confirme\nPourboires",
            conditions:
              "Le prestataire, le menu et l'horaire sont valides avant confirmation.",
            recommendations:
              "Indiquez allergies, restrictions alimentaires et cuisine preferee.",
            duration: "2 heures",
            location: "Cartagena",
          },
          pt: {
            title: "Experiencia gastronomica local",
            shortDescription:
              "Momento culinario selecionado para provar sabores de Cartagena.",
            description:
              "Atividade gastronomica coordenada com fornecedores locais, ideal para complementar a rota premium.",
            includes:
              "Experiencia culinaria sugerida\nCoordenacao do assessor\nSuporte operacional",
            excludes:
              "Consumos adicionais\nTransporte nao confirmado\nGorjetas",
            conditions:
              "Fornecedor, menu e horario sao validados antes da confirmacao.",
            recommendations:
              "Informe alergias, restricoes alimentares e culinaria preferida.",
            duration: "2 horas",
            location: "Cartagena",
          },
          it: {
            title: "Esperienza gastronomica locale",
            shortDescription:
              "Momento culinario curato per assaggiare i sapori di Cartagena.",
            description:
              "Attivita gastronomica coordinata con fornitori locali, ideale per completare il percorso premium.",
            includes:
              "Esperienza culinaria suggerita\nCoordinamento consulente\nSupporto operativo",
            excludes:
              "Consumi aggiuntivi\nTrasporto non confermato\nMance",
            conditions:
              "Fornitore, menu e orario vengono validati prima della conferma.",
            recommendations:
              "Comunica allergie, restrizioni alimentari e cucina preferita.",
            duration: "2 ore",
            location: "Cartagena",
          },
        },
        includes:
          "Experiencia culinaria sugerida\nCoordinacion del asesor\nSoporte operativo",
        excludes:
          "Consumos adicionales\nTransporte no confirmado\nPropinas",
        conditions:
          "Proveedor, menu y horario se validan antes de confirmar.",
        duration: "2 horas",
        location: "Cartagena",
        recommendations:
          "Informar alergias, restricciones alimentarias y preferencias de cocina.",
      },
      {
        title: "Plan privado en islas",
        shortDescription:
          "Salida sugerida hacia aguas del Caribe con validacion manual.",
        description:
          "Componente nautico sujeto a clima y disponibilidad, coordinado por el asesor para integrar mar y descanso.",
        translations: {
          en: {
            title: "Private island plan",
            shortDescription:
              "A suggested outing toward Caribbean waters with manual validation.",
            description:
              "Nautical component subject to weather and availability, coordinated by the advisor to integrate sea and rest.",
            includes:
              "Suggested island route\nAdvisor coordination\nManual availability validation",
            excludes:
              "Unconfirmed boat upgrades\nMeals not described\nPersonal expenses",
            conditions:
              "The outing depends on weather, provider availability and advisor validation.",
            recommendations:
              "Bring ID, sunscreen, light clothing and hydration.",
            duration: "Full day",
            location: "Rosario Islands",
          },
          fr: {
            title: "Plan prive dans les iles",
            shortDescription:
              "Sortie suggeree vers les eaux des Caraibes avec validation manuelle.",
            description:
              "Composant nautique soumis a la meteo et a la disponibilite, coordonne par le conseiller pour integrer mer et repos.",
            includes:
              "Itineraire d'iles suggere\nCoordination conseiller\nValidation manuelle de disponibilite",
            excludes:
              "Surclassements bateau non confirmes\nRepas non decrits\nDepenses personnelles",
            conditions:
              "La sortie depend de la meteo, de la disponibilite du prestataire et de la validation du conseiller.",
            recommendations:
              "Apportez une piece d'identite, de la creme solaire, des vetements legers et de l'hydratation.",
            duration: "Journee complete",
            location: "Iles du Rosaire",
          },
          pt: {
            title: "Plano privativo nas ilhas",
            shortDescription:
              "Saida sugerida para aguas do Caribe com validacao manual.",
            description:
              "Componente nautico sujeito ao clima e disponibilidade, coordenado pelo assessor para integrar mar e descanso.",
            includes:
              "Rota de ilhas sugerida\nCoordenacao do assessor\nValidacao manual de disponibilidade",
            excludes:
              "Upgrades de embarcacao nao confirmados\nRefeicoes nao descritas\nGastos pessoais",
            conditions:
              "A saida depende do clima, disponibilidade do fornecedor e validacao do assessor.",
            recommendations:
              "Leve documento, protetor solar, roupa leve e hidratacao.",
            duration: "Dia completo",
            location: "Ilhas do Rosario",
          },
          it: {
            title: "Piano privato alle isole",
            shortDescription:
              "Uscita suggerita verso le acque caraibiche con validazione manuale.",
            description:
              "Componente nautico soggetto a meteo e disponibilita, coordinato dal consulente per integrare mare e relax.",
            includes:
              "Itinerario isole suggerito\nCoordinamento consulente\nValidazione manuale disponibilita",
            excludes:
              "Upgrade barca non confermati\nPasti non descritti\nSpese personali",
            conditions:
              "L'uscita dipende da meteo, disponibilita del fornitore e validazione del consulente.",
            recommendations:
              "Porta documento, crema solare, abiti leggeri e idratazione.",
            duration: "Giornata intera",
            location: "Isole del Rosario",
          },
        },
        includes:
          "Ruta de islas sugerida\nCoordinacion del asesor\nValidacion manual de disponibilidad",
        excludes:
          "Upgrades de embarcacion no confirmados\nAlimentos no descritos\nGastos personales",
        conditions:
          "La salida depende de clima, disponibilidad del proveedor y validacion del asesor.",
        duration: "Dia completo",
        location: "Islas del Rosario",
        recommendations:
          "Llevar documento, protector solar, ropa fresca e hidratacion.",
      },
    ];

    for (const [index, component] of demoComponents.entries()) {
      await prisma.packageComponent.create({
        data: {
          ...component,
          sortOrder: index,
          active: true,
          packageId: demoPackage.id,
        },
      });
    }
  }

  if (demoProperty) {
    await upsertExtra({
      name: "Transporte privado aeropuerto",
      description:
        "Traslado privado coordinado por el equipo de atencion para llegada o salida.",
      translations: {
        en: {
          name: "Private airport transfer",
          description:
            "Private transfer coordinated by the assistance team for arrival or departure.",
        },
        fr: {
          name: "Transfert aeroport prive",
          description:
            "Transfert prive coordonne par l'equipe d'assistance pour l'arrivee ou le depart.",
        },
        pt: {
          name: "Transfer privativo do aeroporto",
          description:
            "Transfer privativo coordenado pela equipe de atendimento para chegada ou saida.",
        },
        it: {
          name: "Transfer aeroportuale privato",
          description:
            "Transfer privato coordinato dal team di assistenza per arrivo o partenza.",
        },
      },
      price: 180000,
      propertyId: demoProperty.id,
    });
  }

  if (demoExperience) {
    await upsertExtra({
      name: "Fotografia profesional",
      description:
        "Registro fotografico basico de la experiencia para recuerdos del viaje.",
      translations: {
        en: {
          name: "Professional photography",
          description:
            "Basic photographic coverage of the experience for travel memories.",
        },
        fr: {
          name: "Photographie professionnelle",
          description:
            "Couverture photographique de base de l'experience pour garder des souvenirs du voyage.",
        },
        pt: {
          name: "Fotografia profissional",
          description:
            "Registro fotografico basico da experiencia para lembrancas da viagem.",
        },
        it: {
          name: "Fotografia professionale",
          description:
            "Servizio fotografico base dell'esperienza per i ricordi del viaggio.",
        },
      },
      price: 450000,
      experienceId: demoExperience.id,
    });
  }

  if (demoPackage) {
    await upsertExtra({
      name: "Decoracion especial",
      description:
        "Ambientacion personalizada para celebraciones, aniversarios o viajes especiales.",
      translations: {
        en: {
          name: "Special decoration",
          description:
            "Personalized styling for celebrations, anniversaries or special trips.",
        },
        fr: {
          name: "Decoration speciale",
          description:
            "Ambiance personnalisee pour celebrations, anniversaires ou voyages speciaux.",
        },
        pt: {
          name: "Decoracao especial",
          description:
            "Ambientacao personalizada para celebracoes, aniversarios ou viagens especiais.",
        },
        it: {
          name: "Decorazione speciale",
          description:
            "Allestimento personalizzato per celebrazioni, anniversari o viaggi speciali.",
        },
      },
      price: 520000,
      packageId: demoPackage.id,
    });
  }

  console.log("Servicios premium demo creados o actualizados.");

  const productFeatures = [
    {
      name: "Piscina",
      description: "Alojamientos con piscina privada o compartida.",
      translations: {
        en: {
          name: "Pool",
          description: "Accommodations with a private or shared pool.",
        },
        fr: {
          name: "Piscine",
          description: "Hebergements avec piscine privee ou partagee.",
        },
        pt: {
          name: "Piscina",
          description: "Acomodacoes com piscina privativa ou compartilhada.",
        },
        it: {
          name: "Piscina",
          description: "Alloggi con piscina privata o condivisa.",
        },
      },
      icon: "pool",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Jacuzzi",
      description: "Alojamientos con jacuzzi o zona humeda premium.",
      translations: {
        en: {
          name: "Hot tub",
          description: "Accommodations with a hot tub or premium wet area.",
        },
        fr: {
          name: "Jacuzzi",
          description: "Hebergements avec jacuzzi ou espace humide premium.",
        },
        pt: {
          name: "Jacuzzi",
          description: "Acomodacoes com jacuzzi ou area molhada premium.",
        },
        it: {
          name: "Jacuzzi",
          description: "Alloggi con jacuzzi o area benessere premium.",
        },
      },
      icon: "waves",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Frente al mar",
      description: "Alojamientos ubicados frente al mar o muy cerca de playa.",
      translations: {
        en: {
          name: "Beachfront",
          description:
            "Accommodations located by the sea or very close to the beach.",
        },
        fr: {
          name: "Face a la mer",
          description:
            "Hebergements situes face a la mer ou tres proches de la plage.",
        },
        pt: {
          name: "Frente ao mar",
          description:
            "Acomodacoes localizadas frente ao mar ou muito proximas da praia.",
        },
        it: {
          name: "Fronte mare",
          description:
            "Alloggi situati fronte mare o molto vicini alla spiaggia.",
        },
      },
      icon: "water",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Vista al centro historico",
      description: "Alojamientos con vista o cercania al centro historico.",
      translations: {
        en: {
          name: "Historic Center view",
          description:
            "Accommodations with a view of or close access to the Historic Center.",
        },
        fr: {
          name: "Vue sur le centre historique",
          description:
            "Hebergements avec vue sur le centre historique ou acces proche.",
        },
        pt: {
          name: "Vista para o centro historico",
          description:
            "Acomodacoes com vista ou acesso proximo ao centro historico.",
        },
        it: {
          name: "Vista sul centro storico",
          description:
            "Alloggi con vista o accesso vicino al centro storico.",
        },
      },
      icon: "landmark",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Terraza privada",
      description: "Espacios exteriores privados para descansar o compartir.",
      translations: {
        en: {
          name: "Private terrace",
          description: "Private outdoor spaces to relax or gather.",
        },
        fr: {
          name: "Terrasse privee",
          description: "Espaces exterieurs prives pour se detendre ou partager.",
        },
        pt: {
          name: "Terraco privativo",
          description:
            "Espacos externos privativos para descansar ou compartilhar.",
        },
        it: {
          name: "Terrazza privata",
          description: "Spazi esterni privati per rilassarsi o stare insieme.",
        },
      },
      icon: "terrace",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Cocina equipada",
      description: "Alojamientos con cocina funcional para estadias flexibles.",
      translations: {
        en: {
          name: "Equipped kitchen",
          description:
            "Accommodations with a functional kitchen for flexible stays.",
        },
        fr: {
          name: "Cuisine equipee",
          description:
            "Hebergements avec cuisine fonctionnelle pour des sejours flexibles.",
        },
        pt: {
          name: "Cozinha equipada",
          description:
            "Acomodacoes com cozinha funcional para estadias flexiveis.",
        },
        it: {
          name: "Cucina attrezzata",
          description:
            "Alloggi con cucina funzionale per soggiorni flessibili.",
        },
      },
      icon: "chef-hat",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Yate privado",
      description: "Experiencias nauticas con embarcacion privada.",
      translations: {
        en: {
          name: "Private yacht",
          description: "Nautical experiences with a private boat.",
        },
        fr: {
          name: "Yacht prive",
          description: "Experiences nautiques avec embarcation privee.",
        },
        pt: {
          name: "Iate privativo",
          description: "Experiencias nauticas com embarcacao privativa.",
        },
        it: {
          name: "Yacht privato",
          description: "Esperienze nautiche con imbarcazione privata.",
        },
      },
      icon: "ship",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Islas del Rosario",
      description: "Experiencias enfocadas en Islas del Rosario.",
      translations: {
        en: {
          name: "Rosario Islands",
          description: "Experiences focused on the Rosario Islands.",
        },
        fr: {
          name: "Iles du Rosaire",
          description: "Experiences centrees sur les iles du Rosaire.",
        },
        pt: {
          name: "Ilhas do Rosario",
          description: "Experiencias focadas nas Ilhas do Rosario.",
        },
        it: {
          name: "Isole del Rosario",
          description: "Esperienze dedicate alle Isole del Rosario.",
        },
      },
      icon: "island",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Gastronomia",
      description: "Experiencias culinarias o de cena especial.",
      translations: {
        en: {
          name: "Gastronomy",
          description: "Culinary experiences or special dinners.",
        },
        fr: {
          name: "Gastronomie",
          description: "Experiences culinaires ou diners speciaux.",
        },
        pt: {
          name: "Gastronomia",
          description: "Experiencias culinarias ou jantares especiais.",
        },
        it: {
          name: "Gastronomia",
          description: "Esperienze culinarie o cene speciali.",
        },
      },
      icon: "utensils",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Vida nocturna",
      description: "Planes para disfrutar Cartagena de noche.",
      translations: {
        en: {
          name: "Nightlife",
          description: "Plans to enjoy Cartagena at night.",
        },
        fr: {
          name: "Vie nocturne",
          description: "Plans pour profiter de Cartagena la nuit.",
        },
        pt: {
          name: "Vida noturna",
          description: "Planos para aproveitar Cartagena a noite.",
        },
        it: {
          name: "Vita notturna",
          description: "Proposte per vivere Cartagena di notte.",
        },
      },
      icon: "music",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Cultural",
      description: "Experiencias historicas, patrimoniales o locales.",
      translations: {
        en: {
          name: "Cultural",
          description: "Historic, heritage or local experiences.",
        },
        fr: {
          name: "Culturel",
          description: "Experiences historiques, patrimoniales ou locales.",
        },
        pt: {
          name: "Cultural",
          description: "Experiencias historicas, patrimoniais ou locais.",
        },
        it: {
          name: "Culturale",
          description: "Esperienze storiche, patrimoniali o locali.",
        },
      },
      icon: "landmark",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Fotografia",
      description: "Experiencias con enfoque fotografico o registro visual.",
      translations: {
        en: {
          name: "Photography",
          description: "Experiences with a photography or visual record focus.",
        },
        fr: {
          name: "Photographie",
          description:
            "Experiences axees sur la photographie ou le registre visuel.",
        },
        pt: {
          name: "Fotografia",
          description:
            "Experiencias com foco fotografico ou registro visual.",
        },
        it: {
          name: "Fotografia",
          description:
            "Esperienze con focus fotografico o documentazione visiva.",
        },
      },
      icon: "camera",
      category: ProductFeatureCategory.SERVICE_LEVEL,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Luna de miel",
      description: "Paquetes pensados para viajes romanticos y celebraciones.",
      translations: {
        en: {
          name: "Honeymoon",
          description: "Packages designed for romantic trips and celebrations.",
        },
        fr: {
          name: "Lune de miel",
          description: "Forfaits concus pour voyages romantiques et celebrations.",
        },
        pt: {
          name: "Lua de mel",
          description: "Pacotes pensados para viagens romanticas e celebracoes.",
        },
        it: {
          name: "Luna di miele",
          description: "Pacchetti pensati per viaggi romantici e celebrazioni.",
        },
      },
      icon: "heart",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Familiar",
      description: "Paquetes adecuados para familias o grupos cercanos.",
      translations: {
        en: {
          name: "Family",
          description: "Packages suitable for families or close groups.",
        },
        fr: {
          name: "Famille",
          description: "Forfaits adaptes aux familles ou groupes proches.",
        },
        pt: {
          name: "Familiar",
          description: "Pacotes adequados para familias ou grupos proximos.",
        },
        it: {
          name: "Famiglia",
          description: "Pacchetti adatti a famiglie o gruppi vicini.",
        },
      },
      icon: "users",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Celebracion especial",
      description: "Paquetes para aniversarios, cumpleaños o momentos clave.",
      translations: {
        en: {
          name: "Special celebration",
          description:
            "Packages for anniversaries, birthdays or meaningful moments.",
        },
        fr: {
          name: "Celebration speciale",
          description:
            "Forfaits pour anniversaires, fetes ou moments importants.",
        },
        pt: {
          name: "Celebracao especial",
          description:
            "Pacotes para aniversarios, celebracoes ou momentos importantes.",
        },
        it: {
          name: "Celebrazione speciale",
          description:
            "Pacchetti per anniversari, compleanni o momenti importanti.",
        },
      },
      icon: "sparkles",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Cartagena completa",
      description: "Paquetes que combinan ciudad, mar y experiencias locales.",
      translations: {
        en: {
          name: "Complete Cartagena",
          description:
            "Packages combining the city, the sea and local experiences.",
        },
        fr: {
          name: "Cartagena complete",
          description:
            "Forfaits combinant la ville, la mer et les experiences locales.",
        },
        pt: {
          name: "Cartagena completa",
          description:
            "Pacotes que combinam cidade, mar e experiencias locais.",
        },
        it: {
          name: "Cartagena completa",
          description:
            "Pacchetti che combinano citta, mare ed esperienze locali.",
        },
      },
      icon: "map",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Romantico",
      description: "Paquetes con enfoque romantico y detalles personalizados.",
      translations: {
        en: {
          name: "Romantic",
          description: "Packages with a romantic focus and personalized details.",
        },
        fr: {
          name: "Romantique",
          description:
            "Forfaits avec une approche romantique et des details personnalises.",
        },
        pt: {
          name: "Romantico",
          description:
            "Pacotes com foco romantico e detalhes personalizados.",
        },
        it: {
          name: "Romantico",
          description:
            "Pacchetti con focus romantico e dettagli personalizzati.",
        },
      },
      icon: "heart",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Premium VIP",
      description: "Paquetes con mayor nivel de asistencia y servicios premium.",
      translations: {
        en: {
          name: "Premium VIP",
          description:
            "Packages with a higher level of assistance and premium services.",
        },
        fr: {
          name: "Premium VIP",
          description:
            "Forfaits avec un niveau superieur d'assistance et de services premium.",
        },
        pt: {
          name: "Premium VIP",
          description:
            "Pacotes com maior nivel de assistencia e servicos premium.",
        },
        it: {
          name: "Premium VIP",
          description:
            "Pacchetti con un livello superiore di assistenza e servizi premium.",
        },
      },
      icon: "gem",
      category: ProductFeatureCategory.SERVICE_LEVEL,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
  ];

  for (const feature of productFeatures) {
    await upsertProductFeature(feature);
  }

  const romanticPackage = await prisma.package.findUnique({
    where: { slug: "escapada-romantica-cartagena" },
  });
  const islandsPackage = await prisma.package.findUnique({
    where: { slug: "islas-ciudad-amurallada" },
  });
  const dinnerExperience = await prisma.experience.findUnique({
    where: { slug: "cena-romantica-cartagena" },
  });
  const cityTourExperience = await prisma.experience.findUnique({
    where: { slug: "city-tour-historico-premium" },
  });

  await linkDestinationProperty({
    destinationSlug: "cartagena",
    propertySlug: "villa-demo-centro-historico",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationExperience({
    destinationSlug: "cartagena",
    experienceSlug: "tour-privado-islas-del-rosario",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationExperience({
    destinationSlug: "cartagena",
    experienceSlug: "city-tour-historico-premium",
    sortOrder: 2,
    isFeatured: true,
  });
  await linkDestinationExperience({
    destinationSlug: "cartagena",
    experienceSlug: "cena-romantica-cartagena",
    sortOrder: 3,
  });
  await linkDestinationPackage({
    destinationSlug: "cartagena",
    packageSlug: "cartagena-premium-3-dias",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationPackage({
    destinationSlug: "cartagena",
    packageSlug: "islas-ciudad-amurallada",
    sortOrder: 2,
  });

  await linkDestinationProperty({
    destinationSlug: "centro-historico",
    propertySlug: "villa-demo-centro-historico",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationExperience({
    destinationSlug: "centro-historico",
    experienceSlug: "city-tour-historico-premium",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationExperience({
    destinationSlug: "centro-historico",
    experienceSlug: "cena-romantica-cartagena",
    sortOrder: 2,
  });
  await linkDestinationPackage({
    destinationSlug: "centro-historico",
    packageSlug: "cartagena-premium-3-dias",
    sortOrder: 1,
    isFeatured: true,
  });

  await linkDestinationExperience({
    destinationSlug: "islas-del-rosario",
    experienceSlug: "tour-privado-islas-del-rosario",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationPackage({
    destinationSlug: "islas-del-rosario",
    packageSlug: "islas-ciudad-amurallada",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationPackage({
    destinationSlug: "islas-del-rosario",
    packageSlug: "cartagena-premium-3-dias",
    sortOrder: 2,
  });

  await linkDestinationExperience({
    destinationSlug: "getsemani",
    experienceSlug: "city-tour-historico-premium",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationPackage({
    destinationSlug: "getsemani",
    packageSlug: "cartagena-premium-3-dias",
    sortOrder: 1,
  });

  await linkDestinationExperience({
    destinationSlug: "iglesias-de-cartagena",
    experienceSlug: "city-tour-historico-premium",
    sortOrder: 1,
    isFeatured: true,
  });
  await linkDestinationPackage({
    destinationSlug: "iglesias-de-cartagena",
    packageSlug: "cartagena-premium-3-dias",
    sortOrder: 1,
  });

  console.log("Relaciones SEO destino-producto demo creadas o actualizadas.");

  if (islandsPackage) {
    await upsertExtra({
      name: "CAMINATA",
      description: "Caminata guiada por playa como complemento del plan de islas.",
      translations: {
        en: {
          name: "Beach walk",
          description: "Guided beach walk as a complement to the island plan.",
        },
        fr: {
          name: "Promenade sur la plage",
          description:
            "Promenade guidee sur la plage en complement du plan des iles.",
        },
        pt: {
          name: "Caminhada na praia",
          description:
            "Caminhada guiada pela praia como complemento do plano de ilhas.",
        },
        it: {
          name: "Passeggiata in spiaggia",
          description:
            "Passeggiata guidata in spiaggia come complemento al piano delle isole.",
        },
      },
      price: 150000,
      packageId: islandsPackage.id,
    });
  }

  await assignFeature({
    featureName: "Piscina",
    productType: BookingType.PROPERTY,
    productId: demoProperty?.id,
  });
  await assignFeature({
    featureName: "Terraza privada",
    productType: BookingType.PROPERTY,
    productId: demoProperty?.id,
  });
  await assignFeature({
    featureName: "Vista al centro historico",
    productType: BookingType.PROPERTY,
    productId: demoProperty?.id,
  });
  await assignFeature({
    featureName: "Cocina equipada",
    productType: BookingType.PROPERTY,
    productId: demoProperty?.id,
  });

  await assignFeature({
    featureName: "Yate privado",
    productType: BookingType.EXPERIENCE,
    productId: demoExperience?.id,
  });
  await assignFeature({
    featureName: "Islas del Rosario",
    productType: BookingType.EXPERIENCE,
    productId: demoExperience?.id,
  });
  await assignFeature({
    featureName: "Fotografia",
    productType: BookingType.EXPERIENCE,
    productId: demoExperience?.id,
  });
  await assignFeature({
    featureName: "Gastronomia",
    productType: BookingType.EXPERIENCE,
    productId: dinnerExperience?.id,
  });
  await assignFeature({
    featureName: "Cultural",
    productType: BookingType.EXPERIENCE,
    productId: cityTourExperience?.id,
  });

  await assignFeature({
    featureName: "Cartagena completa",
    productType: BookingType.PACKAGE,
    productId: demoPackage?.id,
  });
  await assignFeature({
    featureName: "Premium VIP",
    productType: BookingType.PACKAGE,
    productId: demoPackage?.id,
  });
  await assignFeature({
    featureName: "Luna de miel",
    productType: BookingType.PACKAGE,
    productId: romanticPackage?.id,
  });
  await assignFeature({
    featureName: "Romantico",
    productType: BookingType.PACKAGE,
    productId: romanticPackage?.id,
  });
  await assignFeature({
    featureName: "Familiar",
    productType: BookingType.PACKAGE,
    productId: islandsPackage?.id,
  });

  console.log("Caracteristicas dinamicas demo creadas y asignadas por tipo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
