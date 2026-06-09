# Motor de traduccion automatica

## Flujo actual

1. El administrador guarda contenido base en espanol.
2. El servicio del catalogo crea o actualiza la entidad.
3. Si `AUTO_TRANSLATION_ENABLED=true`, se crea un `TranslationJob`.
4. El worker manual o futuro cron llama `POST /translations/jobs/process-pending`.
5. El job traduce EN, FR, PT e IT y guarda el resultado en `translations`.
6. Las rutas publicas e internacionales leen `translations` y hacen fallback a espanol.

## Carga masiva futura

El importador Excel debe crear los registros en espanol y luego llamar:

```http
POST /translations/bulk-enqueue
```

Tambien existe un endpoint semantico para importadores:

```http
POST /translations/import/enqueue
```

Payload:

```json
{
  "items": [
    { "entityType": "PROPERTY", "entityId": 1 },
    { "entityType": "EXPERIENCE", "entityId": 2 },
    { "entityType": "PACKAGE", "entityId": 3 },
    { "entityType": "DESTINATION", "entityId": 4 },
    { "entityType": "BLOG_POST", "entityId": 5 }
  ],
  "overwrite": false
}
```

`overwrite: false` protege correcciones manuales del administrador.

La carga masiva solo debe exigir columnas en espanol. El importador crea las
entidades base y luego envia sus IDs para generar `TranslationJob` hacia EN, FR,
PT e IT.

## SEO internacional

Las rutas futuras `/en`, `/fr`, `/pt` e `/it` deben leer los campos guardados en
`translations.{locale}`. No se debe llamar al proveedor de traduccion durante visitas
publicas ni durante render SEO.

El frontend ya debe resolver contenido con helpers como `getTranslatedField` o
`getDynamicText`: traduccion guardada, fallback a espanol y vacio seguro.

## Costos

El sistema evita traducir por visita. Traduce una vez, guarda resultado y reutiliza.
Si ya existe un job `PENDING` o `PROCESSING` para la misma entidad, se actualiza ese
job en vez de crear duplicados.

## Composicion del modulo

- `translations.controller.ts`: endpoints admin para traducir, encolar, procesar y regenerar.
- `translations.service.ts`: orquesta traduccion de entidades, FAQ, SEO y textos largos.
- `translation.providers.ts`: adaptadores para OPENAI, GOOGLE, DEEPL y LIBRETRANSLATE.
- `translation.queue.ts`: jobs, estados y persistencia por tipo de entidad.

Todos los modelos de contenido deben usar espanol como base y `translations` con:

```json
{
  "en": {},
  "fr": {},
  "pt": {},
  "it": {}
}
```

## Configuracion

```env
AUTO_TRANSLATION_ENABLED=true
TRANSLATION_PROVIDER=openai
TRANSLATION_DEFAULT_SOURCE=es
TRANSLATION_TARGETS=en,fr,pt,it
```

Proveedores soportados:

- `openai`
- `google`
- `deepl`
- `libretranslate`
- `custom` para un proveedor futuro compatible con endpoint HTTP propio.

## TranslationJob

Cada job guarda:

- `entityType`
- `entityId`
- `status`
- `sourceLanguage`
- `targetLanguages`
- `startedAt`
- `finishedAt`
- `error`

El objetivo es no traducir dentro del request principal. El guardado solo encola;
el procesamiento ocurre mediante `POST /translations/jobs/process-pending` o un
worker/cron futuro.

## Encolado no bloqueante

Los formularios admin de alojamientos, experiencias, paquetes, destinos y blog usan
`enqueueEntityTranslationInBackground`. El guardado no espera a que el job se cree
o procese; cualquier error temporal se registra en logs y la operacion principal
continua.

## Textos cortos y SEO

Campos traducidos automaticamente como texto corto:

- `title`
- `name`
- `seoTitle`
- `seoDescription`
- `shortDescription`

El motor limita `seoTitle` a una longitud breve y `seoDescription` a cerca de 160
caracteres para mantener metadata razonable.

## Contenido largo

Campos como `description`, `seoContent`, `locationDescription` y
`recommendations` se traducen por partes cuando superan el tamano seguro del
proveedor. Soportan textos de 1.000, 2.000, 5.000 o 10.000 caracteres sin
truncar. Para contenido editorial se preservan saltos de linea utiles.

## FAQ multidioma

`POST /translations/faq` puede recibir:

```json
[
  {
    "question": "Pregunta en espanol",
    "answer": "Respuesta en espanol"
  }
]
```

Si se envia `targetLocale`, retorna la FAQ de ese idioma. Si se omite, retorna:

```json
{
  "en": [],
  "fr": [],
  "pt": [],
  "it": []
}
```

La estructura `question` / `answer` se conserva.

## Auditoria

Eventos registrados en `AuditLog`:

- `TRANSLATION_JOB_CREATED`
- `TRANSLATION_STARTED`
- `TRANSLATION_COMPLETED`
- `TRANSLATION_FAILED`
- `TRANSLATION_REGENERATED`
- `TRANSLATION_MANUAL_OVERRIDE`

## Validacion funcional

- Alojamiento: guardar contenido en espanol y confirmar job para EN, FR, PT e IT.
- Experiencia: editar descripcion, regenerar y confirmar que se reencola.
- FAQ: guardar FAQ en espanol y confirmar estructura traducida por idioma.
- Blog: guardar articulo en espanol y confirmar traducciones persistidas.

## Validacion recomendada

- Crear alojamiento en espanol y confirmar `PENDING_TRANSLATION`.
- Procesar cola y confirmar traducciones EN, FR, PT e IT.
- Editar una experiencia y confirmar que solo campos modificados se reencolan.
- Crear FAQ en espanol y confirmar estructura traducida.
- Crear articulo de blog y confirmar traducciones completas.
