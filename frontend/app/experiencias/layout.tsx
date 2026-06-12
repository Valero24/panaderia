import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { buildMetadata } from "@/lib/seo";

const title = "Private Tours & Experiences in Cartagena";
const description =
  "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.";
export const metadata: Metadata = buildMetadata({
  title,
  description,
  url: localizedRoutePath("experience", "es"),
  image: {
    url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Premium experience in Cartagena",
  },
  languages: localizedAlternates("experience").languages,
});
export default function ExperienciasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
