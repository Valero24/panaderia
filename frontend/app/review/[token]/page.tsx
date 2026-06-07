import type { Metadata } from "next";

import ReviewTokenClient from "./ReviewTokenClient";

export const metadata: Metadata = {
  title: "Reseña verificada | Cartagena Tailored Travel",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ReviewTokenPage({ params }: PageProps) {
  const { token } = await params;

  return <ReviewTokenClient token={token} />;
}
