"use client";

import {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";

type ProductCarouselProps = {
  children: ReactNode;
};

export default function ProductCarousel({ children }: ProductCarouselProps) {
  const { t } = useTranslation();
  const items = useMemo(() => Children.toArray(children), [children]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const temporarilyPause = useCallback(() => {
    setPaused(true);
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setPaused(false);
    }, 5000);
  }, [clearResumeTimer]);

  const scroll = useCallback((direction: "left" | "right") => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const firstCard = scroller.querySelector("[data-carousel-item]") as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width || scroller.clientWidth;
    const gap = Number.parseFloat(window.getComputedStyle(scroller).columnGap || "24") || 24;
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
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReducedMotion(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        rootMargin: "180px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(carousel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (items.length <= 1 || paused || !inView || reducedMotion) return;

    const interval = setInterval(() => {
      scroll("right");
    }, 3000);

    return () => clearInterval(interval);
  }, [inView, items.length, paused, reducedMotion, scroll]);

  useEffect(() => {
    return () => clearResumeTimer();
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      ref={carouselRef}
      className="group/carousel relative premium-reveal lg:mx-auto lg:max-w-6xl xl:max-w-7xl"
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
        data-carousel-track="true"
        data-normal-scroll
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 lg:gap-4 xl:gap-5"
      >
        {items.map((item, index) => (
          <div
            key={index}
            data-carousel-item
            className="min-w-0 shrink-0 basis-full snap-start transition-transform duration-300 md:basis-[calc((100%_-_1.5rem)_/_2)] lg:basis-[calc((100%_-_2rem)_/_3)] xl:basis-[calc((100%_-_3.75rem)_/_4)]"
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
            className="premium-soft-button absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-white/95 text-[#0D2B52] shadow-lg backdrop-blur transition hover:-translate-x-0.5 hover:border-[#B48A5A] hover:bg-[#0D2B52] hover:text-white md:flex"
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
            className="premium-soft-button absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-white/95 text-[#0D2B52] shadow-lg backdrop-blur transition hover:translate-x-0.5 hover:border-[#B48A5A] hover:bg-[#0D2B52] hover:text-white md:flex"
            aria-label={t("carousel.next")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
