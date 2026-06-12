"use client";

import Link from "next/link";
import { CalendarDays, User } from "lucide-react";

import { useTranslation } from "@/context/LanguageContext";
import {
  getDynamicText,
  type TranslatableEntity,
} from "@/lib/dynamic-translations";
import { sanitizeBlogHtml } from "@/lib/blog-html";

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

function safeText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHref(value: string) {
  const href = value.trim();
  if (href.startsWith("/")) return href;

  try {
    const url = new URL(href);
    if (["http:", "https:"].includes(url.protocol)) return url.toString();
  } catch {
    return "";
  }

  return "";
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

        if (!match) return <span key={`${part}-${index}`}>{safeText(part)}</span>;

        const label = safeText(match[1]);
        const href = safeHref(match[2]);
        if (!label || !href) return <span key={`${part}-${index}`}>{label}</span>;

        const isInternal = href.startsWith("/");
        return isInternal ? (
          <Link
            key={`${href}-${index}`}
            href={href}
            className="font-semibold text-[#0D2B52] underline decoration-[#D4AF37]/60 underline-offset-4"
          >
            {label}
          </Link>
        ) : (
          <a
            key={`${href}-${index}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#0D2B52] underline decoration-[#D4AF37]/60 underline-offset-4"
          >
            {label}
          </a>
        );
      })}
    </>
  );
}

type ContentBlock =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "ul"; items: string[] };

function contentBlocks(value: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) blocks.push({ type: "ul", items: listItems });
    listItems = [];
  };

  value.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^###\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
      return;
    }

    if (/^##\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
      return;
    }

    if (/^#\s+/.test(line)) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function renderContentBlock(block: ContentBlock, index: number) {
  if (block.type === "h3") {
    return (
      <h3 key={index} className="pt-2 text-2xl font-bold text-[#0D2B52]">
        <InlineText text={block.text} />
      </h3>
    );
  }

  if (block.type === "h2") {
    return (
      <h2 key={index} className="pt-4 text-3xl font-bold text-[#0D2B52]">
        <InlineText text={block.text} />
      </h2>
    );
  }

  if (block.type === "ul") {
    return (
      <ul
        key={index}
        className="space-y-2 rounded-2xl bg-white p-5 text-slate-700 shadow-sm"
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} className="flex gap-3">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
            <span>
              <InlineText text={item} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index}>
      <InlineText text={block.text} />
    </p>
  );
}

export default function BlogPostText({ post, mode }: BlogPostTextProps) {
  const { language, t } = useTranslation();
  const title = getDynamicText(post, "title", language);
  const excerpt = getDynamicText(post, "excerpt", language);
  const content = getDynamicText(post, "content", language);
  const date = formatDate(post.publishedAt);
  const contentHasHtml = /<\/?[a-z][\s\S]*>/i.test(content || "");

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
      {contentHasHtml ? (
        <div
          className="blog-public-content mt-10 text-base leading-8 text-slate-700"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }}
        />
      ) : (
        <div className="mt-10 space-y-6 text-base leading-8 text-slate-700">
          {contentBlocks(content).map(renderContentBlock)}
        </div>
      )}
    </article>
  );
}
