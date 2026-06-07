import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Private Tours & Experiences in Cartagena",
  },
  description:
    "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.",
  openGraph: {
    title: "Private Tours & Experiences in Cartagena",
    description:
      "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
        width: 1600,
        height: 900,
        alt: "Experiencia premium en Cartagena",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Tours & Experiences in Cartagena",
    description:
      "Luxury experiences, yacht rentals, gastronomy and exclusive tours in Cartagena.",
    images: [
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=70&w=1200",
    ],
  },
};

export default function ExperienciasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
