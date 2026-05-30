"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/context/LanguageContext";
import { trackCtaClick } from "@/lib/analytics";

export default function Navbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isAdminRoute) {
    return null;
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-[#D4AF37]/20 bg-white/95 shadow-[0_10px_30px_rgba(13,43,82,0.10)] backdrop-blur-md"
          : "border-[#D4AF37]/15 bg-white shadow-none"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-3 px-4 transition-all duration-300 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 ${
          scrolled
            ? "min-h-16 py-3 lg:h-[72px] lg:py-0"
            : "min-h-20 py-4 lg:h-24 lg:py-0"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-3 lg:w-auto">
          {/* Logo */}
          <Link
            href="/"
            className="relative flex h-12 w-[150px] shrink-0 items-center sm:w-[170px] lg:w-[190px]"
            aria-label="Cartagena Tailored Travel"
          >
            <Image
              src="/branding/LOGO-12.png"
              alt="Cartagena Tailored Travel"
              width={675}
              height={314}
              priority
              sizes="(max-width: 640px) 150px, (max-width: 1024px) 170px, 190px"
              className={`h-auto w-full object-contain transition-all duration-300 ${
                scrolled ? "lg:max-h-10" : "lg:max-h-12"
              }`}
            />
          </Link>

          <div className="lg:hidden">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Menu */}
        <nav
          className={`hidden items-center transition-all duration-300 lg:flex ${
            scrolled ? "gap-7" : "gap-10"
          }`}
        >
          <Link
            href="/alojamientos"
            className="text-sm font-medium text-[#0D2B52] hover:text-[#B68D40] transition"
          >
            {t("nav.stays")}
          </Link>

          <Link
            href="/experiencias"
            className="text-sm font-medium text-[#0D2B52] hover:text-[#B68D40] transition"
          >
            {t("nav.experiences")}
          </Link>

          <Link
            href="/paquetes"
            className="text-sm font-medium text-[#0D2B52] hover:text-[#B68D40] transition"
          >
            {t("nav.packages")}
          </Link>

          <Link
            href="/nosotros"
            className="text-sm font-medium text-[#0D2B52] hover:text-[#B68D40] transition"
          >
            {t("nav.about")}
          </Link>
        </nav>

        {/* CTA */}
        <div className="grid w-full grid-cols-2 items-center gap-2 lg:flex lg:w-auto lg:flex-nowrap lg:gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          <Link href="/login" className="min-w-0">
            <Button
              variant="outline"
              className={`w-full rounded-xl border-[#B68D40] px-2 text-xs text-[#0D2B52] transition-all duration-300 sm:px-4 sm:text-sm ${
                scrolled ? "h-9" : "h-10"
              }`}
            >
              {t("nav.adminAccess")}
            </Button>
          </Link>

          <Link
            href="/checkout"
            className="min-w-0"
            onClick={() => trackCtaClick("reservar_ahora", "navbar")}
          >
            <Button
              className={`w-full rounded-xl bg-[#0D2B52] px-3 text-xs transition-all duration-300 hover:bg-[#12396d] sm:px-5 sm:text-sm lg:w-auto ${
                scrolled ? "h-9" : "h-10"
              }`}
            >
              {t("nav.reserveNow")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
