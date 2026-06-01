# Factura / comprobante PDF

## Estado actual

El sistema genera un comprobante PDF premium cuando una solicitud asistida se convierte en reserva confirmada. En modo demo este documento funciona como comprobante interno de reserva, no como factura electronica DIAN.

## Donde se genera

Servicio principal:

```text
backend/src/invoice/invoice.service.ts
```

El flujo lo invoca desde:

```text
backend/src/pre-reservations/pre-reservations.service.ts
```

durante la generacion manual de booking.

## Donde se guarda

La ruta del archivo generado se guarda en:

```text
Booking.invoicePath
```

El archivo se expone desde endpoints protegidos para ver o descargar:

```text
GET /pre-reservations/:id/invoice/view
GET /pre-reservations/:id/invoice/download
```

## Datos que usa

El PDF toma informacion de:

- `Booking`
- `PreReservation`
- `PreReservationItem`
- `selectedExtras`
- `CompanySettings`
- asesor asignado
- datos del cliente

## Estructura del PDF

Incluye:

- logo/nombre de empresa;
- codigo RES;
- estado confirmada;
- datos del cliente;
- datos del asesor;
- producto reservado;
- fechas;
- huespedes;
- servicios premium;
- subtotal;
- descuentos;
- impuestos;
- total final;
- politicas/notas;
- informacion de contacto.

## Mapa de datos

| Origen | Uso en PDF |
| --- | --- |
| `Booking.reservationCode` | Codigo RES |
| `Booking.customerName` | Cliente |
| `Booking.customerEmail` | Correo cliente |
| `Booking.customerPhone` | Telefono cliente |
| `Booking.productName` | Producto reservado |
| `Booking.checkIn` | Fecha inicial |
| `Booking.checkOut` | Fecha final |
| `Booking.guests` | Huespedes |
| `Booking.advisorName` | Asesor |
| `Booking.selectedExtras` | Servicios premium |
| `Booking.taxesAmount` | Impuestos |
| `Booking.discountAmount` | Descuentos |
| `Booking.totalPrice` | Total |
| `CompanySettings.companyName` | Empresa |
| `CompanySettings.legalId` | Identificacion legal |
| `CompanySettings.policies` | Politicas |
| `CompanySettings.invoiceFooter` | Footer |

## Comprobante interno vs factura DIAN

Actual:

- comprobante PDF interno;
- util para demo y validacion comercial;
- no envia a DIAN;
- no requiere Factus activo.

Futuro:

- integracion Factus/DIAN;
- numeracion fiscal;
- CUFE/CUDE si aplica;
- validacion tributaria;
- respuesta del proveedor;
- almacenamiento de estado fiscal.

## Campos pendientes para Factus/DIAN

Antes de una factura electronica real se debe definir:

- datos fiscales completos de empresa;
- regimen tributario;
- resolucion de facturacion;
- identificacion fiscal del cliente;
- tipo de documento;
- impuestos detallados;
- conceptos contables;
- integracion Factus sandbox;
- manejo de errores y reintentos.
