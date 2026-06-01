# Flujo de reservas asistidas

## Estados de PreReservation

- `PENDING_ADVISOR`: solicitud creada por cliente, sin asesor asignado.
- `ASSIGNED`: asesor tomo la solicitud.
- `VALIDATING`: asesor esta validando disponibilidad y detalles.
- `AVAILABLE`: asesor marco la solicitud como disponible.
- `UNAVAILABLE`: asesor marco la solicitud como no disponible.
- `PAYMENT_PENDING`: listo para pago futuro; en demo no genera pago real.
- `PAID`: pago aprobado en flujo futuro.
- `CONFIRMED`: reserva confirmada con booking y codigo RES.
- `CANCELLED`: solicitud cancelada.

## Cuando se crea PreReservation

Se crea cuando el cliente envia el checkout asistido. Incluye:

- datos del cliente;
- producto;
- fechas;
- huespedes;
- servicios premium;
- metodo de pago preferido;
- total estimado;
- estado `PENDING_ADVISOR`.

No crea pago ni booking.

## Cuando se crea Booking

Se crea cuando el asesor o superadmin usa la accion "Generar reserva". Requiere una solicitud gestionable, normalmente `AVAILABLE` o `PAYMENT_PENDING`.

El sistema:

1. valida permisos;
2. evita duplicados por `preReservationId`;
3. crea `Booking`;
4. genera `reservationCode`;
5. crea bloqueo interno de disponibilidad;
6. marca la solicitud como `CONFIRMED`;
7. genera PDF.

## Cuando se genera PDF

El PDF se genera despues de crear el booking manual. Se guarda la ruta en `Booking.invoicePath`.

## Que hace el asesor

- toma solicitud;
- valida manualmente;
- ajusta cotizacion;
- marca disponible/no disponible;
- genera reserva;
- descarga comprobante.

## Que hace el superadmin

- ve todo;
- reasigna;
- cancela;
- archiva;
- genera reserva si hace falta;
- revisa logs.

## Modo demo

En demo:

- `ENABLE_REAL_AVAILABILITY=false`: no se consulta iCal/Airbnb.
- `ENABLE_REAL_PAYMENTS=false`: no se genera link real Wompi.
- `DIAN_MODE=mock`: no se emite factura DIAN real.
- WhatsApp automatico esta desactivado o simulado.

## Pendiente para pagos reales

Para produccion futura se debe:

- activar sandbox Wompi;
- validar webhook;
- pasar pago aprobado a booking final;
- conectar Factus/DIAN si aplica;
- definir politicas de cancelacion, reembolsos y conciliacion.
