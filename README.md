# Cartagena Tailored Travel

Plataforma web de viajes premium en Cartagena orientada a reservas asistidas por asesores. No funciona como un Airbnb automatico: el cliente envia una solicitud, el equipo valida disponibilidad y detalles, y luego un asesor confirma la reserva manualmente.

## Problema que resuelve

Los viajes premium requieren validacion humana, coordinacion de detalles, servicios adicionales y control operativo. El sistema centraliza:

- productos turisticos: alojamientos, experiencias y paquetes;
- solicitudes asistidas;
- gestion de asesores;
- confirmacion manual de reservas;
- comprobantes PDF;
- dashboard operativo;
- logs e historial;
- contactos comerciales.

## Modelo de negocio

Cartagena Tailored Travel opera como una plataforma de atencion personalizada para viajeros que quieren alojamientos, experiencias y paquetes premium en Cartagena. El cliente no paga inmediatamente desde el checkout. Primero envia una solicitud; un asesor la toma, valida disponibilidad, ajusta cotizacion y genera la reserva.

## Stack tecnologico

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: NestJS, TypeScript.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Autenticacion: JWT.
- PDF: generacion backend con service de invoice.
- Deploy demo sugerido: Vercel + Render + Supabase/Neon.

## Estructura general

```text
frontend/   Aplicacion publica y panel administrativo.
backend/    API NestJS, Prisma, PDF, auth, reservas, productos.
env/        Ejemplos de variables de entorno.
ops/        Scripts y ejemplos operativos.
backups/    Carpeta local para respaldos.
```

## Estado actual

Listo:

- sitio publico;
- alojamientos;
- experiencias;
- paquetes;
- pagina nosotros y contacto;
- checkout asistido;
- panel admin;
- roles SUPERADMIN y ADVISOR;
- reservas manuales;
- codigo RES;
- PDF/comprobante;
- dashboard operativo;
- logs/historial;
- modo demo.

Simulado o desactivado en demo:

- pagos reales Wompi/Stripe;
- Factus/DIAN real;
- Airbnb/iCal real;
- WhatsApp automatico real.

## Modo demo

La demo usa:

```env
ENABLE_REAL_PAYMENTS=false
ENABLE_REAL_AVAILABILITY=false
WOMPI_ENABLED=false
FACTUS_ENABLED=false
DIAN_MODE=mock
ENABLE_WHATSAPP_NOTIFICATIONS=false
```

Documentacion relacionada:

- [README_DEMO.md](README_DEMO.md)
- [DEPLOY_DEMO.md](DEPLOY_DEMO.md)

## Usuarios demo

SUPERADMIN:

```text
superadmin@test.com / 123456
```

ADVISOR:

```text
advisor@test.com / 123456
```

Estas credenciales son solo para demo. No deben usarse en produccion.

## Comandos principales

Backend:

```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
cd backend && npm run build
cd frontend && npm run build
```

## Rutas principales

Publicas:

- `/`
- `/alojamientos`
- `/experiencias`
- `/paquetes`
- `/nosotros`
- `/contacto`
- `/checkout/[id]`

Internas:

- `/staff-login`
- `/admin`
- `/admin/reservas`
- `/admin/alojamientos`
- `/admin/experiencias`
- `/admin/paquetes`
- `/admin/asesores`
- `/admin/contactos`
- `/admin/logs`

## Documentacion del proyecto

- [DOCUMENTACION_FUNCIONAL.md](DOCUMENTACION_FUNCIONAL.md)
- [DOCUMENTACION_TECNICA.md](DOCUMENTACION_TECNICA.md)
- [ROLES_Y_PERMISOS.md](ROLES_Y_PERMISOS.md)
- [FLUJO_RESERVAS.md](FLUJO_RESERVAS.md)
- [VARIABLES_ENTORNO.md](VARIABLES_ENTORNO.md)
- [FACTURA_PDF.md](FACTURA_PDF.md)
- [ROADMAP.md](ROADMAP.md)
- [CHECKLIST_MVP.md](CHECKLIST_MVP.md)

## Advertencias de seguridad

- No subir archivos `.env` reales.
- No incluir tokens, claves privadas ni connection strings reales.
- Cambiar `JWT_SECRET` en cualquier demo publica.
- Cambiar o desactivar usuarios demo antes de produccion.
- Mantener pagos reales desactivados hasta terminar pruebas sandbox.
- Mantener Factus/DIAN real desactivado hasta completar integracion oficial.
