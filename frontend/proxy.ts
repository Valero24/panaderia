import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Legacy public routes remain reachable for compatibility. SEO duplication is
// controlled with canonical tags pointing to the /es URLs instead of forcing
// broad redirects that could break shared links or current campaigns.

const productRoutes = {
  alojamientos: "properties",
  experiencias: "experiences",
  paquetes: "packages",
  stays: "properties",
  tours: "experiences",
  experiences: "experiences",
  packages: "packages",
  hebergements: "properties",
  forfaits: "packages",
  acomodacoes: "properties",
  pacotes: "packages",
  alloggi: "properties",
  esperienze: "experiences",
  pacchetti: "packages",
} as const;

const locales = new Set(["es", "en", "fr", "pt", "it"]);

type ProductRoute = keyof typeof productRoutes;

function isProductRoute(value: string): value is ProductRoute {
  return value in productRoutes;
}

function isNumericId(value: string) {
  return /^\d+$/.test(value);
}

async function fetchCanonicalSlug(route: ProductRoute, id: string) {
  const apiResource = productRoutes[route];
  const response = await fetch(`${API_URL}/${apiResource}/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const product = await response.json();
  const slug = typeof product?.slug === "string" ? product.slug.trim() : "";

  return slug || null;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
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
    const slug = await fetchCanonicalSlug(route, id);

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
    "/:locale/alojamientos/:path*",
    "/:locale/experiencias/:path*",
    "/:locale/paquetes/:path*",
    "/:locale/stays/:path*",
    "/:locale/tours/:path*",
    "/:locale/experiences/:path*",
    "/:locale/packages/:path*",
    "/:locale/hebergements/:path*",
    "/:locale/forfaits/:path*",
    "/:locale/acomodacoes/:path*",
    "/:locale/pacotes/:path*",
    "/:locale/alloggi/:path*",
    "/:locale/esperienze/:path*",
    "/:locale/pacchetti/:path*",
  ],
};
