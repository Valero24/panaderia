"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Play, X } from "lucide-react";

import PublicImage from "@/components/PublicImage";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";

export type ProductMediaItem = {
  id?: number | string;
  url: string;
  mediaType?: "IMAGE" | "VIDEO" | string | null;
  title?: string | null;
  description?: string | null;
  isPrimary?: boolean | null;
  active?: boolean | null;
  sortOrder?: number | null;
};

type ProductMediaGalleryProps = {
  title: string;
  media?: ProductMediaItem[];
  fallbackImage?: string;
  layout?: "default" | "experience";
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

function MediaPreview({
  item,
  title,
  className,
}: {
  item: ProductMediaItem;
  title: string;
  className?: string;
}) {
  const video = isVideo(item);
  const embedded = video ? embedUrl(item.url) : null;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-200 ${className || ""}`}>
      {video ? (
        embedded ? (
          <iframe
            src={embedded}
            title={item.title || title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={item.url} className="h-full w-full object-cover" controls />
        )
      ) : (
        <PublicImage
          src={item.url}
          alt={item.title || title}
          fill
          sizes="(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw"
          quality={74}
          optimizeWidth={1200}
          className="premium-media object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}

      {video && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#0D2B52] shadow-lg">
            <Play className="ml-1 h-6 w-6 fill-current" />
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProductMediaGallery({
  title,
  media,
  fallbackImage,
  layout = "default",
}: ProductMediaGalleryProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const active = (media || [])
      .filter((item) => item?.url && item.active !== false)
      .sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999);
      });

    if (active.length > 0) return active;

    return fallbackImage
      ? [
          {
            id: "fallback",
            url: fallbackImage,
            mediaType: "IMAGE",
            isPrimary: true,
            active: true,
          },
        ]
      : [];
  }, [fallbackImage, media]);

  function openAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function move(step: number) {
    setActiveIndex((current) => (current + step + items.length) % items.length);
  }

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/8] items-center justify-center rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white text-slate-400">
        <div className="text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-[#B48A5A]" />
          <p className="mt-3 text-sm">{t("gallery.preparing")}</p>
        </div>
      </div>
    );
  }

  const visible = items.slice(0, 5);
  const count = items.length;
  const useExperienceLayout = layout === "experience";

  if (useExperienceLayout) {
    const secondary = visible.slice(1, 5);
    const secondaryGridClass =
      secondary.length === 2
        ? "grid gap-3 lg:h-full lg:grid-rows-2"
        : secondary.length === 3
          ? "grid gap-3 lg:h-full lg:grid-rows-3"
          : "grid gap-3 md:grid-cols-2 lg:h-full lg:grid-rows-2";
    const secondaryTileClass =
      secondary.length <= 3
        ? "group aspect-[16/10] overflow-hidden rounded-2xl bg-white shadow-sm lg:aspect-auto lg:h-full"
        : "group aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm lg:aspect-auto lg:h-full";

    return (
      <>
        <div className="premium-reveal relative overflow-hidden" data-experience-gallery>
          {count === 1 && (
            <button
              type="button"
              onClick={() => openAt(0)}
              className="premium-hover-lift group block aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white shadow-sm"
              data-experience-media-tile
            >
              <MediaPreview item={items[0]} title={title} />
            </button>
          )}

          {count === 2 && (
            <div className="grid gap-3 md:grid-cols-2">
              {visible.map((item, index) => (
                <button
                  key={item.id || item.url}
                  type="button"
                  onClick={() => openAt(index)}
                  className="premium-hover-lift group aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm"
                  data-experience-media-tile
                >
                  <MediaPreview item={item} title={title} />
                </button>
              ))}
            </div>
          )}

          {count >= 3 && (
            <div className="grid gap-3 lg:h-[440px] lg:grid-cols-[1.45fr_1fr] lg:grid-rows-1">
              <button
                type="button"
                onClick={() => openAt(0)}
                className="premium-hover-lift group aspect-[16/10] overflow-hidden rounded-2xl bg-white shadow-sm lg:aspect-auto lg:h-full"
                data-experience-media-tile
              >
                <MediaPreview item={items[0]} title={title} />
              </button>

              <div className={secondaryGridClass}>
                {secondary.map((item, index) => (
                  <button
                    key={item.id || item.url}
                    type="button"
                    onClick={() => openAt(index + 1)}
                    className={`premium-hover-lift ${secondaryTileClass}`}
                    data-experience-media-tile
                  >
                    <MediaPreview item={item} title={title} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {count > 1 && (
            <Button
              type="button"
              onClick={() => openAt(0)}
              className="premium-soft-button absolute bottom-4 right-4 rounded-xl bg-white text-[#0D2B52] shadow-lg hover:bg-[#F8F6F1]"
            >
              {t("gallery.showAll")}
            </Button>
          )}
        </div>

        {open && (
          <div className="premium-reveal fixed inset-0 z-[100] bg-[#071727]/95 text-white">
            <div className="flex h-full flex-col">
              <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
                    {t("gallery.photoTour")}</p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-2xl">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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

                <div className="h-full max-h-[68vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-black">
                  <MediaPreview item={items[activeIndex]} title={title} />
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
                      <MediaPreview item={item} title={title} />
                    </button>
                  ))}
                </div>
              </footer>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="premium-reveal relative">
        {count === 1 && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="premium-hover-lift group block aspect-[16/8] w-full overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <MediaPreview item={items[0]} title={title} />
          </button>
        )}

        {count === 2 && (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((item, index) => (
              <button
                key={item.id || item.url}
                type="button"
                onClick={() => openAt(index)}
                className="premium-hover-lift group aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <MediaPreview item={item} title={title} />
              </button>
            ))}
          </div>
        )}

        {count >= 3 && (
          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
            <button
              type="button"
              onClick={() => openAt(0)}
              className="premium-hover-lift group aspect-[16/10] overflow-hidden rounded-2xl bg-white shadow-sm lg:aspect-auto lg:min-h-[460px]"
            >
              <MediaPreview item={items[0]} title={title} />
            </button>

            <div className="grid grid-cols-2 gap-3">
              {visible.slice(1, 5).map((item, index) => (
                <button
                  key={item.id || item.url}
                  type="button"
                  onClick={() => openAt(index + 1)}
                  className="premium-hover-lift group aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <MediaPreview item={item} title={title} />
                </button>
              ))}
            </div>
          </div>
        )}

        {count > 1 && (
          <Button
            type="button"
            onClick={() => openAt(0)}
            className="premium-soft-button absolute bottom-4 right-4 rounded-xl bg-white text-[#0D2B52] shadow-lg hover:bg-[#F8F6F1]"
          >
            {t("gallery.showAll")}
          </Button>
        )}
      </div>

      {open && (
        <div className="premium-reveal fixed inset-0 z-[100] bg-[#071727]/95 text-white">
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
                  {t("gallery.photoTour")}</p>
                <h2 className="mt-1 text-lg font-semibold sm:text-2xl">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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

              <div className="h-full max-h-[68vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-black">
                <MediaPreview item={items[activeIndex]} title={title} />
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
                    <MediaPreview item={item} title={title} />
                  </button>
                ))}
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
