"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import FloatingWhatsapp from "@/components/FloatingWhatsapp";
import Footer from "@/components/Footer";
import MarketingScripts from "@/components/MarketingScripts";
import Navbar from "@/components/Navbar";
import SectionScrollNavigator from "@/components/SectionScrollNavigator";
import { LanguageProvider } from "@/context/LanguageContext";

const scrollSnapRoutes = new Set([
  "/",
  "/alojamientos",
  "/experiencias",
  "/paquetes",
  "/nosotros",
]);

const guidedScrollSections: Record<string, string[]> = {
  "/": [
    "home-hero",
    "home-alojamientos",
    "home-experiencias",
    "home-paquetes",
    "home-respaldo",
    "home-cta",
  ],
  "/alojamientos": [
    "alojamientos-hero",
    "listado-filtros",
    "alojamientos-listado",
    "site-footer",
  ],
  "/experiencias": [
    "experiencias-hero",
    "listado-filtros",
    "experiencias-listado",
    "site-footer",
  ],
  "/paquetes": [
    "paquetes-hero",
    "listado-filtros",
    "paquetes-listado",
    "site-footer",
  ],
  "/nosotros": [
    "nosotros-hero",
    "nosotros-quienes",
    "nosotros-como",
    "nosotros-por-que",
    "site-footer",
  ],
};

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isStaffRoute = pathname === "/login" || pathname === "/staff-login";
  const showPublicChrome = !isAdminRoute && !isStaffRoute;
  const enableGuidedScroll = Boolean(pathname && scrollSnapRoutes.has(pathname));

  useEffect(() => {
    document.documentElement.classList.toggle(
      "public-guided-scroll",
      enableGuidedScroll
    );

    return () => {
      document.documentElement.classList.remove("public-guided-scroll");
    };
  }, [enableGuidedScroll]);

  return (
    <LanguageProvider>
      {showPublicChrome && <MarketingScripts />}
      {showPublicChrome && <Navbar />}

      <main
        className={`flex-1 ${
          enableGuidedScroll ? "public-guided-scroll-main" : ""
        }`}
      >
        {enableGuidedScroll && pathname && (
          <SectionScrollNavigator
            sections={guidedScrollSections[pathname] || []}
            maxSteps={pathname === "/" ? 1 : 2}
            respectSectionContent={pathname !== "/"}
          />
        )}
        {children}
      </main>

      {showPublicChrome && <Footer />}
      {showPublicChrome && <FloatingWhatsapp />}
    </LanguageProvider>
  );
}
