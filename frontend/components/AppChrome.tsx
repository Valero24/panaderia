"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  localeFromPathname,
  publicRouteFromPathname,
} from "@/lib/i18n-routes";

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

const guidedScrollSections: Record<string, string[]> = {
  home: [
    "home-hero",
    "home-alojamientos",
    "home-experiencias",
    "home-paquetes",
    "site-footer",
  ],
  property: [
    "alojamientos-hero",
    "listado-filtros",
    "alojamientos-listado",
    "site-footer",
  ],
  experience: [
    "experiencias-hero",
    "listado-filtros",
    "experiencias-listado",
    "site-footer",
  ],
  package: [
    "paquetes-hero",
    "listado-filtros",
    "paquetes-listado",
    "site-footer",
  ],
  about: [
    "nosotros-hero",
    "nosotros-quienes",
    "nosotros-como",
    "nosotros-por-que",
    "site-footer",
  ],
};

const guidedScrollOffsets: Record<string, Record<string, number>> = {
  home: {
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
  const publicRoute = publicRouteFromPathname(pathname);
  const routeLocale = localeFromPathname(pathname);
  const guidedRouteKey =
    publicRoute?.kind === "home" ||
    publicRoute?.kind === "property" ||
    publicRoute?.kind === "experience" ||
    publicRoute?.kind === "package"
      ? publicRoute.kind
      : publicRoute?.kind === "about" || pathname === "/nosotros"
        ? "about"
        : null;
  const enableGuidedScroll = Boolean(guidedRouteKey);
  const [isDesktopGuidedScroll, setIsDesktopGuidedScroll] = useState(false);
  const [showDeferredPublicWidgets, setShowDeferredPublicWidgets] = useState(false);

  useEffect(() => {
    if (!showPublicChrome) {
      setShowDeferredPublicWidgets(false);
      return;
    }

    const schedule = () => setShowDeferredPublicWidgets(true);

    if (typeof window.requestIdleCallback === "function") {
      const idleCallback = window.requestIdleCallback(schedule, {
        timeout: 1800,
      });

      return () => window.cancelIdleCallback(idleCallback);
    }

    const timeout = globalThis.setTimeout(schedule, 1200);

    return () => globalThis.clearTimeout(timeout);
  }, [showPublicChrome]);

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
    <LanguageProvider
      scope={isInternalRoute ? "admin" : "public"}
      initialLanguage={routeLocale}
    >
      {showPublicChrome && <Navbar />}

      <main
        className={`flex-1 ${
          isDesktopGuidedScroll ? "public-guided-scroll-main" : ""
        }`}
      >
        {isDesktopGuidedScroll && guidedRouteKey && (
          <SectionScrollNavigator
            sections={guidedScrollSections[guidedRouteKey] || []}
            sectionOffsets={guidedScrollOffsets[guidedRouteKey]}
            maxSteps={guidedRouteKey === "home" ? 1 : 2}
            respectSectionContent={guidedRouteKey !== "home"}
          />
        )}
        {children}
      </main>

      {showPublicChrome && <Footer />}
      {showPublicChrome && showDeferredPublicWidgets && <MarketingScripts />}
      {showPublicChrome && showDeferredPublicWidgets && <FloatingWhatsapp />}
    </LanguageProvider>
  );
}
