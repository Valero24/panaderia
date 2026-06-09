"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import type { Language } from "@/i18n";
import { useTranslation } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { getLocalizedSlug, type TranslatableEntity } from "@/lib/dynamic-translations";
import {
  localizedPathForCurrentRoute,
  localizedRoutePath,
  publicRouteFromPathname,
  type PublicRouteKind,
} from "@/lib/i18n-routes";

const languageOptions: {
  code: Language;
  countryCode: string;
  shortLabel: string;
  label: string;
  ariaLabel: string;
}[] = [
  {
    code: "es",
    countryCode: "CO",
    shortLabel: "ES",
    label: "Español",
    ariaLabel: "Cambiar idioma a español",
  },
  {
    code: "en",
    countryCode: "US",
    shortLabel: "EN",
    label: "English",
    ariaLabel: "Switch language to English",
  },
  {
    code: "fr",
    countryCode: "FR",
    shortLabel: "FR",
    label: "Français",
    ariaLabel: "Changer la langue en français",
  },
  {
    code: "pt",
    countryCode: "BR",
    shortLabel: "PT",
    label: "Português",
    ariaLabel: "Alterar idioma para português",
  },
  {
    code: "it",
    countryCode: "IT",
    shortLabel: "IT",
    label: "Italiano",
    ariaLabel: "Cambiare lingua in italiano",
  },
];

function CountryFlag({ countryCode }: { countryCode: string }) {
  return (
    <ReactCountryFlag
      countryCode={countryCode}
      svg
      aria-hidden
      className="shrink-0 align-[-0.12em]"
      style={{ width: "20px", height: "20px" }}
    />
  );
}

const detailEndpointByKind: Partial<Record<PublicRouteKind, string>> = {
  property: "properties",
  experience: "experiences",
  package: "packages",
  destination: "destinations",
  blog: "blog",
};

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const activeLanguage =
    languageOptions.find((item) => item.code === language) || languageOptions[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
  }, [open]);

  async function resolveLocalizedPath(nextLanguage: Language) {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const suffix = `${search}${hash}`;
    const route = publicRouteFromPathname(pathname);

    if (!route?.identifier) {
      return localizedPathForCurrentRoute(pathname, nextLanguage, search, hash);
    }

    const endpoint = detailEndpointByKind[route.kind];

    if (!endpoint) {
      return `${localizedRoutePath(
        route.kind,
        nextLanguage,
        route.identifier
      )}${suffix}`;
    }

    try {
      const response = await fetch(apiUrl(`/${endpoint}/${route.identifier}`), {
        cache: "force-cache",
      });

      if (!response.ok) {
        return `${localizedRoutePath(
          route.kind,
          nextLanguage,
          route.identifier
        )}${suffix}`;
      }

      const entity = (await response.json()) as TranslatableEntity;
      const identifier =
        getLocalizedSlug(entity, nextLanguage, route.identifier) ||
        route.identifier;

      return `${localizedRoutePath(route.kind, nextLanguage, identifier)}${suffix}`;
    } catch {
      return `${localizedRoutePath(
        route.kind,
        nextLanguage,
        route.identifier
      )}${suffix}`;
    }
  }

  async function handleSelect(nextLanguage: Language) {
    if (pendingLanguage || nextLanguage === language) {
      setOpen(false);
      return;
    }

    setPendingLanguage(nextLanguage);
    const nextPath = await resolveLocalizedPath(nextLanguage);

    setLanguage(nextLanguage);
    setOpen(false);
    setPendingLanguage(null);

    if (nextPath && nextPath !== pathname) {
      router.push(nextPath);
    }
  }

  return (
    <div ref={wrapperRef} className="relative inline-flex max-w-full">
      <button
        type="button"
        aria-label="Selector de idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-2xl border border-[#D4AF37]/30 bg-white/95 px-3 text-sm font-semibold text-[#0D2B52] shadow-[0_8px_22px_rgba(13,43,82,0.08)] transition-all duration-200 hover:border-[#B68D40]/60 hover:bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 sm:w-[160px] sm:justify-between lg:h-11"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CountryFlag countryCode={activeLanguage.countryCode} />
          <span className="sm:hidden">{activeLanguage.shortLabel}</span>
          <span className="hidden truncate sm:inline">{activeLanguage.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#B68D40] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Opciones de idioma"
          className="absolute right-0 top-full z-[70] mt-2 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-white p-1.5 shadow-[0_18px_45px_rgba(13,43,82,0.16)]"
        >
          {languageOptions.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={item.ariaLabel}
                onClick={() => handleSelect(item.code)}
                disabled={Boolean(pendingLanguage)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#0D2B52] text-white shadow-sm"
                    : "text-[#0D2B52] hover:bg-[#F8F6F1] hover:text-[#B68D40]"
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <CountryFlag countryCode={item.countryCode} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? "bg-white/15 text-white" : "bg-[#F8F6F1] text-[#B68D40]"
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
