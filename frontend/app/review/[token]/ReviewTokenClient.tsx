"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send, Star, Users } from "lucide-react";

import { apiUrl } from "@/lib/api";

type ReviewBookingSummary = {
  id: number;
  reservationCode?: string | null;
  type: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
  productName?: string | null;
  checkIn: string;
  checkOut?: string | null;
  guests: number;
  customerName?: string | null;
  customerEmail?: string | null;
};

type TokenValidationResponse = {
  tokenStatus: "VALID" | "INVALID";
  bookingCode?: string | null;
  customerName?: string | null;
  productType: "PROPERTY" | "EXPERIENCE" | "PACKAGE";
  productTitle?: string | null;
  startDate: string;
  endDate?: string | null;
  guests: number;
  canReview: boolean;
  reason?: string | null;
};

type AccessStatus =
  | "VALID"
  | "TOKEN_EXPIRED"
  | "BOOKING_NOT_FINISHED"
  | "BOOKING_NOT_CONFIRMED"
  | "REVIEW_ALREADY_SUBMITTED"
  | "NOT_FOUND"
  | "UNKNOWN";

type ReviewTokenClientProps = {
  token: string;
};

const typeLabels = {
  PROPERTY: "Alojamiento",
  EXPERIENCE: "Experiencia",
  PACKAGE: "Paquete",
};

const reasonMessages: Record<AccessStatus, string> = {
  VALID: "Acceso disponible para enviar tu reseña verificada.",
  TOKEN_EXPIRED: "Este enlace ya expiró.",
  BOOKING_NOT_FINISHED:
    "Tu reserva aún no ha finalizado. Podrás dejar tu opinión al finalizar el servicio.",
  BOOKING_NOT_CONFIRMED: "Esta reserva aún no está confirmada.",
  REVIEW_ALREADY_SUBMITTED: "Gracias, ya recibimos tu opinión.",
  NOT_FOUND: "El enlace no es válido.",
  UNKNOWN: "Este enlace de reseña no está disponible.",
};

function formatDate(value?: string | null) {
  if (!value) return "Por coordinar";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function toAccessStatus(reason?: string | null): AccessStatus {
  if (
    reason === "TOKEN_EXPIRED" ||
    reason === "BOOKING_NOT_FINISHED" ||
    reason === "BOOKING_NOT_CONFIRMED" ||
    reason === "REVIEW_ALREADY_SUBMITTED"
  ) {
    return reason;
  }

  return "UNKNOWN";
}

export default function ReviewTokenClient({ token }: ReviewTokenClientProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<ReviewBookingSummary | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("UNKNOWN");
  const [accessMessage, setAccessMessage] = useState(reasonMessages.UNKNOWN);
  const [rating, setRating] = useState(5);
  const [publicName, setPublicName] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;

    async function validateToken() {
      try {
        const response = await fetch(apiUrl(`/reviews/by-token/${token}`), {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const status = response.status === 404 ? "NOT_FOUND" : "UNKNOWN";
          const message = status === "NOT_FOUND" ? reasonMessages.NOT_FOUND : data?.message || reasonMessages.UNKNOWN;

          if (active) {
            setAccessStatus(status);
            setAccessMessage(message);
          }

          throw new Error(message);
        }

        if (!active) return;

        const payload = data as TokenValidationResponse;
        const bookingSummary: ReviewBookingSummary = {
          id: 0,
          reservationCode: payload.bookingCode,
          type: payload.productType,
          productName: payload.productTitle,
          checkIn: payload.startDate,
          checkOut: payload.endDate,
          guests: payload.guests,
          customerName: payload.customerName,
        };

        setBooking(bookingSummary);
        setPublicName(bookingSummary.customerName || "");

        if (!payload.canReview) {
          const status = toAccessStatus(payload.reason);
          setAccessStatus(status);
          setAccessMessage(reasonMessages[status]);
          setError("");
          return;
        }

        setAccessStatus("VALID");
        setAccessMessage(reasonMessages.VALID);
        setError("");
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : reasonMessages.UNKNOWN);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    validateToken();

    return () => {
      active = false;
    };
  }, [token]);

  const dateRange = useMemo(() => {
    if (!booking) return "";
    if (!booking.checkOut) return formatDate(booking.checkIn);

    return `${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`;
  }, [booking]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (comment.trim().length < 10) {
      setError("Cuéntanos un poco más sobre tu experiencia.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(apiUrl(`/reviews/by-token/${token}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          publicName: publicName.trim() || undefined,
          comment: comment.trim(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "No fue posible enviar la reseña.");
      }

      setSuccess(true);
      setAccessStatus("REVIEW_ALREADY_SUBMITTED");
      setAccessMessage(reasonMessages.REVIEW_ALREADY_SUBMITTED);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible enviar la reseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-96px)] bg-[#F8F6F1] px-5 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B48A5A]">
                Cartagena Tailored Travel
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#0D2B52] sm:text-4xl">
                Comparte cómo fue tu experiencia
              </h1>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/25 px-4 py-3 text-sm font-semibold text-[#0D2B52]">
              Reseña verificada
            </div>
          </div>

          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Este enlace privado solo está disponible para reservas confirmadas que ya
            finalizaron. Tu reseña será revisada antes de publicarse.
          </p>

          {loading && (
            <div className="mt-10 flex items-center gap-3 rounded-2xl bg-[#F8F6F1] p-5 text-[#0D2B52]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Validando enlace de reseña...
            </div>
          )}

          {!loading && error && !booking && (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
              {accessMessage || error}
            </div>
          )}

          {!loading && success && (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <h2 className="font-semibold">Reseña recibida</h2>
                  <p className="mt-1 text-sm leading-6">
                    Gracias por compartir tu experiencia. Nuestro equipo la revisará
                    antes de mostrarla públicamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && booking && !success && (
            <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <aside className="rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F1] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B48A5A]">
                  Resumen de reserva
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[#0D2B52]">
                  {booking.productName || typeLabels[booking.type]}
                </h2>
                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-[#B48A5A]" />
                    <span>{dateRange}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-[#B48A5A]" />
                    <span>{booking.guests} huésped(es)</span>
                  </div>
                  {booking.customerName && (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0D2B52]">
                      Cliente: {booking.customerName}
                    </div>
                  )}
                  {booking.reservationCode && (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0D2B52]">
                      Código: {booking.reservationCode}
                    </div>
                  )}
                </div>
              </aside>

              <div className="space-y-5">
                <div
                  className={`rounded-2xl border p-4 text-sm leading-6 ${
                    accessStatus === "VALID"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                    Estado del acceso
                  </p>
                  <p className="mt-1 font-medium">{accessMessage}</p>
                </div>

                {accessStatus === "VALID" && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold text-[#0D2B52]">
                        Calificación
                      </label>
                      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Calificación">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                              value <= rating
                                ? "border-[#D4AF37] bg-[#FFF7D8] text-[#B48A5A]"
                                : "border-slate-200 bg-white text-slate-300"
                            }`}
                            aria-label={`${value} estrellas`}
                          >
                            <Star className="h-5 w-5 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="publicName" className="text-sm font-semibold text-[#0D2B52]">
                        Nombre público
                      </label>
                      <input
                        id="publicName"
                        value={publicName}
                        onChange={(event) => setPublicName(event.target.value)}
                        maxLength={120}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-4 text-sm outline-none transition focus:border-[#B48A5A] focus:ring-4 focus:ring-[#D4AF37]/15"
                        placeholder="Ej. Laura M."
                      />
                    </div>

                    <div>
                      <label htmlFor="title" className="text-sm font-semibold text-[#0D2B52]">
                        Título de la reseña
                      </label>
                      <input
                        id="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={120}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-4 text-sm outline-none transition focus:border-[#B48A5A] focus:ring-4 focus:ring-[#D4AF37]/15"
                        placeholder="Ej. Una experiencia impecable"
                      />
                    </div>

                    <div>
                      <label htmlFor="comment" className="text-sm font-semibold text-[#0D2B52]">
                        Tu reseña
                      </label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={6}
                        maxLength={1200}
                        className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#B48A5A] focus:ring-4 focus:ring-[#D4AF37]/15"
                        placeholder="Cuéntanos qué fue lo más especial de tu experiencia..."
                        required
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Mínimo 10 caracteres. No publiques datos privados.
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0D2B52] px-5 text-sm font-semibold text-white transition hover:bg-[#12396d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Enviar reseña
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
