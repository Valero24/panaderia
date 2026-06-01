import Link from "next/link";

import TranslatedText from "@/components/TranslatedText";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutIndexPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F1] px-6 py-16 text-[#0D2B52]">
      <section className="premium-reveal mx-auto max-w-3xl">
        <Card className="premium-hover-lift rounded-lg border border-[#D4AF37]/20 bg-white shadow-sm">
          <CardContent className="p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.32em] text-[#B68D40]">
              <TranslatedText k="checkout.eyebrow" />
            </p>

            <h1 className="mt-4 text-4xl font-semibold">
              <TranslatedText k="checkoutIndex.title" />
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              <TranslatedText k="checkoutIndex.text" />
            </p>

            <Link href="/alojamientos">
              <Button className="premium-soft-button mt-8 h-12 rounded-md bg-[#0D2B52] px-8 hover:bg-[#12396d]">
                <TranslatedText k="checkoutIndex.cta" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
