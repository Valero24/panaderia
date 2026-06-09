import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { buildMetadata } from "@/lib/seo";

const title = "Destinations in Cartagena | Cartagena Tailored Travel";
const description =
  "Explore Cartagena neighborhoods, islands and tourist areas to plan your stay and experiences.";
const image =
  "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/destinos",
  image: {
    url: image,
    width: 1200,
    height: 630,
    alt: "Destinations in Cartagena",
  },
  languages: localizedAlternates("destination").languages,
});

export default function DestinosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
