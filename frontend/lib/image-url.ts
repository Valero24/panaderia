const knownBrokenImageIds = ["photo-1583997052103-b4a1cb974ce4"];

export function isKnownBrokenImage(src: string) {
  return knownBrokenImageIds.some((id) => src.includes(id));
}

export function optimizedUnsplashUrl(src: string, width = 900) {
  if (!src) return src;

  try {
    const url = new URL(src);

    if (!url.hostname.endsWith("images.unsplash.com")) {
      return src;
    }

    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("q", "70");
    url.searchParams.set("w", String(width));

    return url.toString();
  } catch {
    return src;
  }
}
