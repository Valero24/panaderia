"use client";

import { useEffect, useRef } from "react";

type SectionScrollNavigatorProps = {
  sections: string[];
  navbarOffset?: number;
  sectionOffsets?: Record<string, number>;
  minDesktopWidth?: number;
  debounceMs?: number;
  respectSectionContent?: boolean;
  maxSteps?: 1 | 2;
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

const defaultSectionOffsets: Record<string, number> = {};

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

function getDocumentMaxScroll() {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
}

function getClampedTargetTop(section: HTMLElement, offset: number) {
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  const targetTop = Math.max(0, Math.round(sectionTop - offset));

  return Math.min(targetTop, getDocumentMaxScroll());
}

function findCurrentSectionIndex(
  sections: HTMLElement[],
  getTargetTop: (section: HTMLElement) => number
) {
  const currentTop = Math.round(window.scrollY) + 24;
  let currentIndex = 0;

  sections.forEach((section, index) => {
    const sectionTop = getTargetTop(section);

    if (sectionTop <= currentTop) {
      currentIndex = index;
    }
  });

  return currentIndex;
}

function sectionHasRemainingScroll(
  section: HTMLElement,
  direction: 1 | -1,
  offset: number
) {
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  const sectionBottom = sectionTop + section.offsetHeight;
  const viewportTop = window.scrollY + offset;
  const viewportBottom = window.scrollY + window.innerHeight;
  const availableViewport = window.innerHeight - offset;
  const boundaryThreshold = 32;

  if (section.offsetHeight <= availableViewport + boundaryThreshold) {
    return false;
  }

  if (direction > 0) {
    return sectionBottom - viewportBottom > boundaryThreshold;
  }

  return viewportTop - sectionTop > boundaryThreshold;
}

function getWheelStepCount(delta: number) {
  const absDelta = Math.abs(delta);

  if (absDelta >= 650) return 2;
  return 1;
}

export default function SectionScrollNavigator({
  sections,
  navbarOffset = 96,
  sectionOffsets = defaultSectionOffsets,
  minDesktopWidth = 1024,
  debounceMs = 620,
  respectSectionContent = true,
  maxSteps = 2,
}: SectionScrollNavigatorProps) {
  const lockedRef = useRef(false);
  const wheelDeltaRef = useRef(0);
  const lastWheelDirectionRef = useRef<1 | -1 | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const pendingNavigationRef = useRef<{ direction: 1 | -1; steps: number } | null>(
    null
  );
  const touchStartYRef = useRef<number | null>(null);
  const isDesktopRef = useRef(false);
  const sectionElementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || sections.length < 2) return;

    const hydrateSectionElements = () => {
      sectionElementsRef.current = sections
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));
    };

    const updateIsDesktop = () => {
      isDesktopRef.current = window.matchMedia(
        `(min-width: ${minDesktopWidth}px)`
      ).matches;
    };

    hydrateSectionElements();
    updateIsDesktop();

    if (sectionElementsRef.current.length < 2) return;

    const getSectionOffset = (section: HTMLElement) => {
      const configuredOffset = sectionOffsets[section.id];
      if (Number.isFinite(configuredOffset)) {
        return configuredOffset;
      }

      const customOffset = Number(section.dataset.scrollOffset);

      return Number.isFinite(customOffset) ? customOffset : navbarOffset;
    };

    const scrollToSection = (section: HTMLElement) => {
      window.scrollTo({
        top: getClampedTargetTop(section, getSectionOffset(section)),
        behavior: "smooth",
      });
    };

    const getCurrentIndex = (sectionElements: HTMLElement[]) =>
      findCurrentSectionIndex(sectionElements, (section) =>
        getClampedTargetTop(section, getSectionOffset(section))
      );

    const canNavigate = (direction: 1 | -1) => {
      const sectionElements = sectionElementsRef.current;
      if (sectionElements.length < 2) return false;

      const currentIndex = getCurrentIndex(sectionElements);
      const currentSection = sectionElements[currentIndex];

      if (
        respectSectionContent &&
        currentSection &&
        sectionHasRemainingScroll(currentSection, direction, navbarOffset)
      ) {
        return false;
      }

      const targetIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        sectionElements.length - 1
      );

      return targetIndex !== currentIndex;
    };

    const navigate = (direction: 1 | -1, steps = 1) => {
      const sectionElements = sectionElementsRef.current;
      if (sectionElements.length < 2) return false;

      const currentIndex = getCurrentIndex(sectionElements);
      const currentSection = sectionElements[currentIndex];

      if (
        respectSectionContent &&
        currentSection &&
        sectionHasRemainingScroll(currentSection, direction, navbarOffset)
      ) {
        return false;
      }

      const targetIndex = Math.min(
        Math.max(currentIndex + direction * steps, 0),
        sectionElements.length - 1
      );

      if (targetIndex === currentIndex) return false;

      lockedRef.current = true;
      scrollToSection(sectionElements[targetIndex]);

      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
      }

      animationTimerRef.current = window.setTimeout(() => {
        lockedRef.current = false;
        animationTimerRef.current = null;

        const pendingNavigation = pendingNavigationRef.current;
        pendingNavigationRef.current = null;

        if (pendingNavigation && canNavigate(pendingNavigation.direction)) {
          navigate(pendingNavigation.direction, pendingNavigation.steps);
        }
      }, debounceMs);

      return true;
    };

    const addPendingNavigation = (direction: 1 | -1, steps: number) => {
      const currentPending = pendingNavigationRef.current;

      pendingNavigationRef.current =
        currentPending && currentPending.direction === direction
          ? { direction, steps: Math.min(2, Math.max(currentPending.steps, steps)) }
          : { direction, steps };
    };

    const flushWheelIntent = () => {
      wheelTimerRef.current = null;

      const delta = wheelDeltaRef.current;
      wheelDeltaRef.current = 0;

      if (Math.abs(delta) < 18) return;

      const direction = delta > 0 ? 1 : -1;
      const steps = Math.min(maxSteps, getWheelStepCount(delta));

      if (lockedRef.current) {
        addPendingNavigation(direction, steps);
        return;
      }

      navigate(direction, steps);
    };

    const scheduleWheelFlush = () => {
      if (wheelTimerRef.current) {
        window.clearTimeout(wheelTimerRef.current);
      }

      wheelTimerRef.current = window.setTimeout(flushWheelIntent, 150);
    };

    const addWheelDelta = (deltaY: number) => {
      const direction = deltaY > 0 ? 1 : -1;

      if (lastWheelDirectionRef.current !== direction) {
        wheelDeltaRef.current = 0;
      }

      lastWheelDirectionRef.current = direction;
      wheelDeltaRef.current += deltaY;
    };

    const onWheel = (event: WheelEvent) => {
      if (!isDesktopRef.current) return;
      if (hasOpenOverlay()) return;
      if (isEditableTarget(event.target) || shouldUseNormalScroll(event.target)) return;
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) < 18) return;

      const direction = event.deltaY > 0 ? 1 : -1;

      if (!lockedRef.current && !canNavigate(direction)) {
        return;
      }

      event.preventDefault();
      addWheelDelta(event.deltaY);
      scheduleWheelFlush();
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isDesktopRef.current || hasOpenOverlay() || shouldUseNormalScroll(event.target)) return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isDesktopRef.current) return;
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

    const onResize = () => {
      updateIsDesktop();
      hydrateSectionElements();
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      if (wheelTimerRef.current) {
        window.clearTimeout(wheelTimerRef.current);
      }
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
      }
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
    };
  }, [debounceMs, maxSteps, minDesktopWidth, navbarOffset, respectSectionContent, sectionOffsets, sections]);

  return null;
}
