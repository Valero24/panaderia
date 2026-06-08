"use client";

import Link from "next/link";
import {
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Share2,
  ShieldCheck,
  Camera,
} from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";
import { trackContact, trackCtaClick } from "@/lib/analytics";
import { localizedRoutePath } from "@/lib/i18n-routes";

export default function Footer() {
  const { language, t } = useTranslation();
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "573000000000";
  const whatsappHref = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`;
  const socialLinks = [
    {
      href:
        process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
        "https://www.instagram.com/cartagenatailoredtravel",
      label: "Instagram",
      icon: Camera,
      source: "footer_instagram",
    },
    {
      href: whatsappHref,
      label: t("footer.whatsapp"),
      icon: MessageCircle,
      source: "footer_whatsapp",
    },
    {
      href:
        process.env.NEXT_PUBLIC_TIKTOK_URL ||
        "https://www.tiktok.com/@cartagenatailoredtravel",
      label: "TikTok",
      icon: Music2,
      source: "footer_tiktok",
    },
    {
      href:
        process.env.NEXT_PUBLIC_FACEBOOK_URL ||
        "https://www.facebook.com/cartagenatailoredtravel",
      label: "Facebook",
      icon: Share2,
      source: "footer_facebook",
    },
  ];
  const quickLinks = [
    { href: localizedRoutePath("property", language), label: t("footer.stays") },
    {
      href: localizedRoutePath("experience", language),
      label: t("footer.experiences"),
    },
    { href: localizedRoutePath("package", language), label: t("footer.packages") },
    {
      href: localizedRoutePath("destination", language),
      label: t("footer.destinations"),
    },
    { href: localizedRoutePath("about", language), label: t("nav.about") },
    { href: localizedRoutePath("contact", language), label: t("footer.contact") },
  ];
  const policies = [
    t("footer.privacy"),
    t("footer.terms"),
    t("footer.cancellation"),
  ];

  return (
    <footer id="site-footer" className="bg-[#071E3A] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.8fr_0.9fr_0.8fr]">
          <div className="max-w-sm">
            <p className="text-sm uppercase tracking-[0.35em] text-[#D4AF37]">
              Cartagena
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Tailored Travel
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {t("footer.description")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                {t("home.trustVerified")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
                {t("footer.whatsapp")}
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{t("footer.quickLinks")}</h3>
            <div className="space-y-3 text-sm text-slate-300">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block transition hover:text-[#D4AF37]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{t("footer.contact")}</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#D4AF37]" />
                +57 300 000 0000
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#D4AF37]" />
                reservations@cartagenatailoredtravel.com
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#D4AF37]" />
                {t("footer.location")}
              </p>
              <Link
                href={localizedRoutePath("contact", language)}
                onClick={() => trackCtaClick("hablar_con_asesor", "footer")}
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0D2B52] transition hover:bg-[#F8F6F1]"
              >
                {t("home.talkAdvisor")}
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{t("footer.policies")}</h3>
            <div className="space-y-3 text-sm text-slate-300">
              {policies.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>

            <h3 className="mb-4 mt-8 font-semibold">{t("footer.social")}</h3>
            <div className="flex gap-3">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    onClick={() => trackContact(item.source)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 Cartagena Tailored Travel. {t("footer.rights")}</p>
          <p>{t("footer.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
