"use client";

import { useEffect } from "react";

import { trackViewContent } from "@/lib/analytics";

export default function ViewContentTracker({
  contentType,
  contentId,
  contentName,
}: {
  contentType: string;
  contentId: string | number;
  contentName?: string;
}) {
  useEffect(() => {
    trackViewContent(contentType, contentId, contentName);
  }, [contentType, contentId, contentName]);

  return null;
}
