"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

import PublicImage from "@/components/PublicImage";
import { useTranslation } from "@/context/LanguageContext";
import type { ProductMediaItem } from "./ProductMediaGallery";

type ProductMediaLightboxProps = {
  title: string;
  items: ProductMediaItem[];
  initialIndex: number;
  onClose: () => void;
};

function isVideo(item: ProductMediaItem) {
  const url = item.url || "";

  return (
    item.mediaType === "VIDEO" ||
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) ||
    /youtube\.com|youtu\.be|vimeo\.com/i.test(url)
  );
}

function embedUrl(url: string) {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/
  );

  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

function LightboxMediaPreview({
  item,
  title,
}: {
  item: ProductMediaItem;
  title: string;
}) {
  const video = isVideo(item);
  const embedded = video ? embedUrl(item.url) : null;

  if (video) {
    return embedded ? (
      <iframe
        src={embedded}
        title={item.title || title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <video src={item.url} className="h-full w-full object-contain" controls />
    );
  }

  return (
    <PublicImage
      src={item.url}
      alt={item.title || title}
      fill
      sizes="100vw"
      quality={74}
      optimizeWidth={1600}
      className="object-contain"
    />
  );
}

function ThumbnailPreview({
  item,
  title,
}: {
  item: ProductMediaItem;
  title: string;
}) {
  const video = isVideo(item);

  return (
    <div className="relative h-full w-full bg-black">
      {video ? (
        <div className="flex h-full w-full items-center justify-center bg-[#0D2B52]">
          <Play className="h-5 w-5 fill-current text-white" />
        </div>
      ) : (
        <PublicImage
          src={item.url}
          alt={item.title || title}
          fill
          sizes="120px"
          quality={60}
          optimizeWidth={240}
          className="object-cover"
        />
      )}
    </div>
  );
}

export default function ProductMediaLightbox({
  title,
  items,
  initialIndex,
  onClose,
}: ProductMediaLightboxProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  function move(step: number) {
    setActiveIndex((current) => (current + step + items.length) % items.length);
  }

  return (
    <div className="premium-reveal fixed inset-0 z-[100] bg-[#071727]/95 text-white">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
              {t("gallery.photoTour")}
            </p>
            <h2 className="mt-1 text-lg font-semibold sm:text-2xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 p-2 transition hover:bg-white/10"
            aria-label={t("gallery.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-16">
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => move(-1)}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                aria-label={t("carousel.previous")}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                aria-label={t("carousel.next")}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="relative h-full max-h-[68vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-black">
            <LightboxMediaPreview item={items[activeIndex]} title={title} />
          </div>
        </div>

        <footer className="border-t border-white/10 px-4 py-4 sm:px-6">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {items.map((item, index) => (
              <button
                key={item.id || `${item.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition ${
                  index === activeIndex
                    ? "border-[#D4AF37]"
                    : "border-white/10 opacity-70 hover:opacity-100"
                }`}
              >
                <ThumbnailPreview item={item} title={title} />
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
