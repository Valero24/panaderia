import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiencias premium en Cartagena",
  description:
    "Reserva experiencias privadas en Cartagena: islas, cenas, recorridos históricos, yates y planes diseñados a la medida.",
  openGraph: {
    title: "Experiencias premium en Cartagena",
    description:
      "Planes privados, experiencias VIP y actividades a la medida en Cartagena.",
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
    title: "Experiencias premium en Cartagena",
    description:
      "Planes privados, experiencias VIP y actividades a la medida en Cartagena.",
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
