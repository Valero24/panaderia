# Variables de entorno

Esta guia describe variables esperadas para demo y produccion futura. No contiene secretos reales.

## Backend

| Variable | Uso | Demo |
| --- | --- | --- |
| `NODE_ENV` | Entorno Node | `production` |
| `APP_ENV` | Identificador interno | `demo` |
| `PORT` | Puerto backend | `3000` |
| `DATABASE_URL` | Conexion PostgreSQL | Requerida |
| `JWT_SECRET` | Firma JWT | Requerida, cambiar siempre |
| `CORS_ORIGIN` | Dominio frontend permitido | URL demo frontend |
| `FRONTEND_URL` | URL publica frontend | URL demo frontend |

## Flags demo

| Variable | Valor demo | Descripcion |
| --- | --- | --- |
| `ENABLE_REAL_PAYMENTS` | `false` | No activa pagos reales |
| `ENABLE_REAL_AVAILABILITY` | `false` | No consulta iCal/Airbnb |
| `WOMPI_ENABLED` | `false` | Wompi desactivado |
| `FACTUS_ENABLED` | `false` | Factus desactivado |
| `DIAN_MODE` | `mock` | Modo visual/documental |
| `ENABLE_WHATSAPP_NOTIFICATIONS` | `false` | No envia WhatsApp real |

## Wompi

En demo deben quedar vacias o desactivadas:

```env
WOMPI_ENABLED=false
WOMPI_BASE_URL=
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
```

Para sandbox futuro se deben usar credenciales sandbox, nunca produccion.

## Factus / DIAN

En demo:

```env
FACTUS_ENABLED=false
DIAN_MODE=mock
FACTUS_API_URL=
FACTUS_API_TOKEN=
```

La factura PDF actual es un comprobante interno, no factura electronica DIAN.

## WhatsApp

En demo:

```env
WHATSAPP_PROVIDER=simulated
ENABLE_WHATSAPP_NOTIFICATIONS=false
WHATSAPP_NOTIFICATION_NUMBERS=573187350654,573246100431
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
WHATSAPP_FROM_NUMBER=
```

## Correo

Correo es opcional en demo. Si no se configura, el sistema no debe romper el flujo.

```env
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM="Cartagena Tailored Travel <demo@example.com>"
```

## Frontend

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL publica del backend |
| `NEXT_PUBLIC_ENABLE_REAL_PAYMENTS` | Control UI de pagos reales |
| `NEXT_PUBLIC_ENABLE_REAL_AVAILABILITY` | Control UI disponibilidad real |
| `NEXT_PUBLIC_GA_ID` | Google Analytics opcional |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel opcional |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Numero publico de contacto |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Link social |
| `NEXT_PUBLIC_TIKTOK_URL` | Link social |
| `NEXT_PUBLIC_FACEBOOK_URL` | Link social |

## Archivos ejemplo

- `.env.demo.example`
- `.env.deploy.example`
- `backend/.env.production.example`
- `frontend/.env.production.example`
- `env/backend.staging.env.example`

## Reglas

- No subir `.env` reales.
- No usar secretos reales en documentos.
- Cambiar `JWT_SECRET` en cualquier entorno publico.
- No activar pagos reales sin pruebas sandbox.
- No activar DIAN real sin validacion legal y tecnica.
