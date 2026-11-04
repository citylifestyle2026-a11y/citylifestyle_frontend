import { useRef, useState, useEffect } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
import { useGlobalEvent, isEnded } from "../context/EventContext";
import useClickOutside from "../hooks/useClickOutside";
import "../assets/CSS/GlobalEventSelect.css";

const DEFAULT_LABEL = "Active Event (Default)";

// The Event dropdown shown in the header of every event-wise page.
// A custom (styled) dropdown instead of the browser's native <select>, so the
// open list matches the admin theme. Same context values as before.
export default function GlobalEventSelect() {
  const { selectedEventId, setSelectedEventId, eventOptions, defaultEvent } = useGlobalEvent();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // The default entry shows the real name of the event it stands for,
  // e.g. "Test Event 1 (Default)"; the generic text only while it is unknown.
  const defaultLabel = defaultEvent?.title ? `${defaultEvent.title} (Default)` : DEFAULT_LABEL;
  // The default event is already the first entry, so it is not listed a second
  // time (picking it again would mean the same thing).
  const defaultId = defaultEvent?._id ? String(defaultEvent._id) : "";
  const otherEvents = defaultId
    ? eventOptions.filter((o) => String(o.value) !== defaultId)
    : eventOptions;
  const defaultExpired = isEnded(defaultEvent);
  const items = [
    {
      value: "",
      label: defaultLabel,
      // Status only when the default event is known (not the generic text).
      status: defaultEvent?._id ? (defaultExpired ? "Expired" : "Active") : "",
      expired: defaultExpired,
    },
    ...otherEvents,
  ];
  const current = items.find((o) => o.value === selectedEventId) || items[0];

  const renderStatus = (status) =>
    status ? (
      <span
        className={`globalEventSelect__status ${
          status === "Expired" ? "is-expired" : "is-active"
        }`}
      >
        {status}
      </span>
    ) : null;

  const pick = (value) => {
    setSelectedEventId(value);
    setOpen(false);
  };

  return (
    <div className="globalEventSelect" ref={wrapRef}>
      <span className="globalEventSelect__label">Event</span>

      <div className="globalEventSelect__control">
        <button
          type="button"
          className={`globalEventSelect__trigger${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={current.status ? `${current.label} - ${current.status}` : current.label}
        >
          <span className="globalEventSelect__value">{current.label}</span>
          {renderStatus(current.status)}
          <FaChevronDown className="globalEventSelect__chevron" />
        </button>

        {open && (
          <ul className="globalEventSelect__menu" role="listbox">
            {items.map((opt) => {
              const selected = opt.value === current.value;
              return (
                <li key={opt.value || "default"} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`globalEventSelect__option${selected ? " is-selected" : ""}`}
                    onClick={() => pick(opt.value)}
                    title={opt.status ? `${opt.label} - ${opt.status}` : opt.label}
                  >
                    <span className="globalEventSelect__optionText">{opt.label}</span>
                    {renderStatus(opt.status)}
                    {selected && <FaCheck className="globalEventSelect__check" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}