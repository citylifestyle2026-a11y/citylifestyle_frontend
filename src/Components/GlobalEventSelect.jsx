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
  const { selectedEventId, setSelectedEventId, eventOptions } = useGlobalEvent();
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

  const items = [{ value: "", label: DEFAULT_LABEL }, ...eventOptions];
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
          title={current.label}
        >
          <span className="globalEventSelect__value">{current.label}</span>
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
                    title={opt.label}
                  >
                    <span className="globalEventSelect__optionText">{opt.label}</span>
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
