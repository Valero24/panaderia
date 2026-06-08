"use client";

import { CalendarDays, User } from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";
import {
  getDynamicText,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";

type BlogPostTextProps = {
  post: TranslatableEntity & {
    title?: string | null;
    excerpt?: string | null;
    content?: string | null;
    authorName?: string | null;
    publishedAt?: string | null;
  };
  mode: "card" | "detail";
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function BlogPostText({ post, mode }: BlogPostTextProps) {
  const { language, t } = useTranslation();
  const title = getDynamicText(post, "title", language);
  const excerpt = getDynamicText(post, "excerpt", language);
  const content = getDynamicText(post, "content", language);
  const date = formatDate(post.publishedAt);

  if (mode === "card") {
    return (
      <>
        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#B68D40]">
          {date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {date}
            </span>
          )}
          {post.authorName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {post.authorName}
            </span>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold leading-tight text-[#0D2B52]">
          {title}
        </h2>
        {excerpt && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {excerpt}
          </p>
        )}
        <span className="mt-5 inline-flex text-sm font-bold text-[#0D2B52]">
          {t("blog.readArticle")}
        </span>
      </>
    );
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-12 sm:px-8 lg:py-16">
      <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#B68D40]">
        {date && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {date}
          </span>
        )}
        {post.authorName && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.authorName}
          </span>
        )}
      </div>
      <h1 className="mt-5 text-4xl font-bold leading-tight text-[#0D2B52] sm:text-5xl">
        {title}
      </h1>
      {excerpt && (
        <p className="mt-5 text-lg leading-8 text-slate-600">{excerpt}</p>
      )}
      <div className="mt-10 space-y-6 text-base leading-8 text-slate-700">
        {paragraphs(content).map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
