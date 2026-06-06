import {
  BookingType,
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
        "Alojamiento demo para validar el flujo asistido sin datos reales.",
      translations: {
        en: {
          title: "Demo villa in the Historic Center",
          description:
            "Demo accommodation for validating the assisted booking flow without real inventory.",
          area: "Historic Center",
          cancellationPolicy:
            "Reservation subject to manual advisor validation during the demo.",
        },
        fr: {
          title: "Villa demo dans le centre historique",
          description:
            "Hebergement demo pour valider le flux de reservation assistee sans inventaire reel.",
          area: "Centre historique",
          address: "Adresse demo",
          cancellationPolicy:
            "Reservation soumise a la validation manuelle d'un conseiller pendant la demo.",
        },
        pt: {
          title: "Villa demo no Centro Historico",
          description:
            "Acomodacao demo para validar o fluxo de reserva assistida sem inventario real.",
          area: "Centro Historico",
          address: "Endereco demo",
          cancellationPolicy:
            "Reserva sujeita a validacao manual por assessor durante a demo.",
        },
        it: {
          title: "Villa demo nel Centro Storico",
          description:
            "Alloggio demo per validare il flusso di prenotazione assistita senza inventario reale.",
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
