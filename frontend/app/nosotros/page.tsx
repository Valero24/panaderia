import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TranslatedText from "@/components/TranslatedText";

const pillars = [
  {
    title: "about.pillarPersonalized",
    text: "about.pillarPersonalizedText",
    icon: HeartHandshake,
  },
  {
    title: "about.pillarSelection",
    text: "about.pillarSelectionText",
    icon: Sparkles,
  },
  {
    title: "about.pillarOperation",
    text: "about.pillarOperationText",
    icon: ShieldCheck,
  },
];

const steps = [
  "about.step1",
  "about.step2",
  "about.step3",
  "about.step4",
];

export default function NosotrosPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section id="nosotros-hero" data-scroll-section className="premium-reveal mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#B48A5A]">
            Cartagena Tailored Travel
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            <TranslatedText k="about.heroTitle" />
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            <TranslatedText k="about.heroText" />
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/paquetes">
              <Button className="h-12 rounded-xl bg-[#0D2B52] px-6 hover:bg-[#12396d]">
                <TranslatedText k="home.viewAllPackages" />
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contacto">
              <Button
                variant="outline"
                className="h-12 rounded-xl border-[#D4AF37]/40 bg-white px-6"
              >
                <TranslatedText k="home.planJourney" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="premium-hover-lift rounded-3xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm sm:p-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#EFE8DC]">
            <Image
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=900"
              alt="Cartagena Tailored Travel"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              quality={72}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D2B52]/30 via-transparent to-transparent" />
          </div>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F8F6F1] p-4">
              <MapPin className="h-5 w-5 text-[#B48A5A]" />
              <p className="mt-2 font-semibold text-[#0D2B52]">Cartagena</p>
              <p className="mt-1">
                <TranslatedText k="about.localKnowledge" />
              </p>
            </div>
            <div className="rounded-2xl bg-[#F8F6F1] p-4">
              <Compass className="h-5 w-5 text-[#B48A5A]" />
              <p className="mt-2 font-semibold text-[#0D2B52]">
                <TranslatedText k="about.tailoredTrips" />
              </p>
              <p className="mt-1">
                <TranslatedText k="about.tailoredTripsText" />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="nosotros-quienes" data-scroll-section className="premium-scroll-reveal mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <Card
                key={pillar.title}
                className="premium-hover-lift rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm"
              >
                <CardContent className="p-6">
                  <Icon className="h-6 w-6 text-[#B48A5A]" />
                  <h2 className="mt-4 text-xl font-semibold">
                    <TranslatedText k={pillar.title as any} />
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    <TranslatedText k={pillar.text as any} />
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="premium-scroll-reveal bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Card className="premium-hover-lift rounded-3xl border border-[#D4AF37]/20 shadow-sm">
            <CardContent className="p-6 lg:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                <TranslatedText k="about.missionEyebrow" />
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                <TranslatedText k="about.missionTitle" />
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                <TranslatedText k="about.missionText" />
              </p>
            </CardContent>
          </Card>

          <Card className="premium-hover-lift rounded-3xl border border-[#D4AF37]/20 shadow-sm">
            <CardContent className="p-6 lg:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
                <TranslatedText k="about.visionEyebrow" />
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                <TranslatedText k="about.visionTitle" />
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                <TranslatedText k="about.visionText" />
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="nosotros-como" data-scroll-section className="premium-scroll-reveal mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
              <TranslatedText k="about.howEyebrow" />
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              <TranslatedText k="about.howTitle" />
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              <TranslatedText k="about.howText" />
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="grid gap-4 rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D2B52] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="leading-7 text-slate-600">
                  <TranslatedText k={step as any} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros-por-que" data-scroll-section className="premium-scroll-reveal mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-[#0D2B52] text-white shadow-sm">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#D4AF37]">
                <TranslatedText k="about.whyEyebrow" />
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  "about.reason1",
                  "about.reason2",
                  "about.reason3",
                  "about.reason4",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                    <p className="leading-7 text-slate-100">
                      <TranslatedText k={item as any} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/contacto">
              <Button className="h-12 rounded-xl bg-[#D4AF37] px-6 text-[#0D2B52] hover:bg-[#c6a032]">
                <Users className="mr-2 h-4 w-4" />
                <TranslatedText k="home.planJourney" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
