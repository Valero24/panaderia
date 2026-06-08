import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/schema";

const title = "Destinos en Cartagena | Cartagena Tailored Travel";
const description =
  "Explora zonas, barrios y lugares turísticos de Cartagena para planear alojamientos, experiencias y paquetes personalizados.";
const image =
  "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/es/destinos"),
  image: {
    url: image,
    width: 1200,
    height: 630,
    alt: "Destinos turisticos de Cartagena",
  },
});
const collectionSchema = buildCollectionPageSchema({
  name: title,
  description,
  url: "/destinos",
  image,
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/es/destinos"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function DestinosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={collectionSchema} />
      {children}
    </>
  );
}
