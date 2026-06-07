import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Cartagena Tailored Travel",
  },
  description:
    "Get in touch with our advisors to plan your luxury experience in Cartagena.",
  openGraph: {
    title: "Contact Cartagena Tailored Travel",
    description:
      "Get in touch with our advisors to plan your luxury experience in Cartagena.",
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
    title: "Contact Cartagena Tailored Travel",
    description:
      "Get in touch with our advisors to plan your luxury experience in Cartagena.",
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
