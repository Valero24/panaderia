import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { buildMetadata } from "@/lib/seo";

const title = "Luxury Accommodations in Cartagena | Cartagena Tailored Travel";
const description =
  "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.";
export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/alojamientos",
  image: {
    url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    width: 1200,
    height: 630,
    alt: "Luxury accommodation in Cartagena",
  },
  languages: localizedAlternates("property").languages,
});
export default function AlojamientosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
