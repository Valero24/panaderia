import { CalendarDays, Gem, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicImage from "@/components/PublicImage";
import TranslatedText from "@/components/TranslatedText";
import TrackedLink from "@/components/TrackedLink";
import { apiUrl } from "@/lib/api";
import { cleanPublicCopy } from "@/lib/public-copy";

type PackageItem = {
  id: number;
  title: string;
  shortDescription: string;
  duration: string;
  location: string;
  maxGuests: number;
  basePrice: number;
  mainImage?: string | null;
  category: string;
  images?: {
    url: string;
    mediaType?: "IMAGE" | "VIDEO" | string | null;
    isPrimary?: boolean;
    active?: boolean | null;
  }[];
};

const fallbackImage =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=70&w=900";

function money(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CO")} COP`;
}

async function getPackages(): Promise<PackageItem[]> {
  try {
    const res = await fetch(apiUrl("/packages"), {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function imageFor(item: PackageItem) {
  const images = (item.images || []).filter(
    (image) => image.active !== false && image.mediaType !== "VIDEO"
  );

  return (
    item.mainImage ||
    images.find((image) => image.isPrimary)?.url ||
    images[0]?.url ||
    fallbackImage
  );
}

export default async function PaquetesPage() {
  const packages = await getPackages();

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
            <TranslatedText k="packages.eyebrow" />
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">
            <TranslatedText k="packages.title" />
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            <TranslatedText k="packages.subtitle" />
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="premium-enter mt-10 rounded-2xl border border-[#D4AF37]/20 bg-white p-8 text-center shadow-sm">
            <Gem className="mx-auto h-10 w-10 text-[#B48A5A]" />
            <h2 className="mt-4 text-2xl font-semibold">
              <TranslatedText k="packages.emptyTitle" />
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              <TranslatedText k="packages.emptySubtitle" />
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((item) => (
              <Card
                key={item.id}
                className="premium-enter flex h-full flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <PublicImage
                    src={imageFor(item)}
                    fallbackSrc={fallbackImage}
                    alt={cleanPublicCopy(item.title)}
                    fill
                    sizes="(min-width: 1280px) 390px, (min-width: 768px) 50vw, 100vw"
                    quality={72}
                    optimizeWidth={900}
                    className="object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-[#0D2B52] shadow-sm backdrop-blur">
                    {cleanPublicCopy(item.category)}
                  </div>
                </div>

                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="min-h-[154px]">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4 text-[#B48A5A]" />
                      <span className="line-clamp-1">
                        {cleanPublicCopy(item.location)}
                      </span>
                    </div>
                    <h2 className="mt-2 line-clamp-2 min-h-[64px] text-2xl font-semibold leading-8">
                      {cleanPublicCopy(item.title)}
                    </h2>
                    <p className="mt-2 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600">
                      {cleanPublicCopy(item.shortDescription)}
                    </p>
                  </div>

                  <div className="mt-5 grid min-h-[44px] grid-cols-2 gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#B48A5A]" />
                      <span className="line-clamp-1">{cleanPublicCopy(item.duration)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#B48A5A]" />
                      <TranslatedText k="shared.upTo" /> {item.maxGuests}
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#D4AF37]/15 pt-4">
                    <div>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        <TranslatedText k="properties.from" />
                      </span>
                      <p className="font-semibold text-[#B48A5A]">
                        {money(item.basePrice)}
                      </p>
                    </div>
                    <TrackedLink
                      href={`/paquetes/${item.id}`}
                      trackingLabel={`abrir_paquete_${item.id}`}
                      trackingLocation="paquetes_list"
                    >
                      <Button className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]">
                        <TranslatedText k="packages.view" />
                      </Button>
                    </TrackedLink>
                  </div>

                  <div className="mt-4 h-7">
                    <Badge variant="outline" className="rounded-md">
                      <TranslatedText k="experiences.assisted" />
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
