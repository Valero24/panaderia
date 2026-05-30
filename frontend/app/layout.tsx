import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://cartagenatailoredtravel.com"),
  title: {
    default: "Cartagena Tailored Travel",
    template: "%s | Cartagena Tailored Travel",
  },
  description:
    "Luxury travel in Cartagena with premium villas, curated experiences, private packages and personalized travel assistance.",
  icons: {
    icon: "/branding/LOGO-06.png",
    shortcut: "/branding/LOGO-06.png",
    apple: "/branding/LOGO-06.png",
  },
  openGraph: {
    title: "Cartagena Tailored Travel",
    description:
      "Premium villas, private experiences and tailored travel planning in Cartagena, Colombia.",
    url: "https://cartagenatailoredtravel.com",
    siteName: "Cartagena Tailored Travel",
    images: [
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1600",
        width: 1600,
        height: 900,
        alt: "Luxury travel experience in Cartagena",
      },
    ],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cartagena Tailored Travel",
    description:
      "Premium villas, private experiences and tailored travel planning in Cartagena, Colombia.",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=1600",
    ],
  },
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
