import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Luxury Accommodations in Cartagena | Cartagena Tailored Travel",
  },
  description:
    "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.",
  openGraph: {
    title: "Luxury Accommodations in Cartagena | Cartagena Tailored Travel",
    description:
      "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
        width: 1600,
        height: 900,
        alt: "Alojamiento premium en Cartagena",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luxury Accommodations in Cartagena | Cartagena Tailored Travel",
    description:
      "Explore premium villas, apartments and luxury stays in Cartagena with personalized assistance.",
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=70&w=1200",
    ],
  },
};

export default function AlojamientosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
