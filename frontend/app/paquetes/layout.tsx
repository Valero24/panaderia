import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Luxury Travel Packages in Cartagena",
  },
  description:
    "Personalized luxury travel packages combining accommodation, tours and premium experiences.",
  openGraph: {
    title: "Luxury Travel Packages in Cartagena",
    description:
      "Personalized luxury travel packages combining accommodation, tours and premium experiences.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
        width: 1600,
        height: 900,
        alt: "Paquete premium en Cartagena",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luxury Travel Packages in Cartagena",
    description:
      "Personalized luxury travel packages combining accommodation, tours and premium experiences.",
    images: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=1200",
    ],
  },
};

export default function PaquetesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
