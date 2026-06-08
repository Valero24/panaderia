import type { Metadata } from "next";

import { canonicalUrl, socialMetadata } from "@/lib/seo";

const title = "Contact Cartagena Tailored Travel";
const description =
  "Get in touch with our advisors to plan your luxury experience in Cartagena.";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/es/contacto"),
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/es/contacto"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
