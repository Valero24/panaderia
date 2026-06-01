# Cartagena Tailored Travel - Demo publica

Esta demo es una version temporal y funcional de Cartagena Tailored Travel para mostrar el flujo comercial de reservas asistidas sin activar costos ni integraciones reales.

No es produccion. No debe usarse con pagos reales, datos sensibles reales, credenciales reales ni operacion comercial definitiva.

## Que funciona en la demo

- Sitio publico con home, alojamientos, experiencias, paquetes, nosotros y contacto.
- Checkout asistido para alojamientos, experiencias y paquetes.
- Creacion de `PreReservation` en estado `PENDING_ADVISOR`.
- Panel interno para `SUPERADMIN` y `ADVISOR`.
- Asesor toma solicitudes, marca disponibilidad manual y genera reserva.
- Creacion de `Booking` confirmado.
- Codigo de reserva tipo `RES-2026-000001`.
- PDF/comprobante de reserva.
- Dashboard operativo por rol.
- Historial/logs operativos.
- Contactos/leads.
- Servicios premium demo.

## Que esta simulado o desactivado

- Disponibilidad real Airbnb/iCal: desactivada.
- Pagos reales Wompi/Stripe: desactivados.
- Factus/DIAN real: desactivado, modo mock/documental.
- WhatsApp automatico real: desactivado o simulado.
- Correo: opcional, solo si se configura SMTP de prueba.

Variables principales:

```env
ENABLE_REAL_PAYMENTS=false
ENABLE_REAL_AVAILABILITY=false
WOMPI_ENABLED=false
FACTUS_ENABLED=false
DIAN_MODE=mock
ENABLE_WHATSAPP_NOTIFICATIONS=false
```

## Usuarios demo

SUPERADMIN:

```text
superadmin@test.com / 123456
```

ADVISOR:

```text
advisor@test.com / 123456
```

Tambien existe un usuario `ADMIN` heredado:

```text
admin@test.com / 123456
```

Para produccion estas credenciales deben cambiarse o deshabilitarse.

## Levantar localmente

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

URLs locales usuales:

- Frontend: `http://localhost:3001` o el puerto que asigne Next.
- Backend: `http://localhost:3000`.
- Login interno: `/staff-login`.

## Datos demo incluidos en seed

El seed crea o actualiza:

- Usuarios base: superadmin, admin y advisor.
- Un alojamiento demo.
- Experiencias demo.
- Paquetes demo.
- Servicios premium demo para alojamiento, experiencia y paquete.

El seed usa `upsert` cuando hay `slug` o busqueda controlada para extras, por lo que es adecuado para demo. Aun asi, no lo ejecutes contra una base productiva con datos reales sin revisar antes.

## Flujo recomendado para mostrar

1. Entrar al sitio publico.
2. Abrir un alojamiento, experiencia o paquete.
3. Enviar solicitud desde checkout.
4. Entrar como `advisor@test.com`.
5. Tomar la solicitud.
6. Marcar disponibilidad manual.
7. Generar reserva.
8. Ver codigo `RES`.
9. Ver/descargar PDF.
10. Entrar como `superadmin@test.com`.
11. Revisar dashboard, reservas, contactos e historial.

## Seguridad demo

- No subas `.env` reales a GitHub.
- Cambia `JWT_SECRET` incluso para demo publica.
- No uses claves reales de Wompi, Factus, WhatsApp ni SMTP productivo.
- No uses contrasenas demo en produccion.
- No compartas `DATABASE_URL`.
- Mantener pagos y disponibilidad real desactivados.

## Checklist demo

- [ ] Frontend carga.
- [ ] Backend responde.
- [ ] Login SUPERADMIN funciona.
- [ ] Login ADVISOR funciona.
- [ ] Cliente solicita alojamiento.
- [ ] Cliente solicita experiencia.
- [ ] Cliente solicita paquete.
- [ ] Asesor toma solicitud.
- [ ] Asesor marca disponible.
- [ ] Asesor genera reserva.
- [ ] PDF descarga.
- [ ] Logs registran eventos.
- [ ] Dashboard carga por rol.
- [ ] Contacto guarda lead.
- [ ] Wompi real esta desactivado.
- [ ] Factus/DIAN real esta desactivado.
- [ ] iCal/Airbnb real esta desactivado.
