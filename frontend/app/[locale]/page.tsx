import type { Metadata } from "next";
import { notFound } from "next/navigation";

import HomePage from "@/app/page";
import type { Language } from "@/i18n";
import {
  isPublicLocale,
  localizedRoutePath,
  publicLocales,
} from "@/lib/i18n-routes";
import { buildMetadata, canonicalUrl } from "@/lib/seo";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string }>;
};

const homeSeo: Record<Language, { title: string; description: string }> = {
  es: {
    title: "Cartagena Tailored Travel | Turismo de lujo en Cartagena",
    description:
      "Tours privados, alojamientos de lujo y experiencias unicas en Cartagena, Colombia.",
  },
  en: {
    title: "Cartagena Tailored Travel | Luxury Travel in Cartagena",
    description:
      "Private tours, luxury accommodations and unique experiences in Cartagena, Colombia.",
  },
  fr: {
    title: "Cartagena Tailored Travel | Tourisme de luxe a Cartagena",
    description:
      "Visites privees, hebergements de luxe et experiences uniques a Cartagena, Colombie.",
  },
  pt: {
    title: "Cartagena Tailored Travel | Turismo de luxo em Cartagena",
    description:
      "Tours privados, acomodacoes de luxo e experiencias unicas em Cartagena, Colombia.",
  },
  it: {
    title: "Cartagena Tailored Travel | Turismo di lusso a Cartagena",
    description:
      "Tour privati, alloggi di lusso ed esperienze uniche a Cartagena, Colombia.",
  },
};

function languageAlternates(kind: "home", identifier?: string | number | null) {
  return Object.fromEntries(
    publicLocales.map((locale) => [
      locale,
      canonicalUrl(localizedRoutePath(kind, locale, identifier)),
    ])
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    return { robots: { index: false, follow: false } };
  }

  const copy = homeSeo[locale];
  const url = canonicalUrl(localizedRoutePath("home", locale));

  return buildMetadata({
    title: copy.title,
    description: copy.description,
    url,
    locale,
    languages: {
      ...languageAlternates("home"),
      "x-default": canonicalUrl(localizedRoutePath("home", "es")),
    },
  });
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    notFound();
  }

  return <HomePage locale={locale as Language} />;
}
