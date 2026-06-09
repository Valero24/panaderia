import Link from "next/link";
import type { Metadata } from "next";

import TranslatedText from "@/components/TranslatedText";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Confirmacion | Cartagena Tailored Travel",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConfirmacionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6 py-12">
      <Card className="premium-reveal w-full max-w-2xl rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
        <CardContent className="space-y-6 p-8 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
            <TranslatedText k="confirmation.eyebrow" />
          </p>

          <h1 className="text-4xl font-bold text-[#0D2B52] sm:text-5xl">
            <TranslatedText k="confirmation.title" />
          </h1>

          <p className="leading-8 text-slate-600">
            <TranslatedText k="confirmation.text" />
          </p>

          <div className="space-y-2 rounded-2xl border border-[#D4AF37]/20 p-6 text-left text-sm leading-7 text-slate-700">
            <p>
              <strong className="text-[#0D2B52]">
                <TranslatedText k="confirmation.statusLabel" />:
              </strong>{" "}
              <TranslatedText k="confirmation.statusValue" />
            </p>
            <p>
              <strong className="text-[#0D2B52]">
                <TranslatedText k="confirmation.nextStepLabel" />:
              </strong>{" "}
              <TranslatedText k="confirmation.nextStepValue" />
            </p>
            <p>
              <strong className="text-[#0D2B52]">
                <TranslatedText k="confirmation.channelsLabel" />:
              </strong>{" "}
              <TranslatedText k="confirmation.channelsValue" />
            </p>
          </div>

          <Link href="/">
            <Button className="premium-soft-button h-12 rounded-xl bg-[#0D2B52] px-8 hover:bg-[#12396d]">
              <TranslatedText k="confirmation.backHome" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
