import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/schema";

const title = "Luxury Travel Packages in Cartagena";
const description =
  "Personalized luxury travel packages combining accommodation, tours and premium experiences.";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/es/paquetes"),
  image: {
    url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Premium travel package in Cartagena",
  },
});
const collectionSchema = buildCollectionPageSchema({
  name: title,
  description,
  url: "/paquetes",
  image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/es/paquetes"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function PaquetesLayout({
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
