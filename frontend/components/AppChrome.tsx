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

  return (
    <LanguageProvider>
      {!isAdminRoute && <MarketingScripts />}
      {!isAdminRoute && <Navbar />}

      <main className="flex-1">{children}</main>

      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <FloatingWhatsapp />}
    </LanguageProvider>
  );
}
