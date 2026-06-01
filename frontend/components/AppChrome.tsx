"use client";

import { usePathname } from "next/navigation";

import FloatingWhatsapp from "@/components/FloatingWhatsapp";
import Footer from "@/components/Footer";
import MarketingScripts from "@/components/MarketingScripts";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isStaffRoute = pathname === "/login" || pathname === "/staff-login";
  const showPublicChrome = !isAdminRoute && !isStaffRoute;

  return (
    <LanguageProvider>
      {showPublicChrome && <MarketingScripts />}
      {showPublicChrome && <Navbar />}

      <main className="flex-1">{children}</main>

      {showPublicChrome && <Footer />}
      {showPublicChrome && <FloatingWhatsapp />}
    </LanguageProvider>
  );
}
