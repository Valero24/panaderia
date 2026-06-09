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
  translate,
} from "@/i18n";
import {
  ADMIN_LOCALE,
  ADMIN_LOCALE_SCOPE,
  PUBLIC_LOCALE_SCOPE,
  PUBLIC_LOCALE_STORAGE_KEY,
} from "@/lib/admin-locale";
import { defaultLocale, isValidLocale } from "@/lib/locales";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey | string) => string;
};

type LocaleScope = typeof PUBLIC_LOCALE_SCOPE | typeof ADMIN_LOCALE_SCOPE;

const PublicLocaleContext =
  createContext<LanguageContextValue | null>(null);

const AdminLocaleContext =
  createContext<LanguageContextValue | null>(null);

const LocaleScopeContext = createContext<LocaleScope>(PUBLIC_LOCALE_SCOPE);

function normalizeLanguage(value: string | null): Language {
  return isValidLocale(value) ? value : defaultLocale;
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultLocale;
  }

  try {
    return normalizeLanguage(
      window.localStorage.getItem(PUBLIC_LOCALE_STORAGE_KEY)
    );
  } catch {
    return ADMIN_LOCALE;
  }
}

function persistLanguage(language: Language) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, language);
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
    useState<Language>(initialLanguage || defaultLocale);

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
    document.documentElement.lang = ADMIN_LOCALE;
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: ADMIN_LOCALE,
      setLanguage: () => {
        document.documentElement.lang = ADMIN_LOCALE;
      },
      t: (key: TranslationKey | string) => translate(ADMIN_LOCALE, key),
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
  scope = PUBLIC_LOCALE_SCOPE,
  initialLanguage,
}: {
  children: React.ReactNode;
  scope?: LocaleScope;
  initialLanguage?: Language | null;
}) {
  if (scope === ADMIN_LOCALE_SCOPE) {
    return (
      <LocaleScopeContext.Provider value={ADMIN_LOCALE_SCOPE}>
        <AdminLocaleProvider>{children}</AdminLocaleProvider>
      </LocaleScopeContext.Provider>
    );
  }

  return (
    <LocaleScopeContext.Provider value={PUBLIC_LOCALE_SCOPE}>
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
  const context = scope === ADMIN_LOCALE_SCOPE ? adminLocale : publicLocale;

  if (!context) {
    throw new Error(
      "useTranslation must be used inside LanguageProvider"
    );
  }

  return context;
}

export const useLanguage = useTranslation;
