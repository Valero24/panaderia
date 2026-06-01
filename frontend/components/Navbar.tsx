"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/context/LanguageContext";
import { trackCtaClick } from "@/lib/analytics";

export default function Navbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const isInternalRoute =
    pathname?.startsWith("/admin") ||
    pathname === "/staff-login" ||
    pathname === "/login";

  const navItems = [
    { href: "/alojamientos", label: t("nav.stays") },
    { href: "/experiencias", label: t("nav.experiences") },
    { href: "/paquetes", label: t("nav.packages") },
    { href: "/nosotros", label: t("nav.about") },
  ];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isInternalRoute) {
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
        ref={mobileMenuRef}
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
            className="relative flex h-11 w-[138px] shrink-0 items-center min-[390px]:w-[150px] sm:h-12 sm:w-[170px] lg:w-[190px]"
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

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="min-w-0">
              <LanguageSwitcher />
            </div>
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-public-menu"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-white text-[#0D2B52] shadow-[0_8px_22px_rgba(13,43,82,0.08)] transition-all duration-200 hover:border-[#B68D40]/60 hover:bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav
          className={`hidden items-center transition-all duration-300 lg:flex ${
            scrolled ? "gap-7" : "gap-10"
          }`}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#0D2B52] transition hover:text-[#B68D40]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div
          className={`w-full items-center justify-end gap-2 lg:flex lg:w-auto lg:flex-nowrap lg:gap-3 ${
            mobileMenuOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          <Link
            href="/checkout"
            className="w-full min-w-0 lg:w-auto"
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

        <div
          id="mobile-public-menu"
          aria-hidden={!mobileMenuOpen}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-300 ease-out lg:hidden ${
            mobileMenuOpen
              ? "grid-rows-[1fr] opacity-100 translate-y-0"
              : "grid-rows-[0fr] opacity-0 -translate-y-1"
          }`}
        >
          <nav className="min-h-0 overflow-hidden">
            <div className="space-y-2 rounded-3xl border border-[#D4AF37]/20 bg-white p-2 shadow-[0_18px_45px_rgba(13,43,82,0.12)]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-[#0D2B52] transition hover:bg-[#F8F6F1] hover:text-[#B68D40]"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-[#B68D40]" aria-hidden />
                </Link>
              ))}

              <Link
                href="/checkout"
                tabIndex={mobileMenuOpen ? 0 : -1}
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackCtaClick("reservar_ahora", "mobile_menu");
                }}
                className="flex items-center justify-center rounded-2xl bg-[#0D2B52] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12396d]"
              >
                {t("nav.reserveNow")}
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
