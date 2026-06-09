import type { Metadata } from "next";

import { localizedAlternates } from "@/lib/i18n-seo";
import { buildMetadata } from "@/lib/seo";

const title = "About Cartagena Tailored Travel";
const description =
  "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.";
export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/nosotros",
  languages: localizedAlternates("about").languages,
});

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
