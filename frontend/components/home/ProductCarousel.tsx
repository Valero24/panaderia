"use client";

import { Children, ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";

type ProductCarouselProps = {
  children: ReactNode;
};

export default function ProductCarousel({ children }: ProductCarouselProps) {
  const { t } = useTranslation();
  const items = Children.toArray(children);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  function clearResumeTimer() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  function temporarilyPause() {
    setPaused(true);
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setPaused(false);
    }, 5000);
  }

  function scroll(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const firstCard = scroller.querySelector("[data-carousel-item]") as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width || scroller.clientWidth;
    const gap = 24;
    const distance = cardWidth + gap;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;

    if (direction === "right") {
      if (scroller.scrollLeft >= maxScroll - 8) {
        scroller.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      scroller.scrollBy({ left: distance, behavior: "smooth" });
      return;
    }

    if (scroller.scrollLeft <= 8) {
      scroller.scrollTo({ left: maxScroll, behavior: "smooth" });
      return;
    }

    scroller.scrollBy({ left: -distance, behavior: "smooth" });
  }

  useEffect(() => {
    if (items.length <= 1 || paused) return;

    const interval = setInterval(() => {
      scroll("right");
    }, 3000);

    return () => clearInterval(interval);
  }, [items.length, paused]);

  useEffect(() => {
    return () => clearResumeTimer();
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="group/carousel relative"
      onMouseEnter={() => {
        clearResumeTimer();
        setPaused(true);
      }}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={temporarilyPause}
      onPointerDown={temporarilyPause}
    >
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
      >
        {items.map((item, index) => (
          <div
            key={index}
            data-carousel-item
            className="min-w-0 shrink-0 basis-full snap-start md:basis-[calc((100%_-_1.5rem)_/_2)] xl:basis-[calc((100%_-_3rem)_/_3)]"
          >
            {item}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => {
              temporarilyPause();
              scroll("left");
            }}
            className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-white/95 text-[#0D2B52] shadow-lg backdrop-blur transition hover:-translate-x-0.5 hover:border-[#B48A5A] hover:bg-[#0D2B52] hover:text-white md:flex"
            aria-label={t("carousel.previous")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              temporarilyPause();
              scroll("right");
            }}
            className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-white/95 text-[#0D2B52] shadow-lg backdrop-blur transition hover:translate-x-0.5 hover:border-[#B48A5A] hover:bg-[#0D2B52] hover:text-white md:flex"
            aria-label={t("carousel.next")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
