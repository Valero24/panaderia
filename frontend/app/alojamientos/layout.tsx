import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alojamientos de lujo en Cartagena",
  description:
    "Explora villas privadas, apartamentos premium y alojamientos verificados en Cartagena con atención personalizada.",
  openGraph: {
    title: "Alojamientos de lujo en Cartagena",
    description:
      "Villas privadas, casas premium y estadías verificadas para viajes de lujo en Cartagena.",
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
    title: "Alojamientos de lujo en Cartagena",
    description:
      "Villas privadas, casas premium y estadías verificadas para viajes de lujo en Cartagena.",
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
