import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import { API_URL } from "@/lib/api";
import { siteUrl, socialMetadata } from "@/lib/seo";

const defaultTitle = "Cartagena Tailored Travel";
const defaultDescription =
  "Luxury travel in Cartagena with premium villas, curated experiences, private packages and personalized travel assistance.";
const defaultSocial = socialMetadata({
  title: defaultTitle,
  description: defaultDescription,
  url: siteUrl,
});

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

const apiOrigin = safeOrigin(API_URL);

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
      <head>
        {apiOrigin && (
          <>
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F6F1]">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
