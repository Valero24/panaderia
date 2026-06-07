import type { Metadata } from "next";

import { canonicalUrl, socialMetadata } from "@/lib/seo";

const title = "About Cartagena Tailored Travel";
const description =
  "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.";
const social = socialMetadata({
  title,
  description,
  url: canonicalUrl("/nosotros"),
});

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: canonicalUrl("/nosotros"),
  },
  openGraph: social.openGraph,
  twitter: social.twitter,
};

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
