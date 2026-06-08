import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/schema";

const title = "Private Tours & Experiences in Cartagena";
const description =
  "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/es/experiencias"),
  image: {
    url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Premium experience in Cartagena",
  },
});
const collectionSchema = buildCollectionPageSchema({
  name: title,
  description,
  url: "/experiencias",
  image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/es/experiencias"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function ExperienciasLayout({
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
