import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { buildMetadata } from "@/lib/seo";

const title = "Luxury Travel Packages in Cartagena";
const description =
  "Personalized luxury travel packages combining accommodation, tours and premium experiences.";
export const metadata: Metadata = buildMetadata({
  title,
  description,
  url: localizedRoutePath("package", "es"),
  image: {
    url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Premium travel package in Cartagena",
  },
  languages: localizedAlternates("package").languages,
});
export default function PaquetesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
