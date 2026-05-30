import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
