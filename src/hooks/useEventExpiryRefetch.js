import { useEffect, useRef } from "react";

/**
 * Fixes the "Active event goes Inactive/Expired but the page doesn't
 * update until a manual browser refresh" issue, without polling and
 * without full-page reloads.
 *
 * Given an event's endDateTime, this schedules exactly ONE setTimeout that
 * fires right when the event actually expires, and calls onExpire() once
 * at that moment so the page can re-fetch its data with the existing
 * thunks. A visibilitychange/focus listener acts as a safety net only:
 * browsers throttle timers in backgrounded tabs, so if the tab was hidden
 * right at the expiry instant, we catch up as soon as it's foregrounded
 * again — we do NOT poll on an interval.
 *
 * Guarantees no duplicate calls:
 * - `firedRef` ensures onExpire runs at most once per distinct endDateTime.
 * - If endDateTime doesn't change between renders (e.g. an unrelated
 *   re-render, or a re-fetch that returns the same still-active event),
 *   the effect does not re-run and no new timer/call is scheduled.
 * - When endDateTime changes (new event, or event cleared to null/undefined
 *   after expiry), the old timer/listeners are cleaned up and firedRef
 *   resets, so a genuinely new event gets its own single scheduled check.
 *
 * @param {string|number|Date|null|undefined} endDateTime
 * @param {() => void} onExpire - invoked once when the event's end time is reached
 */
export default function useEventExpiryRefetch(endDateTime, onExpire) {
  const firedRef = useRef(false);

  // Always call the *latest* onExpire (current filters/page/etc.) without
  // that changing-on-every-render closure forcing the effect below to
  // re-run and reschedule the timer.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    firedRef.current = false;

    if (!endDateTime) return undefined;

    const endTime = new Date(endDateTime).getTime();
    if (Number.isNaN(endTime)) return undefined;

    const msUntilExpiry = endTime - Date.now();

    // Already expired by the time this render ran. This can happen with
    // stale cached data (e.g. dashboardData surviving a remount without
    // being cleared) — the data on hand may predate the actual expiry, so
    // "nothing to schedule" is not safe to assume. Trigger a single
    // corrective refetch right now instead of silently doing nothing;
    // firedRef still guarantees this fires at most once per endDateTime.
    if (msUntilExpiry <= 0) {
      firedRef.current = true;
      onExpireRef.current?.();
      return undefined;
    }

    // setTimeout's delay is a 32-bit signed int; cap it so far-future
    // events don't overflow. Events scheduled further out than this will
    // still be caught by the focus/visibility safety net below whenever
    // the user is actually looking at the page around the real expiry time.
    const MAX_TIMEOUT = 2147483647;
    const delay = Math.min(msUntilExpiry + 1000, MAX_TIMEOUT);

    const timerId = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      onExpireRef.current?.();
    }, delay);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (firedRef.current) return;
      if (Date.now() < endTime) return;
      firedRef.current = true;
      onExpireRef.current?.();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [endDateTime]);
}