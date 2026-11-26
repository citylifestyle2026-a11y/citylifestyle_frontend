import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaChevronDown, FaCheck } from "react-icons/fa";

import useClickOutside from "../hooks/useClickOutside";
import { getRunEventsApi } from "../services/runRegistrationService";
import "../assets/CSS/GlobalEventSelect.css";

// Header select of the Run Report page. Lists the "Let's Run" events - active
// AND expired ones, so an old event's report can be opened too - and is shown
// ONLY when there is more than one (with one event there is nothing to choose). The pick is kept in the URL (?event=<id>), which the Run Report page
// reads - so it never touches the event dropdown of the other pages.
// Same look as the header Event dropdown (GlobalEventSelect).
export default function RunEventSelect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [defaultEventId, setDefaultEventId] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    let cancelled = false;
    getRunEventsApi()
      .then((res) => {
        if (cancelled) return;
        setEvents(res?.data?.events || []);
        setDefaultEventId(res?.data?.defaultEventId ? String(res.data.defaultEventId) : "");
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (events.length < 2) return null;

  const items = events.map((e) => ({
    value: String(e._id),
    label: e.title,
    status: e.expired ? "Expired" : e.isActive ? "Active" : "Inactive",
  }));

  const picked = searchParams.get("event") || "";
  const currentId = items.some((i) => i.value === picked) ? picked : defaultEventId;
  const current = items.find((i) => i.value === currentId) || items[0];

  const pick = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === defaultEventId) next.delete("event");
    else next.set("event", value);
    setSearchParams(next, { replace: true });
    setOpen(false);
  };

  const renderStatus = (status) => (
    <span className={`globalEventSelect__status ${status === "Active" ? "is-active" : "is-expired"}`}>
      {status}
    </span>
  );

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
          title={`${current.label} - ${current.status}`}
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
                <li key={opt.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`globalEventSelect__option${selected ? " is-selected" : ""}`}
                    onClick={() => pick(opt.value)}
                    title={`${opt.label} - ${opt.status}`}
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
