# Documentacion funcional

## Que es Cartagena Tailored Travel

Cartagena Tailored Travel es una plataforma de viajes premium para Cartagena. Permite mostrar alojamientos, experiencias y paquetes, recibir solicitudes de clientes y gestionarlas con atencion humana antes de confirmar la reserva.

## Solicitud vs reserva

Una solicitud es una `PreReservation`. Se crea cuando el cliente llena el checkout y pide validacion.

Una reserva es un `Booking`. Se crea cuando un asesor o superadmin confirma manualmente la solicitud y el sistema genera un codigo RES.

## Flujo del cliente

1. Entra al sitio publico.
2. Explora alojamientos, experiencias o paquetes.
3. Selecciona producto y servicios premium opcionales.
4. Completa datos personales, fechas, huespedes y metodo de pago preferido.
5. Envia solicitud.
6. Recibe confirmacion visual de que un asesor revisara el caso.

El cliente no paga inmediatamente en modo demo.

## Flujo del asesor

1. Entra por `/staff-login`.
2. Ve solicitudes pendientes o asignadas.
3. Toma una solicitud.
4. Marca disponibilidad manualmente.
5. Ajusta cotizacion si aplica.
6. Genera reserva manual.
7. Visualiza codigo RES y PDF.
8. Puede enviar comprobante manual por correo o WhatsApp si esta configurado.

## Flujo del superadmin

El superadmin tiene control global:

- ve dashboard operativo;
- gestiona productos;
- gestiona asesores;
- ve contactos;
- ve logs;
- cancela o archiva registros;
- revisa reservas confirmadas.

## Productos

### Alojamientos

Propiedades disponibles para solicitud asistida. Incluyen precio por noche, capacidad, habitaciones, banos, ubicacion, galeria multimedia y servicios premium.

### Experiencias

Actividades premium como tours, cenas o recorridos. Pueden reservarse desde checkout asistido y tener servicios premium.

### Paquetes

Productos comerciales que agrupan componentes descriptivos. Cada paquete puede explicar lo que el cliente vivira, que incluye, que no incluye, condiciones y recomendaciones.

## Servicios premium

Extras opcionales asociados a alojamientos, experiencias o paquetes. El cliente puede seleccionarlos y el asesor puede ajustar la cotizacion.

## Checkout asistido

El checkout crea una `PreReservation` con estado `PENDING_ADVISOR`. No crea pago, no crea booking y no confirma disponibilidad automaticamente.

## Generacion manual de reserva

Cuando la solicitud esta disponible, el asesor puede presionar "Generar reserva". El sistema:

- crea un `Booking`;
- genera codigo RES;
- cambia la solicitud a `CONFIRMED`;
- crea bloqueo de disponibilidad interno;
- genera PDF/comprobante.

## Codigo RES

El codigo de reserva es legible y unico, por ejemplo:

```text
RES-2026-000031
```

## PDF/comprobante

El PDF resume la reserva confirmada: cliente, asesor, producto, fechas, huespedes, servicios premium, subtotal, impuestos, descuentos y total.

## Contacto

La pagina de contacto recibe leads comerciales. En modo demo puede guardar la solicitud aunque no haya correo configurado.

## Dashboard

El dashboard cambia por rol:

- SUPERADMIN ve metricas globales.
- ADVISOR ve solo metricas propias.

## Logs e historial

El sistema registra eventos operativos como creacion de solicitudes, cambios de estado, reservas generadas, PDFs, asesores y productos.

## Modo demo/manual

En demo:

- disponibilidad real iCal/Airbnb esta desactivada;
- pagos reales estan desactivados;
- Factus/DIAN esta en modo mock/documental;
- WhatsApp automatico esta simulado o manual.
