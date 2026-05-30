import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto | Planea tu viaje premium a Cartagena",
  description:
    "Habla con un asesor de viajes para planear alojamientos, experiencias y paquetes premium en Cartagena.",
  openGraph: {
    title: "Contacto | Cartagena Tailored Travel",
    description:
      "Cuéntanos qué estás imaginando para Cartagena y un asesor de viajes te acompañará.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
        width: 1600,
        height: 900,
        alt: "Cartagena premium travel assistance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contacto | Cartagena Tailored Travel",
    description:
      "Planea alojamientos, experiencias y paquetes premium en Cartagena.",
    images: [
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=1200",
    ],
  },
};

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
