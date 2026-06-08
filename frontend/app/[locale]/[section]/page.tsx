import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AlojamientosPage from "@/app/alojamientos/page";
import BlogPage from "@/app/blog/page";
import ContactoPage from "@/app/contacto/page";
import DestinosPage from "@/app/destinos/page";
import ExperienciasPage from "@/app/experiencias/page";
import NosotrosPage from "@/app/nosotros/page";
import PaquetesPage from "@/app/paquetes/page";
import JsonLd from "@/components/JsonLd";
import type { Language } from "@/i18n";
import {
  isPublicLocale,
  localizedRoutePath,
  localizedSectionKind,
  publicLocales,
  type PublicRouteKind,
} from "@/lib/i18n-routes";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/schema";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string; section: string }>;
  searchParams?: Promise<{ features?: string }>;
};

type ListKind = Exclude<PublicRouteKind, "home">;

const listSeo: Record<
  ListKind,
  Record<Language, { title: string; description: string; image: string }>
> = {
  property: {
    es: {
      title: "Alojamientos de lujo en Cartagena | Cartagena Tailored Travel",
      description:
        "Explora villas, apartamentos y alojamientos premium en Cartagena con asistencia personalizada.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Luxury Accommodations in Cartagena | Cartagena Tailored Travel",
      description:
        "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Hebergements de luxe a Cartagena | Cartagena Tailored Travel",
      description:
        "Explorez villas, appartements et sejours premium a Cartagena avec assistance personnalisee.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Acomodacoes de luxo em Cartagena | Cartagena Tailored Travel",
      description:
        "Explore villas, apartamentos e hospedagens premium em Cartagena com assistencia personalizada.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Alloggi di lusso a Cartagena | Cartagena Tailored Travel",
      description:
        "Esplora ville, appartamenti e soggiorni premium a Cartagena con assistenza personalizzata.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    },
  },
  experience: {
    es: {
      title: "Tours privados y experiencias en Cartagena",
      description:
        "Experiencias de lujo, yates, gastronomia y tours exclusivos en Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Private Tours & Experiences in Cartagena",
      description:
        "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Tours prives et experiences a Cartagena",
      description:
        "Experiences de luxe, location de yachts, gastronomie et visites exclusives a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Tours privados e experiencias em Cartagena",
      description:
        "Experiencias de luxo, aluguel de iates, gastronomia e tours exclusivos em Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Tour privati ed esperienze a Cartagena",
      description:
        "Esperienze di lusso, yacht, gastronomia e tour esclusivi a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
  },
  package: {
    es: {
      title: "Paquetes de viaje de lujo en Cartagena",
      description:
        "Paquetes personalizados que combinan alojamiento, tours y experiencias premium en Cartagena.",
      image:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Luxury Travel Packages in Cartagena",
      description:
        "Personalized luxury travel packages combining accommodation, tours and premium experiences.",
      image:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Forfaits de voyage de luxe a Cartagena",
      description:
        "Forfaits personnalises combinant hebergement, visites et experiences premium a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Pacotes de viagem de luxo em Cartagena",
      description:
        "Pacotes personalizados que combinam acomodacao, tours e experiencias premium.",
      image:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Pacchetti di viaggio di lusso a Cartagena",
      description:
        "Pacchetti personalizzati con alloggi, tour ed esperienze premium a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    },
  },
  destination: {
    es: {
      title: "Destinos en Cartagena | Cartagena Tailored Travel",
      description:
        "Explora zonas, barrios y lugares turisticos de Cartagena para planear alojamientos, experiencias y paquetes personalizados.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Destinations in Cartagena | Cartagena Tailored Travel",
      description:
        "Explore Cartagena neighborhoods, areas and landmarks to plan premium stays, tours and packages.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Destinations a Cartagena | Cartagena Tailored Travel",
      description:
        "Explorez les quartiers, zones et lieux touristiques de Cartagena pour planifier votre voyage.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Destinos em Cartagena | Cartagena Tailored Travel",
      description:
        "Explore bairros, zonas e pontos turisticos de Cartagena para planejar sua viagem premium.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Destinazioni a Cartagena | Cartagena Tailored Travel",
      description:
        "Esplora quartieri, zone e luoghi turistici di Cartagena per pianificare il viaggio.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
  },
  blog: {
    es: {
      title: "Blog de viajes en Cartagena | Cartagena Tailored Travel",
      description:
        "Guias, consejos y recomendaciones para disfrutar Cartagena con alojamientos premium, tours privados y experiencias personalizadas.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Cartagena Travel Blog | Cartagena Tailored Travel",
      description:
        "Guides, tips and recommendations to enjoy Cartagena with premium stays, private tours and tailored experiences.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Blog de voyage a Cartagena | Cartagena Tailored Travel",
      description:
        "Guides, conseils et recommandations pour profiter de Cartagena avec des experiences premium.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Blog de viagens em Cartagena | Cartagena Tailored Travel",
      description:
        "Guias, dicas e recomendacoes para aproveitar Cartagena com hospedagens e tours premium.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Blog di viaggio a Cartagena | Cartagena Tailored Travel",
      description:
        "Guide, consigli e raccomandazioni per vivere Cartagena con soggiorni e tour premium.",
      image:
        "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200",
    },
  },
  about: {
    es: {
      title: "Nosotros | Cartagena Tailored Travel",
      description:
        "Agencia especializada en turismo de lujo, tours privados y alojamientos premium en Cartagena.",
      image:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "About Cartagena Tailored Travel",
      description:
        "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.",
      image:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "A propos de Cartagena Tailored Travel",
      description:
        "Agence specialisee en tourisme de luxe, tours prives et hebergements premium a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Sobre a Cartagena Tailored Travel",
      description:
        "Agencia especializada em turismo de luxo, tours privados e acomodacoes premium em Cartagena.",
      image:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Chi siamo | Cartagena Tailored Travel",
      description:
        "Agenzia specializzata in turismo di lusso, tour privati e alloggi premium a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    },
  },
  contact: {
    es: {
      title: "Contacto | Cartagena Tailored Travel",
      description:
        "Contacta a nuestros asesores para planear tu experiencia de lujo en Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    en: {
      title: "Contact Cartagena Tailored Travel",
      description:
        "Get in touch with our advisors to plan your luxury experience in Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    fr: {
      title: "Contact | Cartagena Tailored Travel",
      description:
        "Contactez nos conseillers pour planifier votre experience de luxe a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    pt: {
      title: "Contato | Cartagena Tailored Travel",
      description:
        "Fale com nossos assessores para planejar sua experiencia de luxo em Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
    it: {
      title: "Contatto | Cartagena Tailored Travel",
      description:
        "Contatta i nostri consulenti per pianificare la tua esperienza di lusso a Cartagena.",
      image:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    },
  },
};

function languageAlternates(kind: ListKind) {
  return Object.fromEntries(
    publicLocales.map((locale) => [
      locale,
      canonicalUrl(localizedRoutePath(kind, locale)),
    ])
  );
}

async function resolveKind(params: PageProps["params"]) {
  const { locale, section } = await params;

  if (!isPublicLocale(locale)) return null;

  const kind = localizedSectionKind(locale, section);

  if (!kind) return null;

  return { locale, kind };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolved = await resolveKind(params);

  if (!resolved) {
    return { robots: { index: false, follow: false } };
  }

  const { locale, kind } = resolved;
  const copy = listSeo[kind][locale] || listSeo[kind].es;
  const url = canonicalUrl(localizedRoutePath(kind, locale));
  const social = socialMetadata({
    title: copy.title,
    description: copy.description,
    url,
    image: copy.image,
  });

  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: {
        ...languageAlternates(kind),
        "x-default": canonicalUrl(localizedRoutePath(kind, "en")),
      },
    },
    openGraph: social.openGraph,
    twitter: social.twitter,
  };
}

export default async function LocalizedListPage({
  params,
  searchParams,
}: PageProps) {
  const resolved = await resolveKind(params);

  if (!resolved) {
    notFound();
  }

  const { locale, kind } = resolved;
  const copy = listSeo[kind][locale] || listSeo[kind].es;
  const schema = buildCollectionPageSchema({
    name: copy.title,
    description: copy.description,
    url: localizedRoutePath(kind, locale),
    image: copy.image,
  });

  if (kind === "property") {
    return (
      <>
        <JsonLd data={schema} />
        <AlojamientosPage searchParams={searchParams} />
      </>
    );
  }

  if (kind === "experience") {
    return (
      <>
        <JsonLd data={schema} />
        <ExperienciasPage searchParams={searchParams} />
      </>
    );
  }

  if (kind === "package") {
    return (
      <>
        <JsonLd data={schema} />
        <PaquetesPage searchParams={searchParams} />
      </>
    );
  }

  if (kind === "blog") {
    return <BlogPage locale={locale as Language} />;
  }

  if (kind === "about") {
    return <NosotrosPage locale={locale as Language} />;
  }

  if (kind === "contact") {
    return <ContactoPage />;
  }

  return (
    <>
      <JsonLd data={schema} />
      <DestinosPage locale={locale as Language} />
    </>
  );
}
