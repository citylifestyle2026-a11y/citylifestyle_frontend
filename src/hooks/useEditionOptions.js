import { useEffect, useState } from "react";
import { getAllEventsApi } from "../services/eventService";

// Editions = events. Label is the event's edition name ("Parv 6"), falling
// back to its title. Newest first.
export default function useEditionOptions() {
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
            label: event.edition || event.title,
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
  }, []);

  return { editions, loading };
}
