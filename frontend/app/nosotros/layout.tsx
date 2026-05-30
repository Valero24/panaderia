import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros | Cartagena Tailored Travel",
  description:
    "Conoce Cartagena Tailored Travel, plataforma de viajes premium con atención personalizada, alojamientos seleccionados, experiencias locales y paquetes turísticos en Cartagena.",
  openGraph: {
    title: "Nosotros | Cartagena Tailored Travel",
    description:
      "Viajes premium asistidos en Cartagena con atención humana, validación personalizada y servicios turísticos a medida.",
    images: [
      {
        url: "/branding/LOGO-12.png",
        width: 1200,
        height: 630,
        alt: "Cartagena Tailored Travel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nosotros | Cartagena Tailored Travel",
    description:
      "Plataforma de viajes premium asistidos en Cartagena.",
    images: ["/branding/LOGO-12.png"],
  },
};

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
