"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type JourneyTone = "property" | "experience" | "package";

type Collection = {
  title: string;
  text: string;
  slug?: string;
  countLabel?: string;
};

type PublicJourneyHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  tone: JourneyTone;
  customizeLabel: string;
  advisorLabel: string;
  resultLabel?: string;
  highlights?: string[];
  collectionsTitle: string;
  collections: Collection[];
  journeyLabel: string;
  journeySteps: string[];
  onCollectionSelect?: (slug: string) => void;
};

const toneStyles: Record<
  JourneyTone,
  {
    shell: string;
    accent: string;
    badge: string;
    glow: string;
  }
> = {
  property: {
    shell: "from-[#F8F6F1] via-white to-[#EEF4F8]",
    accent: "text-[#B48A5A]",
    badge: "bg-[#0D2B52] text-white",
    glow: "bg-[#D4AF37]/20",
  },
  experience: {
    shell: "from-[#F8F6F1] via-white to-[#F5EEF8]",
    accent: "text-[#A76F93]",
    badge: "bg-[#7D3F67] text-white",
    glow: "bg-[#D4AF37]/18",
  },
  package: {
    shell: "from-[#F8F6F1] via-white to-[#F8F1E9]",
    accent: "text-[#B48A5A]",
    badge: "bg-[#6F4E2E] text-white",
    glow: "bg-[#C78B45]/20",
  },
};

export default function PublicJourneyHeader({
  eyebrow,
  title,
  subtitle,
  tone,
  customizeLabel,
  advisorLabel,
  resultLabel,
  highlights = [],
  collectionsTitle,
  collections,
  journeyLabel,
  journeySteps,
  onCollectionSelect,
}: PublicJourneyHeaderProps) {
  const styles = toneStyles[tone];

  return (
    <section
      className={`relative overflow-hidden rounded-[24px] border border-[#D4AF37]/20 bg-gradient-to-br ${styles.shell} p-4 shadow-sm sm:rounded-[34px] sm:p-7 lg:p-9`}
    >
      <div className={`absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full ${styles.glow} blur-3xl`} />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className={`max-w-full text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.28em] ${styles.accent}`}>
              {eyebrow}
            </p>
            {resultLabel && (
              <span className="w-fit rounded-full border border-[#D4AF37]/25 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0D2B52] shadow-sm">
                {resultLabel}
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-[#0D2B52] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {subtitle}
          </p>

          {highlights.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-[#D4AF37]/20 bg-white/75 px-4 py-2 text-sm font-medium text-[#0D2B52] shadow-sm"
                >
                  {highlight}
                </span>
              ))}
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#listado-filtros">
              <Button
                type="button"
                className={`h-12 w-full rounded-full px-6 sm:w-auto ${styles.badge} hover:opacity-95`}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {customizeLabel}
              </Button>
            </a>
            <Link href="/contacto">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-full border-[#D4AF37]/40 bg-white px-6 text-[#0D2B52] shadow-sm hover:bg-[#FFFDF8] sm:w-auto"
              >
                <MessageCircle className="mr-2 h-4 w-4 text-[#B48A5A]" />
                {advisorLabel}
              </Button>
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-[#D4AF37]/20 bg-white/80 p-4 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
            <CalendarCheck className="h-4 w-4" />
            {journeyLabel}
          </div>
          <div className="mt-5 space-y-4">
            {journeySteps.map(
              (step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D2B52] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium text-[#0D2B52]">{step}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {collections.length > 0 && (
      <div className="relative mt-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#B48A5A]">
          {collectionsTitle}
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {collections.map((collection) => {
            const clickable = Boolean(collection.slug && onCollectionSelect);
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-[#0D2B52]">
                    {collection.title}
                  </h3>
                  {collection.countLabel && (
                    <span className="shrink-0 rounded-full bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-semibold text-[#8A6A24]">
                      {collection.countLabel}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {collection.text}
                </p>
              </>
            );

            return clickable ? (
              <button
                key={collection.slug || collection.title}
                type="button"
                onClick={() => onCollectionSelect?.(collection.slug!)}
                className="min-w-0 rounded-2xl border border-[#D4AF37]/15 bg-white/75 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#D4AF37]/45 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35"
              >
                {content}
              </button>
            ) : (
              <div
                key={collection.title}
                className="min-w-0 rounded-2xl border border-[#D4AF37]/15 bg-white/75 p-4 shadow-sm"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </section>
  );
}
