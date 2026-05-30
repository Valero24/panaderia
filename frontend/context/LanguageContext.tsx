"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Language,
  TranslationKey,
  languages,
  translate,
} from "@/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey | string) => string;
};

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

function normalizeLanguage(value: string | null): Language {
  return languages.some((language) => language.code === value)
    ? (value as Language)
    : "es";
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined" || !window.localStorage) {
    return "es";
  }

  try {
    return normalizeLanguage(
      window.localStorage.getItem("cartagena-language")
    );
  } catch {
    return "es";
  }
}

function persistLanguage(language: Language) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem("cartagena-language", language);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] =
    useState<Language>("es");

  useEffect(() => {
    const storedLanguage = getStoredLanguage();

    setLanguageState(storedLanguage);
    document.documentElement.lang = storedLanguage;
  }, []);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    persistLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey | string) => translate(language, key),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useTranslation must be used inside LanguageProvider"
    );
  }

  return context;
}

export const useLanguage = useTranslation;
