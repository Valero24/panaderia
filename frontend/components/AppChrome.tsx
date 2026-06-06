"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import FloatingWhatsapp from "@/components/FloatingWhatsapp";
import Footer from "@/components/Footer";
import MarketingScripts from "@/components/MarketingScripts";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";

const scrollSnapRoutes = new Set([
  "/",
  "/alojamientos",
  "/experiencias",
  "/paquetes",
  "/nosotros",
]);

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
        {children}
      </main>

      {showPublicChrome && <Footer />}
      {showPublicChrome && <FloatingWhatsapp />}
    </LanguageProvider>
  );
}
