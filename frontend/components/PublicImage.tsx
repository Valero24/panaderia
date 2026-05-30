"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

import {
  isKnownBrokenImage,
  optimizedUnsplashUrl,
} from "@/lib/image-url";

type PublicImageProps = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc?: string;
  optimizeWidth?: number;
};

const defaultFallback =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=900";

export default function PublicImage({
  src,
  fallbackSrc = defaultFallback,
  optimizeWidth = 900,
  ...props
}: PublicImageProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = failed || isKnownBrokenImage(src) ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={optimizedUnsplashUrl(imageSrc, optimizeWidth)}
      onError={() => setFailed(true)}
    />
  );
}
