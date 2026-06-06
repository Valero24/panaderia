import type { ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import PublicImage from "@/components/PublicImage";
import TrackedLink from "@/components/TrackedLink";
import TranslatedText from "@/components/TranslatedText";

type PublicProductCardProps = {
  href: string;
  reserveHref?: string;
  image: string;
  fallbackImage: string;
  badge: ReactNode;
  title: string;
  description?: ReactNode;
  location: string;
  price: ReactNode;
  meta: ReactNode;
  metaIcon?: "clock" | "calendar" | "users";
  secondaryMeta?: ReactNode;
  button: ReactNode;
  reserveLabel?: ReactNode;
  trackingLabel: string;
  trackingLocation: string;
  reserveTrackingLabel?: string;
};

const metaIcons = {
  clock: Clock,
  calendar: CalendarDays,
  users: Users,
};

export default function PublicProductCard({
  href,
  reserveHref,
  image,
  fallbackImage,
  badge,
  title,
  description,
  location,
  price,
  meta,
  metaIcon = "clock",
  secondaryMeta,
  button,
  reserveLabel = <TranslatedText k="nav.reserveNow" />,
  trackingLabel,
  trackingLocation,
  reserveTrackingLabel,
}: PublicProductCardProps) {
  const MetaIcon = metaIcons[metaIcon];

  return (
    <article className="group mx-auto h-full w-full [perspective:1400px] lg:max-w-[330px] xl:max-w-[320px]">
      <div className="relative h-full min-h-[540px] rounded-2xl transition-transform duration-700 ease-out lg:min-h-[405px] xl:min-h-[395px] lg:[transform-style:preserve-3d] lg:group-focus-within:[transform:rotateY(180deg)] lg:group-hover:[transform:rotateY(180deg)]">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm transition-shadow duration-300 lg:absolute lg:inset-0 lg:rounded-xl lg:[backface-visibility:hidden] lg:group-hover:shadow-xl xl:rounded-2xl">
          <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-100 lg:aspect-[16/9]">
            <PublicImage
              src={image}
              fallbackSrc={fallbackImage}
              alt={title}
              fill
              sizes="(min-width: 1280px) 350px, (min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw"
              quality={72}
              optimizeWidth={800}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-[#0D2B52] shadow-sm backdrop-blur lg:left-2.5 lg:top-2.5 lg:px-2 lg:py-0.5 lg:text-[0.68rem]">
              {badge}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5 lg:p-3.5 xl:p-4">
            <div className="min-h-[154px] lg:min-h-[96px] xl:min-h-[100px]">
              <div className="flex items-center gap-2 text-sm text-slate-500 lg:text-[0.72rem] xl:text-xs">
                <MapPin className="h-4 w-4 shrink-0 text-[#B48A5A] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
                <span className="line-clamp-1">{location}</span>
              </div>

              <h2 className="mt-2 line-clamp-2 min-h-[64px] text-2xl font-semibold leading-8 text-[#0D2B52] lg:min-h-[42px] lg:text-base lg:leading-[1.35] xl:text-lg">
                {title}
              </h2>

              {description && (
                <p className="mt-2 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600 lg:mt-1.5 lg:min-h-[34px] lg:text-[0.72rem] lg:leading-[1.45] xl:text-xs">
                  {description}
                </p>
              )}
            </div>

            <div className="mt-5 flex min-h-[82px] flex-wrap gap-3 text-sm text-slate-600 lg:mt-2 lg:min-h-[48px] lg:gap-1.5 lg:text-[0.7rem] xl:text-xs">
              <span className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-[#F8F6F1] px-3 py-2 lg:h-7 lg:rounded-lg lg:px-2">
                <MetaIcon className="h-4 w-4 shrink-0 text-[#B48A5A] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
                <span className="line-clamp-1">{meta}</span>
              </span>

              <span className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-[#F8F6F1] px-3 py-2 lg:h-7 lg:rounded-lg lg:px-2">
                <Users className="h-4 w-4 shrink-0 text-[#B48A5A] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
                <span className="line-clamp-1">
                  {secondaryMeta || <TranslatedText k="shared.validationAssisted" />}
                </span>
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#D4AF37]/20 pt-5 lg:gap-2 lg:pt-3">
              <div>
                <p className="text-xs text-slate-500 lg:text-[0.68rem]">
                  <TranslatedText k="properties.from" />
                </p>
                <p className="font-semibold text-[#0D2B52] lg:text-sm xl:text-[0.95rem]">{price}</p>
              </div>

              <TrackedLink
                href={href}
                trackingLabel={trackingLabel}
                trackingLocation={trackingLocation}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0D2B52] px-4 text-sm font-semibold text-white transition hover:bg-[#12396d] lg:hidden"
              >
                {button}
              </TrackedLink>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 hidden rounded-2xl border border-[#D4AF37]/20 bg-[#0D2B52] p-5 text-white shadow-xl lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:rounded-xl lg:p-3.5 lg:[backface-visibility:hidden] lg:[transform:rotateY(180deg)] xl:rounded-2xl xl:p-4">
          <div className="min-h-0">
            <div className="inline-flex max-w-full rounded-full border border-[#D4AF37]/35 bg-white/10 px-3 py-1 text-xs font-semibold text-[#F4D98E] lg:px-2 lg:py-0.5 lg:text-[0.68rem]">
              <span className="line-clamp-1">{badge}</span>
            </div>
            <h3 className="mt-4 line-clamp-3 text-2xl font-semibold leading-tight lg:mt-2.5 lg:text-lg xl:text-xl">
              {title}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/75 lg:mt-2 lg:line-clamp-2 lg:text-[0.72rem] lg:leading-[1.45] xl:text-xs">
              {description || location}
            </p>
          </div>

          <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm lg:mt-3 lg:space-y-1.5 lg:rounded-xl lg:p-2.5 lg:text-[0.72rem] xl:text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#F4D98E] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <MetaIcon className="h-4 w-4 shrink-0 text-[#F4D98E] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
              <span className="line-clamp-1">{meta}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[#F4D98E] lg:h-3 lg:w-3 xl:h-3.5 xl:w-3.5" />
              <span className="line-clamp-1">
                {secondaryMeta || <TranslatedText k="shared.validationAssisted" />}
              </span>
            </div>
          </div>

          <div className="mt-auto shrink-0 border-t border-white/10 pt-4 lg:pt-2.5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55 lg:text-[0.65rem]">
              <TranslatedText k="properties.from" />
            </p>
            <p className="mt-1 line-clamp-1 text-xl font-semibold text-[#F4D98E] lg:text-base xl:text-lg">
              {price}
            </p>

            <div className="mt-4 grid gap-2.5 lg:mt-2.5 lg:gap-2">
              <TrackedLink
                href={href}
                trackingLabel={trackingLabel}
                trackingLocation={trackingLocation}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0D2B52] transition hover:bg-[#F8F6F1] lg:h-9 lg:rounded-lg lg:px-4 lg:text-xs"
              >
                {button}
              </TrackedLink>

              {reserveHref && (
                <TrackedLink
                  href={reserveHref}
                  trackingLabel={reserveTrackingLabel || `${trackingLabel}_reservar`}
                  trackingLocation={`${trackingLocation}_back`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10 lg:h-9 lg:rounded-lg lg:px-4 lg:text-xs"
                >
                  {reserveLabel}
                </TrackedLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
