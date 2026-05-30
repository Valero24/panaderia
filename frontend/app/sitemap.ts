import type { MetadataRoute } from "next";

const baseUrl = "https://cartagenatailoredtravel.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    "",
    "/alojamientos",
    "/experiencias",
    "/paquetes",
    "/contacto",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
