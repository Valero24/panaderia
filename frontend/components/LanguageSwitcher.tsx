"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";

import { languages } from "@/i18n";
import { useTranslation } from "@/context/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current =
    languages.find((item) => item.code === language) ||
    languages[0];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        closeOnOutsideClick
      );
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("language.current")}
        aria-expanded={open}
        className="flex h-9 min-w-[116px] items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#F8F6F1] px-2 text-xs font-medium text-[#0D2B52] shadow-sm transition hover:border-[#B68D40] hover:bg-white sm:h-10 sm:min-w-[150px] sm:px-3 sm:text-sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe2 className="h-4 w-4 shrink-0 text-[#B68D40]" />
          <span className="truncate">{current.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-white p-2 shadow-xl">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setLanguage(item.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                item.code === language
                  ? "bg-[#0D2B52] text-white"
                  : "text-[#0D2B52] hover:bg-[#F8F6F1]"
              }`}
            >
              <span>{item.label}</span>
              {item.code === language && (
                <span className="text-xs opacity-80">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
