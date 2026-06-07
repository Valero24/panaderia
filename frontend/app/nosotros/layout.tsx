import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "About Cartagena Tailored Travel",
  },
  description:
    "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.",
  openGraph: {
    title: "About Cartagena Tailored Travel",
    description:
      "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.",
    images: [
      {
        url: "/branding/LOGO-12.png",
        width: 1200,
        height: 630,
        alt: "Cartagena Tailored Travel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Cartagena Tailored Travel",
    description:
      "Agency specialized in luxury tourism, private tours and premium accommodations in Cartagena.",
    images: ["/branding/LOGO-12.png"],
  },
};

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
