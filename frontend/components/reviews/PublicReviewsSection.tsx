"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Quote, ShieldCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";

type TargetType = "PROPERTY" | "EXPERIENCE" | "PACKAGE";

type ReviewSummary = {
  reviewCount: number;
  averageRating: number;
  distribution: Record<"5" | "4" | "3" | "2" | "1", number>;
};

type PublicReview = {
  id: number;
  customerName?: string | null;
  customerCountry?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  isFeatured: boolean;
  submittedAt: string;
  createdAt: string;
};

type Props = {
  targetType: TargetType;
  targetId: number | string;
  locale?: string;
  title?: string;
};

const emptySummary: ReviewSummary = {
  reviewCount: 0,
  averageRating: 0,
  distribution: {
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0,
  },
};

function ratingLabel(value: number, t: (key: string) => string) {
  if (value >= 4.7) return t("reviews.excellent");
  if (value >= 4.2) return t("reviews.veryGood");
  if (value >= 3.5) return t("reviews.good");
  if (value >= 2.5) return t("reviews.fair");
  return t("reviews.needsImprovement");
}

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale || "es", {
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-1 text-[#B48A5A]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${size} ${index < Math.round(value) ? "fill-current" : "text-slate-300"}`}
        />
      ))}
    </div>
  );
}

export default function PublicReviewsSection({
  targetType,
  targetId,
  locale,
  title,
}: Props) {
  const { language, t } = useTranslation();
  const activeLocale = locale || language || "es";
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || !("IntersectionObserver" in window)) {
      setShouldFetch(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldFetch(true);
        observer.disconnect();
      },
      {
        rootMargin: "480px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldFetch || !targetType || !targetId) return;

    let mounted = true;
    const abortController = new AbortController();

    async function fetchReviews() {
      try {
        setLoading(true);
        const [summaryResponse, reviewsResponse] = await Promise.all([
          fetch(apiUrl(`/reviews/public/${targetType}/${targetId}/summary`), {
            signal: abortController.signal,
          }),
          fetch(apiUrl(`/reviews/public/${targetType}/${targetId}`), {
            signal: abortController.signal,
          }),
        ]);

        const summaryData = summaryResponse.ok
          ? await summaryResponse.json().catch(() => null)
          : null;
        const reviewsData = reviewsResponse.ok
          ? await reviewsResponse.json().catch(() => null)
          : null;

        if (!mounted) return;

        setSummary({
          ...emptySummary,
          ...summaryData,
          distribution:
            summaryData?.distribution && typeof summaryData.distribution === "object"
              ? summaryData.distribution
              : emptySummary.distribution,
        });
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (error) {
        if (abortController.signal.aborted) return;
        if (!mounted) return;
        setSummary(emptySummary);
        setReviews([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchReviews();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [shouldFetch, targetId, targetType]);

  const average = Number(summary.averageRating || 0);
  const count = Number(summary.reviewCount || 0);
  const orderedReviews = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }),
    [reviews]
  );

  return (
    <section
      ref={sectionRef}
      className="premium-scroll-reveal rounded-3xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B48A5A]">
            {t("reviews.verifiedReviews")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0D2B52] sm:text-3xl">
            {title || t("reviews.travelerReviews")}
          </h2>
        </div>
        {count > 0 && (
          <Badge variant="outline" className="w-fit rounded-full border-[#D4AF37]/30 bg-[#FFF7D8] px-4 py-2 text-[#9A6A1F]">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("reviews.verifiedReviews")}
          </Badge>
        )}
      </div>

      {!shouldFetch || loading ? (
        <div className="mt-6 h-44 rounded-2xl premium-skeleton" />
      ) : count === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F1] p-6 text-center text-sm text-slate-600">
          {t("reviews.empty")}
        </div>
      ) : (
        <div className="mt-7 grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] shadow-none">
            <CardContent className="space-y-5 p-5">
              <div>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-semibold leading-none text-[#0D2B52]">
                    {average.toFixed(1)}
                  </span>
                  <div className="pb-1">
                    <Stars value={average} />
                    <p className="mt-1 text-sm font-semibold text-[#B48A5A]">
                      {ratingLabel(average, t)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("reviews.basedOn").replace("{count}", String(count))}
                </p>
              </div>

              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const key = String(rating) as "5" | "4" | "3" | "2" | "1";
                  const itemCount = summary.distribution[key] || 0;
                  const width = count > 0 ? `${(itemCount / count) * 100}%` : "0%";

                  return (
                    <div key={rating} className="grid grid-cols-[78px_1fr_28px] items-center gap-2 text-xs text-slate-600">
                      <span>{rating} {t("reviews.stars")}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#B48A5A]"
                          style={{ width }}
                        />
                      </div>
                      <span className="text-right font-semibold text-[#0D2B52]">
                        {itemCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {orderedReviews.slice(0, 6).map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#0D2B52]">
                        {review.customerName || t("reviews.traveler")}
                      </h3>
                      {review.customerCountry && (
                        <span className="text-sm text-slate-500">
                          {review.customerCountry}
                        </span>
                      )}
                      {review.isFeatured && (
                        <Badge variant="outline" className="border-[#D4AF37]/30 bg-[#FFF7D8] text-[#9A6A1F]">
                          {t("reviews.featured")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(review.submittedAt || review.createdAt, activeLocale)}
                    </p>
                  </div>
                  <Stars value={review.rating} />
                </div>

                <div className="mt-4 flex gap-3">
                  <Quote className="mt-1 h-5 w-5 shrink-0 text-[#B48A5A]" />
                  <div>
                    {review.title && (
                      <p className="font-semibold text-[#0D2B52]">
                        {review.title}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
