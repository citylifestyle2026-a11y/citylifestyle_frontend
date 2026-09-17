import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Converted from the identical IIFE duplicated in sparkle.html ("Recent
 * Meets") and parv.html ("Evenings To Remember"):
 *
 *   function visibleCount() { return window.innerWidth <= 900 ? 1 : 2; }
 *   function update() { ...translateX(calc(-index * ((100% - gap*(visible-1))/visible + gap)))... }
 *
 * The math/behavior (2 cards visible above 900px, 1 below, 24px gap,
 * clamping index to the last valid page, disabling arrows at the ends) is
 * unchanged — only the DOM (getElementById/classList/style.transform)
 * became React state + an inline style object.
 *
 * AUTO-SCROLL: added on top of the original behavior — advances to the
 * next page every 2s and loops back to the start after the last page,
 * same as the manual "next" arrow would. Pauses while the pointer is
 * over the carousel (setPaused, wired to onMouseEnter/onMouseLeave on
 * the track) so it doesn't fight someone actively browsing the cards,
 * and pauses automatically once there's nothing to scroll to
 * (maxIndex === 0, e.g. on a very wide screen). Both "Recent Meets"
 * (Sparkle.jsx) and "Evenings To Remember" (Parv.jsx) get this for free
 * since they already share this one hook.
 */
export default function useCardCarousel(itemCount) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(
    typeof window !== "undefined" && window.innerWidth <= 900 ? 1 : 2
  );
  const [paused, setPaused] = useState(false);

  const visibleCount = useCallback(() => {
    return typeof window !== "undefined" && window.innerWidth <= 900 ? 1 : 2;
  }, []);

  useEffect(() => {
    function handleResize() {
      setVisible(visibleCount());
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [visibleCount]);

  const maxIndex = Math.max(0, itemCount - visible);

  // clamp if items/visible count changes and current index is now out of range
  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || maxIndex === 0) return undefined;

    const timer = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, 2000);

    return () => clearInterval(timer);
  }, [paused, maxIndex]);

  const gap = 24;
  const trackStyle = {
    transform: `translateX(calc(-${index} * ((100% - ${gap * (visible - 1)}px) / ${visible} + ${gap}px)))`,
  };

  const goPrev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setIndex((i) => (i < maxIndex ? i + 1 : i));

  return {
    index,
    trackStyle,
    canPrev: index > 0,
    canNext: index < maxIndex,
    goPrev,
    goNext,
    // Spread onto the track's wrapper (e.g. <div {...carousel.hoverProps}>)
    // to pause auto-scroll while the pointer is over the carousel.
    hoverProps: {
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
    },
  };
}