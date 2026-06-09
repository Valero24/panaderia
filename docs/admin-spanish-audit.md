# Auditoria de idioma interno - Bloque 02.1

Proyecto: Cartagena Tailored Travel

Objetivo: asegurar que el entorno operativo se muestre siempre en espanol para SUPERADMIN, ADMIN y ADVISOR, sin depender del idioma elegido en el sitio publico.

## Resultado general

La interfaz interna no usa el contexto publico de idioma para pintar textos administrativos. En las rutas revisadas no se encontro uso de `useTranslation`, `LanguageProvider`, `LanguageSwitcher` ni `localStorage.language` dentro de `frontend/app/admin`, `frontend/components/admin`, `frontend/app/staff-login` o `frontend/components/auth`.

Esto indica que el panel admin y asesor ya estan funcionalmente separados del idioma publico. El trabajo pendiente es principalmente de inventario, limpieza de textos visibles y mantener una regla de desarrollo: cualquier texto nuevo del panel debe escribirse directamente en espanol o salir de un diccionario interno fijo en espanol.

## Inventario por modulo

| Modulo | Rutas/componentes revisados | Estado | Accion requerida |
| --- | --- | --- | --- |
| Sidebar | `frontend/components/admin/SidebarAdmin.tsx` | En espanol | Mantener. Rutas conectadas a `/admin/registros`; `/admin/logs` redirige a `/admin/registros`. |
| Staff login | `frontend/components/auth/StaffLoginForm.tsx` | En espanol | Mantener textos: Correo, Contrasena, Recordarme, Iniciar sesion. |
| Dashboard | `frontend/app/admin/page.tsx` | En espanol | Mantener labels operativos y eventos legibles. |
| Reservas | `frontend/app/admin/reservas/*` | En espanol operativo | Revisar periodicamente estados tecnicos nuevos para mapearlos a etiquetas en espanol. |
| Alojamientos | `frontend/app/admin/alojamientos/page.tsx`, wizard y cards | Requiere limpieza puntual | Se corrigio `Villa management` a `Gestion de alojamientos`. |
| Experiencias | `frontend/app/admin/experiencias/*` | En espanol operativo | Mantener etiquetas de acciones y pasos del wizard en espanol. |
| Paquetes | `frontend/app/admin/paquetes/*` | En espanol operativo | Mantener etiquetas de acciones y pasos del wizard en espanol. |
| Destinos | `frontend/app/admin/destinos/*` | En espanol operativo | Mantener formularios, filtros y secciones SEO en espanol. |
| Blog | `frontend/app/admin/blog/*` | En espanol operativo | "Blog" y "SEO" se consideran terminos tecnicos aceptados; formularios deben seguir en espanol. |
| Facturas | `frontend/app/admin/facturas/*` | En espanol operativo | Mantener estados financieros traducidos. |
| Monedas | `frontend/app/admin/monedas/page.tsx` | En espanol operativo | Mantener acciones y estados de tasas en espanol. |
| Configuracion | `frontend/app/admin/configuracion/page.tsx` | En espanol operativo | Mantener labels tecnicos en espanol: sistema, pagos reales, PDF, marca. |
| Sistema | `frontend/app/admin/sistema/page.tsx` | En espanol operativo | Mantener labels: Estado del sistema, Base de datos, Uso de memoria, Registros 24h. |
| Registros | `frontend/app/admin/registros/page.tsx`, `frontend/app/admin/logs/page.tsx` | Conectado | `/admin/logs` es ruta legacy y redirige a `/admin/registros`. |
| Opiniones | `frontend/app/admin/opiniones/*` | En espanol operativo | Mantener eventos de reviews traducidos a textos legibles. |
| Carga masiva | No se encontro modulo dedicado en admin actual | Pendiente si se implementa | Cuando exista, todo texto debe quedar en espanol fijo. |

## Hallazgos corregidos

- `frontend/app/admin/alojamientos/page.tsx`: el eyebrow visible `Villa management` se cambio por `Gestion de alojamientos`.

## Subbloque 02.2 - Separacion de contexto publico e interno

Se dejo la separacion codificada en:

- `frontend/context/LanguageContext.tsx`
- `frontend/lib/admin-locale.ts`
- `frontend/components/AppChrome.tsx`

La arquitectura queda asi:

- `PublicLocaleContext`: idioma elegido por el visitante, con persistencia en `cartagena-language`.
- `AdminLocaleContext`: idioma fijo `es`, sin lectura ni escritura de la preferencia publica.
- `ADMIN_LOCALE`: constante interna fija para rutas operativas.
- `isInternalPath(pathname)`: helper para identificar `/admin`, `/admin/*`, `/staff-login` y `/login`.

## Subbloque 02.3 - Forzar espanol en rutas internas

`AppChrome` monta `LanguageProvider` con scope `admin` cuando la ruta es interna. En ese scope:

- `document.documentElement.lang` se fuerza a `es`.
- `useTranslation()` devuelve traducciones en espanol.
- `setLanguage()` no cambia idioma interno ni escribe preferencia publica.
- Se ignora `cartagena-language`, cookies o selector publico.

Rutas cubiertas:

- `/admin`
- `/admin/*`
- `/staff-login`
- `/login`

## Subbloque 02.4 - Sidebar administrativo

El sidebar operativo usa etiquetas en espanol:

- Panel
- Alojamientos
- Reservas
- Experiencias
- Pagos
- Facturas
- Opiniones
- Monedas
- Servicios premium
- Caracteristicas
- Paquetes
- Destinos
- Blog
- Contactos
- Asesores
- Registros
- Estado del sistema
- Configuracion

No se agrego `Carga masiva` porque no existe un modulo/ruta administrativa dedicada actualmente. Cuando se implemente, la etiqueta correcta sera `Carga masiva`, no `Bulk Import`.

## Subbloque 02.5 - Dashboard

El dashboard operativo ya tenia las metricas principales en espanol:

- Solicitudes pendientes
- Solicitudes en gestion
- Reservas confirmadas
- Reservas canceladas
- Ingresos estimados
- Contactos recibidos
- Asesores activos
- Productos activos

Se corrigio la tabla de solicitudes recientes para no mostrar el enum crudo de estado. Ahora usa `adminReservationStatusLabel()`.

No se agregaron `Reservas proximas` ni `Opiniones pendientes` porque el backend de dashboard no entrega esas metricas actualmente. Cuando existan en `dashboard/summary`, deben mostrarse con esos labels en espanol.

## Subbloque 02.6 - Estados operativos

Se creo `frontend/lib/admin-status-labels.ts` para centralizar los estados visibles de reservas:

- `PENDING_ADVISOR` -> `Pendiente de asesor`
- `ASSIGNED` -> `Asignada`
- `VALIDATING` -> `En validacion`
- `AVAILABLE` -> `Disponible`
- `UNAVAILABLE` -> `No disponible`
- `PAYMENT_PENDING` -> `Pendiente de pago`
- `CONFIRMED` -> `Confirmada`
- `CANCELLED` -> `Cancelada`

El dashboard y el modulo de reservas usan este mapeo compartido.

## Subbloque 02.7 - Estados financieros

Se centralizaron estados de facturas y pagos en `frontend/lib/admin-status-labels.ts`:

- `GENERATED` -> `Generada`
- `PAID` -> `Pagada` para factura / `Pagado` para pago
- `UNPAID` -> `Sin pagar`
- `PARTIALLY_PAID` -> `Pago parcial`
- `REFUNDED` -> `Reembolsado`
- `FAILED` -> `Fallida` para factura / `Fallido` para pago

Aplicado en:

- `frontend/app/admin/facturas/page.tsx`
- `frontend/app/admin/facturas/[id]/page.tsx`
- `frontend/app/admin/pagos/page.tsx`

## Subbloque 02.8 - Configuracion y sistema

Los modulos internos de configuracion y sistema quedan normalizados en espanol:

- `Configuracion del sistema`
- `Estado del sistema`
- `Base de datos`
- `Estado de APIs`
- `Entorno`
- `Uso de memoria RSS`

Aplicado en:

- `frontend/app/admin/configuracion/page.tsx`
- `frontend/app/admin/sistema/page.tsx`

## Subbloque 02.9 - Formularios

Se revisaron botones y acciones visibles en formularios internos. No se encontraron botones visibles en ingles para `Create`, `Edit`, `Delete`, `Save`, `Cancel`, `Update`, `Archive`, `Upload`, `Import` o `Export`.

Convencion operativa definida:

- `Create` -> `Crear`
- `Edit` -> `Editar`
- `Delete` -> `Eliminar`
- `Save` -> `Guardar`
- `Cancel` -> `Cancelar`
- `Update` -> `Actualizar`
- `Archive` -> `Archivar`
- `Upload` -> `Cargar`
- `Import` -> `Importar`
- `Export` -> `Exportar`

Los nombres internos de variables, props e imports como `onSave`, `isEditRoute`, `handleDelete` o iconos `Save`/`Edit` no se consideran textos visibles y no requieren traduccion.

## Subbloque 02.10 - Tablas y filtros

Se agrego una convencion central para textos de tablas y filtros en `frontend/lib/admin-ui-labels.ts`:

- `Search` -> `Buscar`
- `Filter` -> `Filtrar`
- `Clear Filters` -> `Limpiar filtros`
- `Rows per page` -> `Registros por pagina`
- `Showing results` -> `Mostrando resultados`
- `Previous` -> `Anterior`
- `Next` -> `Siguiente`

Aplicado inicialmente en `frontend/app/admin/registros/page.tsx` para filtros, limpieza y conteo de resultados. No se encontraron textos visibles exactos en ingles para estos labels dentro de las pantallas internas actuales.

## Subbloque 02.11 - Logs y auditoria

Se amplio `frontend/lib/admin-log-labels.ts` para mostrar etiquetas amigables en espanol y conservar el codigo tecnico como referencia secundaria.

Eventos cubiertos:

- `INVOICE_COP_GENERATED` -> `Factura interna generada`
- `REVIEW_APPROVED` -> `Opinion aprobada`
- `TRANSLATION_COMPLETED` -> `Traduccion completada`
- `BULK_IMPORT_COMPLETED` -> `Importacion masiva completada`

Tambien se agregaron eventos relacionados con opiniones, recordatorios, rating cache, traducciones, destinos y carga masiva. En `Registros`, cada accion muestra:

- etiqueta legible
- `Codigo: EVENTO_TECNICO`

## Subbloque 02.12 - Mensajes del sistema

Se agregaron mensajes internos estandar en `frontend/lib/admin-ui-labels.ts`:

- `Success` -> `Operacion completada correctamente.`
- `Error` -> `Ocurrio un error.`
- `Loading` -> `Cargando...`
- `Saving` -> `Guardando...`
- `Deleting` -> `Eliminando...`
- `Importing` -> `Importando...`

Estos textos quedan disponibles para que nuevas pantallas internas no vuelvan a introducir ingles visible.

## Subbloque 02.13 - Login interno

La ruta `/staff-login` usa `frontend/components/auth/StaffLoginForm.tsx` y queda fija en espanol, independiente del idioma publico.

Textos visibles:

- `Correo electronico`
- `Contrasena`
- `Iniciar sesion`
- `Recordarme`
- `Recuperar acceso`

No se muestran `Email`, `Password` ni `Login` como textos visibles. Los nombres internos de variables como `email`, `password` o `LoginResponse` no son interfaz de usuario.

## Subbloque 02.14 - Carga masiva

Se creo el modulo interno `/admin/carga-masiva` en `frontend/app/admin/carga-masiva/page.tsx` y se conecto al sidebar administrativo como `Carga masiva`.

Textos principales:

- `Descargar plantilla`
- `Validar archivo`
- `Importar`
- `Historial de cargas`
- `Errores detectados`

La ruta queda protegida como modulo de `SUPERADMIN` en `frontend/components/admin/admin-route-guard.tsx`.

## Subbloque 02.15 - Opiniones

El modulo `/admin/opiniones` y el detalle `/admin/opiniones/[id]` quedan normalizados en espanol.

Estados visibles:

- `PENDING` -> `Pendientes` / `Pendiente`
- `APPROVED` -> `Aprobadas` / `Aprobada`
- `REJECTED` -> `Rechazadas` / `Rechazada`
- `HIDDEN` -> `Ocultas` / `Oculta`
- Destacadas -> `Destacadas` / `Destacada`

Tambien se cambiaron textos mixtos:

- `Rating` -> `Calificacion`
- `Ratings por categoria` -> `Calificaciones por categoria`
- `Booking` visible como fallback -> `Reserva`
- `Recalcular ratings` -> `Recalcular calificaciones`

El historial de auditoria del detalle de opinion usa `frontend/lib/admin-log-labels.ts` y traduce cambios de estado como `Pendiente -> Aprobada`, no como `PENDING -> APPROVED`.

## Subbloque 02.16 - Validacion

Rutas revisadas por texto estatico del frontend:

- `/admin`
- `/admin/reservas`
- `/admin/alojamientos`
- `/admin/experiencias`
- `/admin/paquetes`
- `/admin/destinos`
- `/admin/blog`
- `/admin/facturas`
- `/admin/opiniones`
- `/admin/carga-masiva`
- `/admin/configuracion`
- `/admin/sistema`
- `/admin/logs` redirige a `/admin/registros`

La validacion de TypeScript fue ejecutada con `npx tsc --noEmit`.

## Riesgos a vigilar

- Los nombres de variables, tipos e imports pueden seguir en ingles; eso no afecta al usuario y no requiere cambio.
- Los eventos tecnicos nuevos de AuditLog deben mapearse a una etiqueta legible en espanol antes de mostrarse.
- Los campos de traducciones dinamicas dentro del admin pueden mostrar nombres de idiomas EN/FR/PT/IT, pero la explicacion y acciones del panel deben estar en espanol.
- El modulo futuro de carga masiva debe agregarse al sidebar como `Carga masiva` y entrar tambien por `AdminLocale`.
