import { useRef, useState, useEffect } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
import { useGlobalEvent } from "../context/EventContext";
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
  const defaultExpired = Boolean(defaultEvent?.endDateTime) && new Date(defaultEvent.endDateTime).getTime() < Date.now();
  // An event that has ended shows "Expired" next to its name.
  const items = [
    { value: "", label: defaultLabel, expired: defaultExpired },
    ...eventOptions,
  ].map((o) => ({ ...o, text: o.expired ? `${o.label} (Expired)` : o.label }));
  const current = items.find((o) => o.value === selectedEventId) || items[0];

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
          title={current.text}
        >
          <span className="globalEventSelect__value">{current.text}</span>
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
                    title={opt.text}
                  >
                    <span className="globalEventSelect__optionText">{opt.text}</span>
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