# Roles y permisos

## Roles operativos

- `SUPERADMIN`: control total operativo.
- `ADVISOR`: gestion comercial de solicitudes asignadas.
- `USER`: cliente final creado o asociado internamente.
- `ADMIN`: rol heredado conservado para compatibilidad.

## Matriz general

| Accion | SUPERADMIN | ADVISOR | USER |
| --- | --- | --- | --- |
| Ver dashboard global | Si | No | No |
| Ver dashboard propio | Si | Si | No |
| Crear alojamientos | Si | No | No |
| Editar productos | Si | Limitado si se permite en UI | No |
| Desactivar productos | Si | No | No |
| Crear asesores | Si | No | No |
| Activar/desactivar asesores | Si | No | No |
| Ver solicitudes pendientes | Si | Si | No |
| Tomar solicitud | Si | Si | No |
| Editar solicitud asignada | Si | Si, solo propia | No |
| Reasignar solicitud | Si | No | No |
| Cancelar/archivar registro | Si | No | No |
| Generar reserva manual | Si | Si, solo asignada | No |
| Ver logs globales | Si | No | No |
| Ver contactos | Si | Si si esta habilitado | No |

## SUPERADMIN

Puede ver:

- dashboard global;
- alojamientos;
- experiencias;
- paquetes;
- reservas;
- asesores;
- contactos;
- configuracion;
- historial/logs;
- pagos si el modulo esta visible.

Puede hacer:

- crear/editar/desactivar productos;
- administrar servicios premium;
- crear/editar/activar/desactivar/archivar asesores;
- reasignar solicitudes;
- cancelar o archivar registros;
- generar reservas manuales;
- revisar logs operativos.

Endpoints principales:

- `GET /dashboard/summary`
- `GET /operational-logs`
- `GET/POST/PATCH/DELETE /users/advisors`
- `POST/PATCH/DELETE /properties`
- `POST/PATCH/DELETE /experiences`
- `POST/PATCH/DELETE /packages`
- `POST/PATCH/DELETE /extras`
- `PATCH /admin-operations/pre-reservations/:id/reassign`
- `PATCH /admin-operations/pre-reservations/:id/cancel`
- `PATCH /admin-operations/pre-reservations/:id/archive`

## ADVISOR

Puede ver:

- dashboard propio;
- solicitudes pendientes;
- solicitudes asignadas a el;
- reservas confirmadas gestionadas por el;
- productos como referencia operativa;
- contactos si la UI lo permite.

Puede hacer:

- tomar solicitudes pendientes;
- pasar estados operativos;
- editar cotizacion de solicitudes asignadas;
- generar reserva manual si la solicitud le pertenece;
- ver/descargar comprobante de sus reservas;
- enviar notificaciones manuales si esta configurado.

No puede:

- crear productos;
- eliminar/desactivar productos;
- crear o eliminar asesores;
- ver configuracion global;
- ver logs globales;
- reasignar solicitudes;
- cancelar registros globalmente;
- administrar secretos o integraciones.

Endpoints permitidos:

- `GET /dashboard/summary`
- `GET /pre-reservations`
- `GET /pre-reservations/:id`
- `PATCH /pre-reservations/:id/assign-me`
- `PATCH /pre-reservations/:id/status/validating`
- `PATCH /pre-reservations/:id/status/available`
- `PATCH /pre-reservations/:id/status/unavailable`
- `PATCH /pre-reservations/:id/status/payment-pending`
- `PATCH /pre-reservations/:id/quote`
- `POST /pre-reservations/:id/generate-booking`

## Rutas protegidas frontend

- `/admin`
- `/admin/reservas`
- `/admin/alojamientos`
- `/admin/experiencias`
- `/admin/paquetes`
- `/admin/contactos`
- `/admin/asesores`
- `/admin/configuracion`
- `/admin/logs`

El frontend oculta menus y botones segun rol. El backend tambien valida permisos con guards, por lo que no se depende solo de la interfaz.
