"use client";

import { Children, ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ProductCarousel = dynamic(() => import("./ProductCarousel"), {
  ssr: false,
});

type LazyProductCarouselProps = {
  children: ReactNode;
};

function StaticCarouselShell({ children }: LazyProductCarouselProps) {
  const items = Children.toArray(children);

  if (items.length === 0) return null;

  return (
    <div className="relative premium-reveal lg:mx-auto lg:max-w-6xl xl:max-w-7xl">
      <div
        data-carousel-track="true"
        data-normal-scroll
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 lg:gap-4 xl:gap-5"
      >
        {items.map((item, index) => (
          <div
            key={index}
            data-carousel-item
            className="min-w-0 shrink-0 basis-full snap-start md:basis-[calc((100%_-_1.5rem)_/_2)] lg:basis-[calc((100%_-_2rem)_/_3)] xl:basis-[calc((100%_-_3.75rem)_/_4)]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LazyProductCarousel({ children }: LazyProductCarouselProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [shouldLoadCarousel, setShouldLoadCarousel] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell || !("IntersectionObserver" in window)) {
      setShouldLoadCarousel(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setShouldLoadCarousel(true);
        observer.disconnect();
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(shell);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={shellRef}>
      {shouldLoadCarousel ? (
        <ProductCarousel>{children}</ProductCarousel>
      ) : (
        <StaticCarouselShell>{children}</StaticCarouselShell>
      )}
    </div>
  );
}
