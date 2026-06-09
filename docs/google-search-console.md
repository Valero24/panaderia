# Google Search Console

Guia interna para registrar el sitemap publico de Cartagena Tailored Travel en Google Search Console.

## Sitemap principal

El sitemap principal siempre debe estar disponible en:

```text
https://dominio.com/sitemap.xml
```

En el entorno actual de Vercel:

```text
https://panaderia-psi.vercel.app/sitemap.xml
```

Cuando el proyecto use dominio propio:

```text
https://cartagenatailoredtravel.com/sitemap.xml
```

## Fuente del dominio

El dominio usado por sitemap, robots, canonical y metadata debe salir de:

```text
NEXT_PUBLIC_SITE_URL
```

Fallback actual del codigo:

```text
https://panaderia-psi.vercel.app
```

No se debe usar `localhost` en sitemap, robots, canonical ni Open Graph.

## Pasos en Google Search Console

1. Verificar la propiedad del dominio o prefijo URL.
2. Abrir la seccion `Sitemaps`.
3. Enviar:

```text
sitemap.xml
```

4. Confirmar que Google muestre estado correcto.
5. Revisar cobertura e indexacion despues de que Google procese el sitemap.

## Propiedades internacionales

Cuando el dominio propio este activo, registrar preferiblemente una propiedad de dominio:

```text
cartagenatailoredtravel.com
```

Si se usan propiedades por prefijo URL, preparar estas vistas:

```text
https://dominio.com/es/
https://dominio.com/en/
https://dominio.com/fr/
https://dominio.com/pt/
https://dominio.com/it/
```

Cada idioma debe tener URL real, canonical propio y alternates hreflang hacia las otras versiones publicas.

## Rutas internacionales esperadas

El sitemap internacional debe incluir:

- `/es`
- `/en`
- `/fr`
- `/pt`
- `/it`
- listados por idioma
- detalles publicos por slug y por idioma

Ejemplos:

```text
/es/alojamientos/villa-premium
/en/stays/luxury-villa
/fr/hebergements/villa-luxe
/pt/acomodacoes/vila-premium
/it/alloggi/villa-premium
```

Si un slug traducido todavia no existe, la URL puede usar temporalmente el slug base en espanol, pero debe seguir apuntando a una ruta real.

## Rutas que debe descubrir Google

El sitemap debe incluir contenido publico:

- Home
- Alojamientos
- Experiencias
- Paquetes
- Destinos
- Blog
- Nosotros
- Contacto
- Detalles publicos por slug

El sitemap no debe incluir:

- `/admin`
- `/staff-login`
- `/checkout`
- `/confirmacion`
- `/api`
- `/preview`
- `/drafts`
- contenido privado, borradores o productos inactivos

## Validacion antes de enviar

Abrir en navegador:

```text
https://dominio.com/sitemap.xml
https://dominio.com/robots.txt
```

Confirmar:

- XML valido.
- URLs absolutas.
- Sin `localhost`.
- Sin rutas privadas.
- `robots.txt` apunta al sitemap correcto.

## Validacion hreflang y canonical

Revisar en codigo fuente de rutas representativas:

```text
/es
/en
/fr
/pt
/it
/es/alojamientos/[slug]
/en/stays/[slug]
/es/destinos/[slug]
/en/destinations/[slug]
/es/blog/[slug]
/en/blog/[slug]
```

Confirmar:

- Existe `<link rel="canonical">`.
- El canonical apunta a la URL del mismo idioma.
- Existen alternates `hreflang` para `es`, `en`, `fr`, `pt`, `it`.
- Existe `x-default` apuntando a la version principal en espanol.
- Ningun hreflang apunta a una URL 404.
- No hay alternates duplicados apuntando todos a la misma URL.
- No hay loops de redireccion.

## Validacion de metadata y schema

Para cada idioma revisar:

- `<title>` traducido.
- `<meta name="description">` traducida.
- `og:title`, `og:description` y `og:url` coherentes con el idioma.
- `twitter:title` y `twitter:description` coherentes con el idioma.
- JSON-LD con `description`, FAQ y contenido del producto en el idioma de la URL cuando exista traduccion.
- Fallback seguro a espanol cuando falta una traduccion.

No debe aparecer:

- `undefined`
- `null`
- `[object Object]`
- contenido privado

## Validacion externa recomendada

Despues del despliegue:

- Enviar `sitemap.xml` en Google Search Console.
- Revisar la cobertura de indexacion por idioma.
- Usar inspeccion de URL para una ruta de cada idioma.
- Validar datos estructurados en Rich Results Test.
- Validar JSON-LD en Schema Markup Validator.
- Revisar que Google no reporte hreflang roto, duplicado o sin retorno.
