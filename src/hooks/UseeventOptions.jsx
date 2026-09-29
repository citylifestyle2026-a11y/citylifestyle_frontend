import { useEffect, useState } from "react";
import { getAllEventsApi } from "../services/eventService";

// Events for the Event History page: the filter dropdown and the checkbox
// list in the Add / Edit modal. Oldest event first (by event date).
//
// Uses the events API directly (local state) instead of the shared
// `state.event` slice, so opening Event History never overwrites the list
// the Event page is showing.
export default function useEventOptions() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getAllEventsApi({ page: 1, limit: 200 });
        const list = (res?.data || [])
          .slice()
          .sort(
            (a, b) =>
              new Date(a.startDateTime || 0) - new Date(b.startDateTime || 0)
          );
        if (!cancelled) setEvents(list);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { events, loading };
}