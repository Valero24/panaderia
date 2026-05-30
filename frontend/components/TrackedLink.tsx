"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackCtaClick } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  trackingLabel: string;
  trackingLocation: string;
};

export default function TrackedLink({
  trackingLabel,
  trackingLocation,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackCtaClick(trackingLabel, trackingLocation);
        onClick?.(event);
      }}
    />
  );
}
