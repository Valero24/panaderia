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

type LocaleScope = "public" | "admin";

const PublicLocaleContext =
  createContext<LanguageContextValue | null>(null);

const AdminLocaleContext =
  createContext<LanguageContextValue | null>(null);

const LocaleScopeContext = createContext<LocaleScope>("public");

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

function PublicLocaleProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: Language | null;
}) {
  const [language, setLanguageState] =
    useState<Language>(initialLanguage || "es");

  useEffect(() => {
    const storedLanguage = initialLanguage || getStoredLanguage();

    setLanguageState(storedLanguage);
    document.documentElement.lang = storedLanguage;
  }, [initialLanguage]);

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
    <PublicLocaleContext.Provider value={value}>
      {children}
    </PublicLocaleContext.Provider>
  );
}

function AdminLocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = "es";
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: "es",
      setLanguage: () => {
        document.documentElement.lang = "es";
      },
      t: (key: TranslationKey | string) => translate("es", key),
    }),
    []
  );

  return (
    <AdminLocaleContext.Provider value={value}>
      {children}
    </AdminLocaleContext.Provider>
  );
}

export function LanguageProvider({
  children,
  scope = "public",
  initialLanguage,
}: {
  children: React.ReactNode;
  scope?: LocaleScope;
  initialLanguage?: Language | null;
}) {
  if (scope === "admin") {
    return (
      <LocaleScopeContext.Provider value="admin">
        <AdminLocaleProvider>{children}</AdminLocaleProvider>
      </LocaleScopeContext.Provider>
    );
  }

  return (
    <LocaleScopeContext.Provider value="public">
      <PublicLocaleProvider initialLanguage={initialLanguage}>
        {children}
      </PublicLocaleProvider>
    </LocaleScopeContext.Provider>
  );
}

export function usePublicLocale() {
  const context = useContext(PublicLocaleContext);

  if (!context) {
    throw new Error(
      "usePublicLocale must be used inside a public LanguageProvider"
    );
  }

  return context;
}

export function useAdminLocale() {
  const context = useContext(AdminLocaleContext);

  if (!context) {
    throw new Error(
      "useAdminLocale must be used inside an admin LanguageProvider"
    );
  }

  return context;
}

export function useTranslation() {
  const scope = useContext(LocaleScopeContext);
  const publicLocale = useContext(PublicLocaleContext);
  const adminLocale = useContext(AdminLocaleContext);
  const context = scope === "admin" ? adminLocale : publicLocale;

  if (!context) {
    throw new Error(
      "useTranslation must be used inside LanguageProvider"
    );
  }

  return context;
}

export const useLanguage = useTranslation;
