"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/context/LanguageContext";
import { trackContact } from "@/lib/analytics";

const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "573000000000";

export default function FloatingWhatsapp() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith("/checkout");
  const message = t("whatsapp.floatingMessage");
  const href = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackContact("floating_whatsapp")}
      aria-label={t("whatsapp.aria")}
      className={`fixed right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#1EBE5D] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:right-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 ${
        isCheckout ? "bottom-24 sm:bottom-6" : "bottom-5 sm:bottom-6"
      }`}
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden text-sm font-semibold sm:inline">
        {t("common.whatsapp")}
      </span>
    </a>
  );
}
