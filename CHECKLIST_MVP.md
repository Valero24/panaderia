# Checklist MVP

## Listo

- [x] Sitio publico.
- [x] Navbar publico sin acceso admin visible.
- [x] Ruta interna `/staff-login`.
- [x] Alojamientos.
- [x] Experiencias.
- [x] Paquetes.
- [x] Servicios premium.
- [x] Contacto/leads.
- [x] Checkout asistido.
- [x] `PreReservation`.
- [x] Roles `SUPERADMIN` y `ADVISOR`.
- [x] Panel administrativo.
- [x] Asesor toma solicitud.
- [x] Estados operativos basicos.
- [x] Confirmacion manual.
- [x] `Booking` confirmado.
- [x] Codigo RES.
- [x] PDF/comprobante.
- [x] Dashboard por rol.
- [x] Logs/historial.
- [x] Modo demo.
- [x] Documentacion demo.

## Pendiente

- [ ] QA final en entorno demo publico.
- [ ] Revisar persistencia de PDFs en hosting gratuito.
- [ ] Validar responsive admin con usuarios reales.
- [ ] Mejorar busqueda y filtros operativos.
- [ ] Politicas legales finales.
- [ ] Textos comerciales finales aprobados por marca.

## No requerido en demo

- [ ] Pago real Wompi.
- [ ] Factus/DIAN real.
- [ ] iCal/Airbnb real.
- [ ] WhatsApp Business API real.
- [ ] Correo transaccional productivo.
- [ ] Backoffice contable.
- [ ] Conciliacion bancaria.
- [ ] Reembolsos.

## Requerido antes de produccion

### Seguridad

- [ ] Cambiar usuarios demo.
- [ ] Cambiar `JWT_SECRET`.
- [ ] Validar CORS por dominio real.
- [ ] Revisar rate limits.
- [ ] Revisar exposicion de datos personales.
- [ ] Revisar permisos por rol.

### Infraestructura

- [ ] Dominio frontend.
- [ ] Dominio backend.
- [ ] SSL.
- [ ] Backups automaticos.
- [ ] Restore probado.
- [ ] Logs persistentes.
- [ ] Monitoreo basico.
- [ ] Storage persistente para PDFs.

### Reservas

- [ ] QA de flujo alojamiento.
- [ ] QA de flujo experiencia.
- [ ] QA de flujo paquete.
- [ ] Validar cancelaciones.
- [ ] Validar archivos PDF.
- [ ] Validar historial.

### Pagos

- [ ] Wompi sandbox.
- [ ] Webhook sandbox.
- [ ] Idempotencia webhook.
- [ ] Estados rechazados/pendientes.
- [ ] Conciliacion basica.

### Facturacion

- [ ] Factus sandbox.
- [ ] Datos legales completos.
- [ ] Resolucion/numeracion si aplica.
- [ ] Impuestos detallados.
- [ ] Manejo de errores.

### Disponibilidad

- [ ] URLs iCal reales.
- [ ] Pruebas de conflictos.
- [ ] Estrategia si Airbnb/iCal falla.
- [ ] Mensajes claros para asesor.
