import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import { siteUrl, socialMetadata } from "@/lib/seo";

const defaultTitle = "Cartagena Tailored Travel";
const defaultDescription =
  "Luxury travel in Cartagena with premium villas, curated experiences, private packages and personalized travel assistance.";
const defaultSocial = socialMetadata({
  title: defaultTitle,
  description: defaultDescription,
  url: siteUrl,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Cartagena Tailored Travel",
  },
  description: defaultDescription,
  icons: {
    icon: "/branding/LOGO-06.png",
    shortcut: "/branding/LOGO-06.png",
    apple: "/branding/LOGO-06.png",
  },
  openGraph: defaultSocial.openGraph,
  twitter: defaultSocial.twitter,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F8F6F1]">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
