import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/schema";

const title = "Luxury Accommodations in Cartagena | Cartagena Tailored Travel";
const description =
  "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/alojamientos"),
  image: {
    url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Luxury accommodation in Cartagena",
  },
});
const collectionSchema = buildCollectionPageSchema({
  name: title,
  description,
  url: "/alojamientos",
  image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/alojamientos"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function AlojamientosLayout({
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
