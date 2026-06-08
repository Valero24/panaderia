import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  MapPinned,
  MessageCircle,
  Package,
  Sparkles,
} from "lucide-react";

import BlogPostText from "@/components/blog/BlogPostText";
import JsonLd from "@/components/JsonLd";
import TranslatedText from "@/components/TranslatedText";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";
import type { DynamicTranslations } from "@/lib/dynamic-translations";
import { optimizedUnsplashUrl } from "@/lib/image-url";
import { localizedRoutePath } from "@/lib/i18n-routes";
import {
  localizedAlternates,
  localizedEntityForSeo,
} from "@/lib/i18n-seo";
import {
  absoluteTitle,
  canonicalUrl,
  defaultOgImage,
  metaDescription,
  socialMetadata,
} from "@/lib/seo";
import { buildBlogPostingSchema, buildBreadcrumbSchema } from "@/lib/schema";
import type { Language } from "@/i18n";

export const revalidate = 600;

type PageProps = {
  params: Promise<{ slug: string }>;
  locale?: Language;
};

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  category?: string | null;
  tags?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  translations?: DynamicTranslations | null;
};

const fallbackDescription =
  "Travel guide and luxury tourism recommendations for Cartagena, Colombia.";

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(apiUrl(`/blog/${slug}`), {
      next: { revalidate },
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

function normalizeTags(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Articulo no encontrado | Cartagena Tailored Travel",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle ? absoluteTitle(post.seoTitle) : absoluteTitle(post.title);
  const description = metaDescription(
    post.seoDescription || post.excerpt || post.content || "",
    fallbackDescription
  );
  const url = canonicalUrl(`/es/blog/${post.slug || post.id}`);
  const image = post.coverImage || defaultOgImage.url;
  const social = socialMetadata({
    title,
    description,
    url,
    image,
    type: "article",
  });

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: localizedAlternates("blog", post).languages,
    },
    openGraph: social.openGraph,
    twitter: social.twitter,
  };
}

export default async function BlogPostPage({ params, locale = "es" }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const localizedPost = localizedEntityForSeo(post, locale, "blog");
  const imageUrl = post.coverImage || defaultOgImage.url;
  const tags = normalizeTags(post.tags);
  const schemas = [
    buildBlogPostingSchema(localizedPost),
    buildBreadcrumbSchema([
      { name: "Home", url: localizedRoutePath("home", locale) },
      { name: "Blog", url: localizedRoutePath("blog", locale) },
      {
        name: cleanPublicCopy(localizedPost.title || post.title) || "Articulo",
        url:
          localizedPost.url ||
          localizedRoutePath("blog", locale, post.slug || post.id),
      },
    ]),
  ];

  return (
    <main className="bg-[#F8F6F2] text-[#0D2B52]">
      <JsonLd data={schemas} />
      <section className="relative min-h-[440px] overflow-hidden bg-[#071E3A] text-white">
        <Image
          src={optimizedUnsplashUrl(imageUrl, 1440, 72)}
          alt={post.title}
          fill
          priority
          sizes="100vw"
          quality={72}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071E3A]/90 via-[#071E3A]/65 to-[#071E3A]/25" />
        <div className="relative mx-auto flex min-h-[440px] max-w-7xl flex-col justify-end px-6 py-12 sm:px-8">
          <Link
            href={localizedRoutePath("blog", locale)}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            <TranslatedText k="blog.back" />
          </Link>
          {post.category && (
            <p className="text-xs uppercase tracking-[0.35em] text-[#D4AF37]">
              {post.category}
            </p>
          )}
        </div>
      </section>
      <BlogPostText post={post} mode="detail" />
      <section className="mx-auto max-w-4xl px-6 pb-6 sm:px-8">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-[#D4AF37]/20 pt-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm lg:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B68D40]">
            <TranslatedText k="blog.internalLinksEyebrow" />
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            <TranslatedText k="blog.internalLinksTitle" />
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              {
                href: localizedRoutePath("property", locale),
                label: "nav.stays",
                icon: BedDouble,
              },
              {
                href: localizedRoutePath("experience", locale),
                label: "nav.experiences",
                icon: Sparkles,
              },
              {
                href: localizedRoutePath("package", locale),
                label: "nav.packages",
                icon: Package,
              },
              {
                href: localizedRoutePath("destination", locale),
                label: "nav.destinations",
                icon: MapPinned,
              },
            ] as const).map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4 text-sm font-bold text-[#0D2B52] transition hover:bg-white hover:shadow-sm"
                >
                  <Icon className="h-5 w-5 text-[#B68D40]" />
                  <TranslatedText k={item.label} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-14 sm:px-8 lg:pb-20">
        <div className="rounded-3xl bg-[#071E3A] p-6 text-white shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#D4AF37]">
                Cartagena Tailored Travel
              </p>
              <h2 className="mt-3 text-2xl font-bold lg:text-3xl">
                <TranslatedText k="blog.detailCtaTitle" />
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                <TranslatedText k="blog.detailCtaText" />
              </p>
            </div>
            <Link
              href={localizedRoutePath("contact", locale)}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0D2B52] transition hover:bg-[#F8F6F2]"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <TranslatedText k="blog.ctaContact" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
