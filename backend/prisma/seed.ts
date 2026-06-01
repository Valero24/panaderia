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
      icon: data.icon || null,
      category: data.category,
      appliesTo: data.appliesTo,
      active: true,
    },
    create: {
      name: data.name,
      slug,
      description: data.description || null,
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
        price: data.price,
        active: true,
      },
    });
  }

  return prisma.extraService.create({
    data: {
      ...data,
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
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
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
      demoModeEnabled: true,
      realPaymentsEnabled: false,
      realAvailabilityEnabled: false,
      whatsappNotificationsEnabled: false,
      footerText:
        "Cartagena Tailored Travel - Viajes premium con atencion personalizada.",
      invoiceNotes:
        "Comprobante interno de reserva. No constituye factura electronica DIAN.",
    },
  });

  console.log("Configuracion demo creada o actualizada.");

  const demoProperties = [
    {
      title: "Villa demo en Centro Historico",
      slug: "villa-demo-centro-historico",
      description:
        "Alojamiento demo para validar el flujo asistido sin datos reales.",
      city: "Cartagena",
      area: "Centro Historico",
      address: "Direccion demo",
      pricePerNight: 980000,
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
      location: "Islas del Rosario, Cartagena",
      duration: "Dia completo",
      maxGuests: 10,
      basePrice: 1800000,
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
      location: "Cartagena historica",
      duration: "3 a 4 horas",
      maxGuests: 2,
      basePrice: 950000,
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
      location: "Centro historico, Cartagena",
      duration: "4 horas",
      maxGuests: 8,
      basePrice: 650000,
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
      duration: "3 dias / 2 noches",
      location: "Cartagena, Colombia",
      maxGuests: 2,
      basePrice: 3800000,
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
      duration: "3 dias",
      location: "Cartagena historica e islas",
      maxGuests: 6,
      basePrice: 5200000,
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
      duration: "2 dias",
      location: "Islas del Rosario y Centro historico",
      maxGuests: 8,
      basePrice: 4500000,
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

  if (demoProperty) {
    await upsertExtra({
      name: "Transporte privado aeropuerto",
      description:
        "Traslado privado coordinado por el equipo de atencion para llegada o salida.",
      price: 180000,
      propertyId: demoProperty.id,
    });
  }

  if (demoExperience) {
    await upsertExtra({
      name: "Fotografia profesional",
      description:
        "Registro fotografico basico de la experiencia para recuerdos del viaje.",
      price: 450000,
      experienceId: demoExperience.id,
    });
  }

  if (demoPackage) {
    await upsertExtra({
      name: "Decoracion especial",
      description:
        "Ambientacion personalizada para celebraciones, aniversarios o viajes especiales.",
      price: 520000,
      packageId: demoPackage.id,
    });
  }

  console.log("Servicios premium demo creados o actualizados.");

  const productFeatures = [
    {
      name: "Piscina",
      description: "Alojamientos con piscina privada o compartida.",
      icon: "pool",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Jacuzzi",
      description: "Alojamientos con jacuzzi o zona humeda premium.",
      icon: "waves",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Frente al mar",
      description: "Alojamientos ubicados frente al mar o muy cerca de playa.",
      icon: "water",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Vista al centro historico",
      description: "Alojamientos con vista o cercania al centro historico.",
      icon: "landmark",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Terraza privada",
      description: "Espacios exteriores privados para descansar o compartir.",
      icon: "terrace",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Cocina equipada",
      description: "Alojamientos con cocina funcional para estadias flexibles.",
      icon: "chef-hat",
      category: ProductFeatureCategory.AMENITY,
      appliesTo: ProductFeatureAppliesTo.PROPERTY,
    },
    {
      name: "Yate privado",
      description: "Experiencias nauticas con embarcacion privada.",
      icon: "ship",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Islas del Rosario",
      description: "Experiencias enfocadas en Islas del Rosario.",
      icon: "island",
      category: ProductFeatureCategory.LOCATION_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Gastronomia",
      description: "Experiencias culinarias o de cena especial.",
      icon: "utensils",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Vida nocturna",
      description: "Planes para disfrutar Cartagena de noche.",
      icon: "music",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Cultural",
      description: "Experiencias historicas, patrimoniales o locales.",
      icon: "landmark",
      category: ProductFeatureCategory.EXPERIENCE_STYLE,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Fotografia",
      description: "Experiencias con enfoque fotografico o registro visual.",
      icon: "camera",
      category: ProductFeatureCategory.SERVICE_LEVEL,
      appliesTo: ProductFeatureAppliesTo.EXPERIENCE,
    },
    {
      name: "Luna de miel",
      description: "Paquetes pensados para viajes romanticos y celebraciones.",
      icon: "heart",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Familiar",
      description: "Paquetes adecuados para familias o grupos cercanos.",
      icon: "users",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Celebracion especial",
      description: "Paquetes para aniversarios, cumpleaños o momentos clave.",
      icon: "sparkles",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Cartagena completa",
      description: "Paquetes que combinan ciudad, mar y experiencias locales.",
      icon: "map",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Romantico",
      description: "Paquetes con enfoque romantico y detalles personalizados.",
      icon: "heart",
      category: ProductFeatureCategory.TRAVEL_TYPE,
      appliesTo: ProductFeatureAppliesTo.PACKAGE,
    },
    {
      name: "Premium VIP",
      description: "Paquetes con mayor nivel de asistencia y servicios premium.",
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
