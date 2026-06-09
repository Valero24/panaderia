import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle, Package } from "lucide-react";

import BlogPostText from "@/components/blog/BlogPostText";
import JsonLd from "@/components/JsonLd";
import TranslatedText from "@/components/TranslatedText";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";
import {
  getDynamicText,
  getLocalizedSlug,
  type DynamicTranslations,
} from "@/lib/dynamic-translations";
import { optimizedUnsplashUrl } from "@/lib/image-url";
import { localizedAlternates } from "@/lib/i18n-seo";
import { localizedRoutePath } from "@/lib/i18n-routes";
import { absoluteImageUrl, buildMetadata } from "@/lib/seo";
import { buildBlogSchema, buildCollectionPageSchema } from "@/lib/schema";
import type { Language } from "@/i18n";

export const revalidate = 300;

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  seoDescription?: string | null;
  coverImage?: string | null;
  category?: string | null;
  tags?: unknown;
  authorName?: string | null;
  isFeatured?: boolean | null;
  publishedAt?: string | null;
  translations?: DynamicTranslations | null;
  translatedSlugs?: Record<string, string | null> | null;
};

const title = "Cartagena Travel Blog";
const description =
  "Travel guides, recommendations and local tips to enjoy Cartagena.";
const blogSeoByLocale: Record<Language, { title: string; description: string }> = {
  es: {
    title: "Blog de viajes en Cartagena | Cartagena Tailored Travel",
    description:
      "Guias, consejos y recomendaciones para disfrutar Cartagena con alojamientos premium, tours privados y experiencias personalizadas.",
  },
  en: { title, description },
  fr: {
    title: "Blog de voyage a Cartagena | Cartagena Tailored Travel",
    description:
      "Guides, conseils et recommandations pour profiter de Cartagena avec des sejours premium, des visites privees et des experiences sur mesure.",
  },
  pt: {
    title: "Blog de viagens em Cartagena | Cartagena Tailored Travel",
    description:
      "Guias, dicas e recomendacoes para aproveitar Cartagena com hospedagens premium, tours privados e experiencias personalizadas.",
  },
  it: {
    title: "Blog di viaggio a Cartagena | Cartagena Tailored Travel",
    description:
      "Guide, consigli e raccomandazioni per vivere Cartagena con alloggi premium, tour privati ed esperienze su misura.",
  },
};
const image =
  absoluteImageUrl(
    "https://images.unsplash.com/photo-1533125842689-7a1f6d60f3dc?auto=format&fit=crop&q=70&w=1200"
  );
export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/blog",
  image,
  languages: localizedAlternates("blog").languages,
});

async function getPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(apiUrl("/blog"), {
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizeTags(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default async function BlogPage({
  locale = "es",
}: {
  locale?: Language;
} = {}) {
  const posts = await getPosts();
  const copy = blogSeoByLocale[locale] || blogSeoByLocale.es;
  const localizedPosts = posts.map((post) => ({
    ...post,
    title: getDynamicText(post, "title", locale, post.title),
    excerpt: getDynamicText(post, "excerpt", locale, post.excerpt),
    content: getDynamicText(post, "content", locale, post.content),
    seoDescription: getDynamicText(
      post,
      "seoDescription",
      locale,
      post.seoDescription
    ),
    url: localizedRoutePath(
      "blog",
      locale,
      getLocalizedSlug(post, locale, post.slug)
    ),
  }));
  const blogSchema = buildBlogSchema({
    name: copy.title,
    description: copy.description,
    url: localizedRoutePath("blog", locale),
    image,
    posts: localizedPosts,
  });
  const collectionSchema = buildCollectionPageSchema({
    name: copy.title,
    description: copy.description,
    url: localizedRoutePath("blog", locale),
    image,
  });

  return (
    <main className="bg-[#F8F6F2] text-[#0D2B52]">
      <JsonLd data={[blogSchema, collectionSchema]} />
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:py-20">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[#B68D40]">
            <TranslatedText k="blog.eyebrow" />
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            <TranslatedText k="blog.title" />
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 lg:text-lg">
            <TranslatedText k="blog.subtitle" />
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#D4AF37]/30 bg-white p-10 text-center text-slate-500">
            <BookOpen className="mx-auto h-10 w-10 text-[#B68D40]" />
            <p className="mt-4">
              <TranslatedText k="blog.empty" />
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const imageUrl =
                post.coverImage ||
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=70&w=900";
              const tags = normalizeTags(post.tags);

              return (
                <Link
                  key={post.id}
                  href={localizedRoutePath(
                    "blog",
                    locale,
                    getLocalizedSlug(post, locale, post.slug)
                  )}
                  className="group overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-48 overflow-hidden bg-[#0D2B52]">
                    <Image
                      src={optimizedUnsplashUrl(imageUrl, 640, 68)}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1280px) 390px, (min-width: 768px) 50vw, 100vw"
                      quality={68}
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071E3A]/60 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {post.category && (
                        <Badge className="bg-white text-[#0D2B52]">
                          {post.category}
                        </Badge>
                      )}
                      {post.isFeatured && (
                        <Badge className="bg-[#D4AF37] text-[#0D2B52]">
                          <TranslatedText k="blog.featured" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <BlogPostText post={post} mode="card" />
                    {tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#F8F6F2] px-3 py-1 text-xs font-semibold text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#B68D40]">
                      <TranslatedText k="blog.viewMore" />
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <section className="mt-12 rounded-3xl border border-[#D4AF37]/20 bg-[#071E3A] p-6 text-white shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#D4AF37]">
                Cartagena Tailored Travel
              </p>
              <h2 className="mt-3 text-2xl font-bold lg:text-3xl">
                <TranslatedText k="blog.ctaTitle" />
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                <TranslatedText k="blog.ctaText" />
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={localizedRoutePath("contact", locale)}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0D2B52] transition hover:bg-[#F8F6F2]"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <TranslatedText k="blog.ctaContact" />
              </Link>
              <Link
                href={localizedRoutePath("package", locale)}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <Package className="mr-2 h-4 w-4" />
                <TranslatedText k="blog.ctaPackages" />
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
