import { useEffect, useState } from "react";
import { getAllEventsApi } from "../services/eventService";

// An event is "active" when it is switched on (Is Active) and has not
// ended yet.
const isActiveEvent = (event) =>
  event.isActive !== false &&
  event.status !== "Expired" &&
  (!event.endDateTime || new Date(event.endDateTime).getTime() >= Date.now());

// Editions = events. Label is the event's edition name ("Parv 6"), falling
// back to its title. Newest first.
//
// activeOnly: only editions of active events (so when two events are active
//   at the same time, both are listed; an ended / switched-off event drops
//   out by itself).
// include: an edition id that must stay in the list even when it is no
//   longer active (e.g. the one currently selected as a filter).
export default function useEditionOptions({ activeOnly = false, include = "" } = {}) {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getAllEventsApi({ page: 1, limit: 200 });
        const list = (res?.data || [])
          .filter(
            (event) =>
              !activeOnly || isActiveEvent(event) || event._id === include
          )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, include]);

  return { editions, loading };
}
