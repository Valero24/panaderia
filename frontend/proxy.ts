import { NextResponse, type NextRequest } from "next/server";

import type { Language } from "@/i18n";
import { supportedLocales } from "@/lib/locales";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Legacy numeric product URLs redirect to their slug equivalent to avoid
// duplicate SEO entry points while keeping old shared links functional.

const productRoutes = {
  alojamientos: "properties",
  experiencias: "experiences",
  paquetes: "packages",
  destinos: "destinations",
  blog: "blog",
  stays: "properties",
  tours: "experiences",
  experiences: "experiences",
  packages: "packages",
  destinations: "destinations",
  hebergements: "properties",
  forfaits: "packages",
  acomodacoes: "properties",
  pacotes: "packages",
  alloggi: "properties",
  esperienze: "experiences",
  pacchetti: "packages",
  destinazioni: "destinations",
} as const;

const locales = new Set<string>(supportedLocales);

type ProductRoute = keyof typeof productRoutes;

function isProductRoute(value: string): value is ProductRoute {
  return value in productRoutes;
}

function isNumericId(value: string) {
  return /^\d+$/.test(value);
}

function localizedSlugFromProduct(product: any, locale?: string | null) {
  const language = locales.has(String(locale || "")) ? (locale as Language) : "es";
  const translatedSlug =
    typeof product?.translatedSlugs?.[language] === "string"
      ? product.translatedSlugs[language].trim()
      : typeof product?.translations?.[language]?.slug === "string"
        ? product.translations[language].slug.trim()
        : "";
  const baseSlug = typeof product?.slug === "string" ? product.slug.trim() : "";

  return translatedSlug || baseSlug || null;
}

async function fetchCanonicalSlug(
  route: ProductRoute,
  id: string,
  locale?: string | null
) {
  const apiResource = productRoutes[route];
  const response = await fetch(`${API_URL}/${apiResource}/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;

  const product = await response.json();
  return localizedSlugFromProduct(product, locale);
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === "/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/es";

    return NextResponse.redirect(redirectUrl, 308);
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const hasLocalePrefix = locales.has(pathParts[0]);
  const routeIndex = hasLocalePrefix ? 1 : 0;
  const route = pathParts[routeIndex];
  const id = pathParts[routeIndex + 1];
  const rest = pathParts.slice(routeIndex + 2);

  if (!isProductRoute(route) || !id || rest.length > 0 || !isNumericId(id)) {
    return NextResponse.next();
  }

  try {
    const slug = await fetchCanonicalSlug(
      route,
      id,
      hasLocalePrefix ? pathParts[0] : null
    );

    if (!slug || slug === id) {
      return NextResponse.next();
    }

    const redirectUrl = url.clone();
    redirectUrl.pathname = hasLocalePrefix
      ? `/${pathParts[0]}/${route}/${slug}`
      : `/${route}/${slug}`;

    return NextResponse.redirect(redirectUrl, 301);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/alojamientos/:path*",
    "/experiencias/:path*",
    "/paquetes/:path*",
    "/destinos/:path*",
    "/blog/:path*",
    "/:locale/alojamientos/:path*",
    "/:locale/experiencias/:path*",
    "/:locale/paquetes/:path*",
    "/:locale/destinos/:path*",
    "/:locale/blog/:path*",
    "/:locale/stays/:path*",
    "/:locale/tours/:path*",
    "/:locale/experiences/:path*",
    "/:locale/packages/:path*",
    "/:locale/destinations/:path*",
    "/:locale/hebergements/:path*",
    "/:locale/forfaits/:path*",
    "/:locale/acomodacoes/:path*",
    "/:locale/pacotes/:path*",
    "/:locale/alloggi/:path*",
    "/:locale/esperienze/:path*",
    "/:locale/pacchetti/:path*",
    "/:locale/destinazioni/:path*",
    "/",
  ],
};
