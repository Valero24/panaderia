import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export const futureAiCrawlerPolicy = [
  // Prepared for future policy decisions. Do not emit these rules yet.
  // GPTBot, Google-Extended and ClaudeBot remain governed by User-agent: *.
  { userAgent: "GPTBot", status: "prepared" },
  { userAgent: "Google-Extended", status: "prepared" },
  { userAgent: "ClaudeBot", status: "prepared" },
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/login",
        "/staff-login",
        "/checkout",
        "/checkout/",
        "/confirmacion",
        "/preview",
        "/drafts",
        "/review",
        "/review/",
        "/api",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
