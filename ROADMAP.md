# Roadmap

## Fase 1 - Demo publica estable

Objetivo:

Mostrar el flujo completo sin costos ni integraciones reales.

Entregables:

- sitio publico estable;
- checkout asistido;
- admin por roles;
- reserva manual;
- PDF;
- dashboard;
- logs;
- documentacion demo.

Riesgos:

- servicios gratuitos pueden dormir;
- PDFs pueden no persistir en hosting sin storage;
- credenciales demo deben protegerse.

Dependencias:

- base PostgreSQL free tier;
- deploy frontend/backend.

## Fase 2 - UX admin y seguridad

Objetivo:

Mejorar operacion diaria del equipo.

Entregables:

- filtros avanzados;
- busqueda;
- mejoras moviles admin;
- auditoria ampliada;
- permisos mas granulares;
- manejo de errores mas visible.

Riesgos:

- exceso de opciones puede complicar la operacion.

Dependencias:

- feedback real de asesores.

## Fase 3 - Factus sandbox

Objetivo:

Validar facturacion electronica sin produccion.

Entregables:

- variables Factus sandbox;
- emision sandbox;
- guardado de respuesta;
- estado fiscal;
- errores/reintentos.

Riesgos:

- requisitos tributarios incompletos;
- diferencia entre comprobante interno y factura legal.

Dependencias:

- cuenta Factus sandbox;
- datos legales completos.

## Fase 4 - Wompi sandbox

Objetivo:

Probar pagos reales en ambiente sandbox.

Entregables:

- link de pago sandbox;
- webhook validado;
- idempotencia;
- actualizacion de payment;
- paso seguro a reserva confirmada.

Riesgos:

- webhooks duplicados;
- conciliacion incompleta;
- estados de pago no contemplados.

Dependencias:

- credenciales sandbox;
- URL publica backend.

## Fase 5 - iCal/Airbnb real

Objetivo:

Validar disponibilidad real de alojamientos.

Entregables:

- lectura iCal;
- conflictos;
- cache o sincronizacion;
- mensajes claros para asesor.

Riesgos:

- calendarios externos lentos o caidos;
- zonas horarias;
- cruces de fechas mal interpretados.

Dependencias:

- URLs iCal reales por propiedad.

## Fase 6 - Produccion

Objetivo:

Operar con clientes reales.

Entregables:

- dominios;
- SSL;
- backups;
- logs;
- monitoreo;
- secretos seguros;
- pagos/facturacion si aplica;
- politicas legales.

Riesgos:

- datos personales;
- pagos;
- soporte operativo;
- disponibilidad de infraestructura.

Dependencias:

- QA end-to-end;
- aprobacion comercial/legal;
- plan de soporte.
