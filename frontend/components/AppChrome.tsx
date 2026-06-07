"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";

const FloatingWhatsapp = dynamic(() => import("@/components/FloatingWhatsapp"), {
  ssr: false,
});
const MarketingScripts = dynamic(() => import("@/components/MarketingScripts"), {
  ssr: false,
});
const SectionScrollNavigator = dynamic(
  () => import("@/components/SectionScrollNavigator"),
  {
    ssr: false,
  }
);

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
    "site-footer",
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

const guidedScrollOffsets: Record<string, Record<string, number>> = {
  "/": {
    "home-hero": 0,
    "home-alojamientos": 104,
    "home-experiencias": 104,
    "home-paquetes": 104,
    "site-footer": 104,
  },
};

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isStaffRoute = pathname === "/login" || pathname === "/staff-login";
  const isInternalRoute = Boolean(isAdminRoute || isStaffRoute);
  const showPublicChrome = !isAdminRoute && !isStaffRoute;
  const enableGuidedScroll = Boolean(pathname && scrollSnapRoutes.has(pathname));
  const [isDesktopGuidedScroll, setIsDesktopGuidedScroll] = useState(false);

  useEffect(() => {
    if (!enableGuidedScroll) {
      setIsDesktopGuidedScroll(false);
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateDesktopGuidedScroll = () => {
      setIsDesktopGuidedScroll(mediaQuery.matches);
    };

    updateDesktopGuidedScroll();
    mediaQuery.addEventListener("change", updateDesktopGuidedScroll);

    return () => {
      mediaQuery.removeEventListener("change", updateDesktopGuidedScroll);
    };
  }, [enableGuidedScroll]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "public-guided-scroll",
      isDesktopGuidedScroll
    );

    return () => {
      document.documentElement.classList.remove("public-guided-scroll");
    };
  }, [isDesktopGuidedScroll]);

  return (
    <LanguageProvider scope={isInternalRoute ? "admin" : "public"}>
      {showPublicChrome && <MarketingScripts />}
      {showPublicChrome && <Navbar />}

      <main
        className={`flex-1 ${
          isDesktopGuidedScroll ? "public-guided-scroll-main" : ""
        }`}
      >
        {isDesktopGuidedScroll && pathname && (
          <SectionScrollNavigator
            sections={guidedScrollSections[pathname] || []}
            sectionOffsets={guidedScrollOffsets[pathname]}
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
