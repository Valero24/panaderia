import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paquetes turísticos premium en Cartagena",
  description:
    "Descubre paquetes de lujo en Cartagena con alojamientos, experiencias, islas y atención personalizada.",
  openGraph: {
    title: "Paquetes turísticos premium en Cartagena",
    description:
      "Viajes a medida, escapadas románticas y paquetes privados para Cartagena.",
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
    title: "Paquetes turísticos premium en Cartagena",
    description:
      "Viajes a medida, escapadas románticas y paquetes privados para Cartagena.",
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
