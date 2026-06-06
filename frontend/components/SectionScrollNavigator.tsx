"use client";

import { useEffect, useRef } from "react";

type SectionScrollNavigatorProps = {
  sections: string[];
  navbarOffset?: number;
  minDesktopWidth?: number;
  debounceMs?: number;
};

const interactiveSelector =
  'input, textarea, select, [contenteditable="true"], [role="textbox"]';

const normalScrollSelector = [
  "[data-normal-scroll]",
  "[data-radix-popper-content-wrapper]",
  "[data-radix-select-content]",
  "[data-radix-dialog-content]",
  "[role='dialog']",
  "[role='listbox']",
  "[aria-modal='true']",
  ".lightbox",
  ".modal",
].join(",");

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(interactiveSelector));
}

function shouldUseNormalScroll(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(normalScrollSelector));
}

function hasOpenOverlay() {
  return Boolean(
    document.querySelector(
      [
        "[role='dialog']",
        "[role='listbox']",
        "[aria-modal='true']",
        "[data-radix-popper-content-wrapper]",
        "[data-radix-dialog-content]",
        ".lightbox",
        ".modal",
      ].join(",")
    )
  );
}

function findClosestSectionIndex(sections: HTMLElement[], offset: number) {
  const currentTop = window.scrollY + offset + 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const distance = Math.abs(sectionTop - currentTop);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export default function SectionScrollNavigator({
  sections,
  navbarOffset = 96,
  minDesktopWidth = 1024,
  debounceMs = 820,
}: SectionScrollNavigatorProps) {
  const lockedRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || sections.length < 2) return;

    const getSectionElements = () =>
      sections
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

    const isDesktop = () =>
      window.matchMedia(`(min-width: ${minDesktopWidth}px)`).matches;

    const scrollToSection = (section: HTMLElement) => {
      const top =
        section.getBoundingClientRect().top + window.scrollY - navbarOffset;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    };

    const navigate = (direction: 1 | -1) => {
      const sectionElements = getSectionElements();
      if (sectionElements.length < 2) return false;

      const currentIndex = findClosestSectionIndex(sectionElements, navbarOffset);
      const targetIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        sectionElements.length - 1
      );

      if (targetIndex === currentIndex) return false;

      lockedRef.current = true;
      scrollToSection(sectionElements[targetIndex]);

      window.setTimeout(() => {
        lockedRef.current = false;
      }, debounceMs);

      return true;
    };

    const onWheel = (event: WheelEvent) => {
      if (!isDesktop()) return;
      if (hasOpenOverlay()) return;
      if (isEditableTarget(event.target) || shouldUseNormalScroll(event.target)) return;
      if (lockedRef.current) {
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) < 18) return;

      const didNavigate = navigate(event.deltaY > 0 ? 1 : -1);
      if (didNavigate) {
        event.preventDefault();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isDesktop() || hasOpenOverlay() || shouldUseNormalScroll(event.target)) return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isDesktop()) return;
      if (hasOpenOverlay()) return;
      if (lockedRef.current || isEditableTarget(event.target) || shouldUseNormalScroll(event.target)) return;
      const startY = touchStartYRef.current;
      const endY = event.changedTouches[0]?.clientY ?? null;
      touchStartYRef.current = null;

      if (startY === null || endY === null) return;
      const distance = startY - endY;
      if (Math.abs(distance) < 56) return;

      navigate(distance > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [debounceMs, minDesktopWidth, navbarOffset, sections]);

  return null;
}
