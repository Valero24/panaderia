# Deploy demo gratis - Cartagena Tailored Travel

Esta guia prepara una demo publica temporal usando servicios gratuitos o con free tier. No es una guia de produccion.

## Arquitectura recomendada

- Frontend: Vercel.
- Backend: Render Web Service.
- Base de datos: Supabase PostgreSQL o Neon PostgreSQL.
- Repositorio: GitHub.

Alternativa: Railway trial para backend/base de datos si prefieres una plataforma integrada.

## 1. Subir proyecto a GitHub

1. Crear repositorio privado o publico en GitHub.
2. Confirmar que no exista ningun `.env` real versionado.
3. Confirmar que `.gitignore` esta activo.
4. Subir el proyecto.

## 2. Crear PostgreSQL gratis

Opcion Supabase:

1. Crear proyecto en Supabase.
2. Ir a Project Settings > Database.
3. Copiar connection string PostgreSQL.
4. Usar modo pooled o direct segun indique Supabase.
5. Asegurar que incluya `?schema=public`.

Opcion Neon:

1. Crear proyecto en Neon.
2. Crear database.
3. Copiar connection string.
4. Usar SSL si Neon lo exige.

Variable:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
```

## 3. Desplegar backend en Render

Crear un Web Service:

- Root directory: `backend`
- Build command:

```bash
npm install && npm run build && npm run prisma:migrate:deploy && npm run prisma:seed
```

- Start command:

```bash
npm run start:prod
```

Variables de entorno backend:

```env
NODE_ENV=production
APP_ENV=demo
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/cartagena_demo?schema=public
JWT_SECRET=CHANGE_ME_DEMO_32_PLUS_CHARACTERS
CORS_ORIGIN=https://your-demo-frontend.vercel.app
FRONTEND_URL=https://your-demo-frontend.vercel.app
ENABLE_REAL_PAYMENTS=false
ENABLE_REAL_AVAILABILITY=false
WOMPI_ENABLED=false
FACTUS_ENABLED=false
DIAN_MODE=mock
ENABLE_WHATSAPP_NOTIFICATIONS=false
WHATSAPP_NOTIFICATION_NUMBERS=573187350654,573246100431
WHATSAPP_PROVIDER=simulated
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Correo opcional:

```env
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM="Cartagena Tailored Travel <demo@example.com>"
```

Despues del deploy, copiar la URL publica del backend. Ejemplo:

```text
https://cartagena-demo-api.onrender.com
```

## 4. Desplegar frontend en Vercel

Crear proyecto desde el mismo repositorio:

- Root directory: `frontend`
- Build command:

```bash
npm run build
```

- Output: automatico para Next.js.

Variables frontend:

```env
NEXT_PUBLIC_API_URL=https://cartagena-demo-api.onrender.com
NEXT_PUBLIC_ENABLE_REAL_PAYMENTS=false
NEXT_PUBLIC_ENABLE_REAL_AVAILABILITY=false
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_WHATSAPP_NUMBER=573187350654
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/cartagenatailoredtravel
NEXT_PUBLIC_TIKTOK_URL=https://www.tiktok.com/@cartagenatailoredtravel
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/cartagenatailoredtravel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Cuando Vercel entregue la URL del frontend, volver a Render y actualizar:

```env
CORS_ORIGIN=https://your-demo-frontend.vercel.app
FRONTEND_URL=https://your-demo-frontend.vercel.app
```

Redeploy backend despues de cambiar CORS.

## 5. Migraciones y seed

En Render el build command recomendado ejecuta:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

Si necesitas ejecutarlo manualmente desde Render Shell:

```bash
cd backend
npm run prisma:migrate:deploy
npm run prisma:seed
```

## 6. Prueba completa post deploy

1. Abrir frontend.
2. Verificar home, alojamientos, experiencias, paquetes y contacto.
3. Entrar a `/staff-login`.
4. Login SUPERADMIN:
   - `superadmin@test.com / 123456`
5. Login ADVISOR:
   - `advisor@test.com / 123456`
6. Crear solicitud de alojamiento.
7. Crear solicitud de experiencia.
8. Crear solicitud de paquete.
9. Asesor toma una solicitud.
10. Asesor marca disponible.
11. Asesor genera reserva.
12. Ver codigo `RES`.
13. Ver/descargar PDF.
14. SUPERADMIN revisa dashboard.
15. SUPERADMIN revisa historial.
16. Contacto guarda solicitud.

## 7. Checklist de seguridad demo

- [ ] `JWT_SECRET` cambiado.
- [ ] No hay `.env` reales en GitHub.
- [ ] `DATABASE_URL` solo existe en el hosting.
- [ ] `ENABLE_REAL_PAYMENTS=false`.
- [ ] `ENABLE_REAL_AVAILABILITY=false`.
- [ ] `WOMPI_ENABLED=false`.
- [ ] `FACTUS_ENABLED=false`.
- [ ] `DIAN_MODE=mock`.
- [ ] `ENABLE_WHATSAPP_NOTIFICATIONS=false`.
- [ ] Contraseñas demo no se usan en produccion.
- [ ] CORS solo apunta al frontend demo.

## 8. Limitaciones esperadas

- Render free tier puede dormir el backend cuando no hay trafico.
- La primera carga puede tardar unos segundos.
- El envio de correos no ocurre si SMTP esta vacio.
- WhatsApp queda simulado/manual.
- Los PDFs se generan en el filesystem del backend; en free tier pueden no persistir si el servicio reinicia, salvo que se configure almacenamiento persistente.
