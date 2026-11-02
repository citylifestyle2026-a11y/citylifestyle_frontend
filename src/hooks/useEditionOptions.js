import { useEffect, useState } from "react";
import { getAllEventsApi } from "../services/eventService";

const isExpiredEvent = (event) =>
  Boolean(event.endDateTime) && new Date(event.endDateTime).getTime() < Date.now();

// Editions = events. Label is the event's edition name ("Parv 6"), falling
// back to its title. Newest first.
//
// EVERY edition is listed, including events that have already expired (they
// get an "(Expired)" tag), so an ended edition can still be picked and
// filtered everywhere. `activeOnly` / `include` are kept so existing callers
// do not break, but they no longer hide anything.
// eslint-disable-next-line no-unused-vars
export default function useEditionOptions({ activeOnly = false, include = "" } = {}) {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getAllEventsApi({ page: 1, limit: 200 });
        const list = (res?.data || [])
          .map((event) => ({
            value: event._id,
            label: `${event.edition || event.title}${isExpiredEvent(event) ? " (Expired)" : ""}`,
            expired: isExpiredEvent(event),
            startDateTime: event.startDateTime,
          }))
          .sort(
            (a, b) =>
              new Date(b.startDateTime || 0) - new Date(a.startDateTime || 0)
          );

        if (!cancelled) setEditions(list);
      } catch {
        if (!cancelled) setEditions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, include]);

  return { editions, loading };
}
