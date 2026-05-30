"use client";

type EventPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

export function trackEvent(name: string, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", name, payload);
}

export function trackMetaEvent(name: string, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;

  window.fbq?.("track", name, payload);
}

export function trackCtaClick(label: string, location: string) {
  trackEvent("cta_click", {
    event_category: "conversion",
    event_label: label,
    location,
  });
}

export function trackViewContent(
  contentType: string,
  contentId: string | number,
  contentName?: string
) {
  const payload = {
    content_type: contentType,
    content_id: String(contentId),
    content_name: contentName,
  };

  trackEvent("view_content", payload);
  trackMetaEvent("ViewContent", payload);
}

export function trackInitiateCheckout(
  contentType: string,
  contentId: string | number,
  value?: number
) {
  const payload = {
    content_type: contentType,
    content_id: String(contentId),
    value,
    currency: "COP",
  };

  trackEvent("initiate_checkout", payload);
  trackMetaEvent("InitiateCheckout", payload);
}

export function trackLead(source: string, payload: EventPayload = {}) {
  trackEvent("lead", {
    source,
    ...payload,
  });
  trackMetaEvent("Lead", {
    source,
    ...payload,
  });
}

export function trackContact(source: string) {
  trackEvent("contact", {
    source,
  });
  trackMetaEvent("Contact", {
    source,
  });
}
