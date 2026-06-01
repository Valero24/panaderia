# Documentacion tecnica

## Arquitectura

El sistema esta dividido en dos aplicaciones:

- `frontend`: Next.js con rutas publicas y panel admin.
- `backend`: NestJS con API REST, Prisma, PostgreSQL, autenticacion y PDF.

La base de datos es PostgreSQL y las migraciones se gestionan con Prisma.

## Estructura de carpetas

```text
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    auth/
    pre-reservations/
    bookings/
    properties/
    experiences/
    packages/
    extras/
    dashboard/
    operational-logs/
    invoice/
    notifications/
    contact/
    users/

frontend/
  app/
    admin/
    alojamientos/
    experiencias/
    paquetes/
    checkout/
    contacto/
    nosotros/
    staff-login/
  components/
  lib/
  i18n/
```

## Modulos backend principales

- `auth`: login, JWT, guards y roles.
- `pre-reservations`: solicitud asistida y flujo operativo.
- `bookings`: reservas confirmadas.
- `properties`: alojamientos.
- `experiences`: experiencias.
- `packages`: paquetes y componentes.
- `extras`: servicios premium.
- `dashboard`: resumen operativo por rol.
- `operational-logs`: historial operativo.
- `invoice`: generacion de PDF.
- `notifications`: correo/WhatsApp manual o simulado.
- `contact`: solicitudes de contacto.
- `users`: gestion de asesores.

## Modulos frontend principales

- Sitio publico: home, listados, detalles, checkout, contacto, nosotros.
- Admin: dashboard, reservas, productos, asesores, contactos, logs.
- i18n publico: traducciones de interfaz para varios idiomas.
- Componentes UI: cards, tablas, badges, formularios, galerias.

## Base de datos

Modelos clave:

- `User`
- `Property`
- `Experience`
- `Package`
- `PackageComponent`
- `ExtraService`
- `PreReservation`
- `PreReservationItem`
- `Booking`
- `Payment`
- `AvailabilityBlock`
- `ContactRequest`
- `OperationalNotification`
- `AuditLog`
- `CompanySettings`

## Migraciones

Las migraciones viven en:

```text
backend/prisma/migrations
```

Comandos:

```bash
npx prisma migrate dev
npm run prisma:migrate:deploy
npx prisma migrate status
```

## Seed

El seed vive en:

```text
backend/prisma/seed.ts
```

Crea usuarios demo, alojamiento demo, experiencias, paquetes y servicios premium.

Comando:

```bash
npm run prisma:seed
```

## Autenticacion y roles

El backend usa JWT. Las rutas protegidas requieren token y se validan con guards globales. Los permisos se declaran con `@Roles(...)`.

Roles operativos:

- `SUPERADMIN`
- `ADVISOR`

Existe `ADMIN` por compatibilidad heredada.

## API general

Endpoints principales:

- `POST /auth/login`
- `GET /properties`
- `GET /experiences`
- `GET /packages`
- `POST /pre-reservations`
- `GET /pre-reservations`
- `PATCH /pre-reservations/:id/assign-me`
- `PATCH /pre-reservations/:id/status/available`
- `POST /pre-reservations/:id/generate-booking`
- `GET /dashboard/summary`
- `GET /operational-logs`
- `POST /contact`

## Archivos importantes

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/pre-reservations/pre-reservations.service.ts`
- `backend/src/invoice/invoice.service.ts`
- `backend/src/dashboard/dashboard.service.ts`
- `backend/src/common/audit.service.ts`
- `frontend/app/admin/page.tsx`
- `frontend/app/admin/reservas/page.tsx`
- `frontend/app/checkout/[id]/page.tsx`

## Configuracion de entorno

Ejemplos:

- `.env.demo.example`
- `.env.deploy.example`
- `backend/.env.production.example`
- `frontend/.env.production.example`
- `env/backend.staging.env.example`

No se deben versionar `.env` reales.
