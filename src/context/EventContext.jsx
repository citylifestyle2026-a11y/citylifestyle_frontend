import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getAllEventsApi } from "../services/eventService";
import { selectDeletedEventVersion } from "../redux/event/eventSlice";

/**
 * ONE event selection for the whole admin (the dropdown in the header).
 *
 *  selectedEventId  - what the admin picked ("" = Active Event (Default))
 *  effectiveEventId - the event the pages really use: the picked one, or the
 *                     default (running event, else the last ended one)
 *  eventOptions     - events for the dropdown (only switched-on events)
 *
 * Contact Book, Guest List, Entry Report, Manual Booking, Crew and the
 * Dashboard all read `effectiveEventId`, so each event keeps its own data.
 * Company Category and Form Links are the same for every event.
 * The choice is remembered in this browser.
 */
const STORAGE_KEY = "cl_selected_event";

const EventContext = createContext({
  selectedEventId: "",
  effectiveEventId: "",
  defaultEvent: null,
  setSelectedEventId: () => {},
  events: [],
  eventOptions: [],
  loading: false,
});

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

// An event whose end date/time has passed.
export const isEnded = (e) =>
  Boolean(e?.endDateTime) && new Date(e.endDateTime).getTime() < Date.now();

// Same rule as the dashboard: running event first, else the last ended one.
const pickDefaultEvent = (events) => {
  const now = Date.now();
  const on = events.filter((e) => e.isActive === true);
  const running = on
    .filter((e) => e.endDateTime && new Date(e.endDateTime).getTime() >= now)
    .sort((a, b) => new Date(a.startDateTime || 0) - new Date(b.startDateTime || 0))[0];
  if (running) return running;
  return (
    on
      .filter((e) => e.endDateTime && new Date(e.endDateTime).getTime() < now)
      .sort((a, b) => new Date(b.endDateTime) - new Date(a.endDateTime))[0] || null
  );
};

export function EventProvider({ children }) {
  const token = useSelector((state) => state.auth.token);
  // Bumps every time an event is deleted -> reload the dropdown list.
  const deletedVersion = useSelector(selectDeletedEventVersion);
  const [selectedEventId, setSelectedEventIdState] = useState(readStored);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const setSelectedEventId = useCallback((id) => {
    const next = id || "";
    setSelectedEventIdState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked: the choice just lasts until reload */
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setEvents([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await getAllEventsApi({ page: 1, limit: 1000 });
        if (!cancelled) setEvents(res?.data || []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, deletedVersion]);

  const eventOptions = useMemo(
    () =>
      events
        .filter((e) => e.isActive === true)
        .map((e) => {
          const expired = isEnded(e);
          return {
            value: e._id,
            label: e.title,
            expired,
            status: expired ? "Expired" : "Active",
          };
        }),
    [events]
  );

  // A remembered event that no longer exists / is switched off -> back to default.
  useEffect(() => {
    if (loading || !events.length || !selectedEventId) return;
    if (!eventOptions.some((o) => o.value === selectedEventId)) setSelectedEventId("");
  }, [loading, events, eventOptions, selectedEventId, setSelectedEventId]);

  // The event "Active Event (Default)" stands for (shown by its name in the header).
  const defaultEvent = useMemo(() => pickDefaultEvent(events), [events]);
  const effectiveEventId = selectedEventId || defaultEvent?._id || "";

  const value = useMemo(
    () => ({
      selectedEventId,
      effectiveEventId,
      defaultEvent,
      setSelectedEventId,
      events,
      eventOptions,
      loading,
    }),
    [selectedEventId, effectiveEventId, defaultEvent, setSelectedEventId, events, eventOptions, loading]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalEvent = () => useContext(EventContext);