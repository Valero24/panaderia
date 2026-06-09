import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { buildMetadata } from "@/lib/seo";

const title = "Contact Cartagena Tailored Travel";
const description =
  "Get in touch with our advisors to plan your luxury experience in Cartagena.";
export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/contacto",
  languages: localizedAlternates("contact").languages,
});

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
