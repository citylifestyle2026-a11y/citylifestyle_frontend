import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaSearch, FaTimes } from "react-icons/fa";

import "../assets/CSS/MultiSelect.css";

/**
 * MultiSelect - a dropdown where several options can be ticked.
 *
 *  value:    array of selected option values
 *  onChange: (nextArray) => void
 *  options:  [{ value, label }]
 *
 * Closed button shows the placeholder ("All References"), the chosen label
 * (1 selected), or "N selected". The panel has a search box, "Select all
 * shown" / "Clear" and a checkbox per option. Closes on outside click / Esc.
 */
export default function MultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = "All",
  searchPlaceholder = "Search...",
  loading = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => String(o.label).toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const buttonText = (() => {
    if (value.length === 0) return placeholder;
    if (value.length <= 2) {
      return value
        .map((v) => options.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    }
    return `${value.length} selected`;
  })();

  const toggle = (optionValue) => {
    const next = new Set(selectedSet);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange?.([...next]);
  };

  const selectAllShown = () => {
    const next = new Set(selectedSet);
    shown.forEach((o) => next.add(o.value));
    onChange?.([...next]);
  };

  return (
    <div className={`multiSelect ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`multiSelect__button ${
          value.length > 0 ? "multiSelect__button--active" : ""
        } ${open ? "multiSelect__button--open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="multiSelect__text">{loading ? "Loading..." : buttonText}</span>
        {value.length > 0 && (
          <span className="multiSelect__count">{value.length}</span>
        )}
        <FaChevronDown className="multiSelect__chevron" />
      </button>

      {open && (
        <div className="multiSelect__panel" role="listbox" aria-multiselectable="true">
          <div className="multiSelect__searchRow">
            <FaSearch className="multiSelect__searchIcon" />
            <input
              ref={searchRef}
              type="text"
              className="multiSelect__search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="multiSelect__clearSearch"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="multiSelect__actions">
            <button
              type="button"
              className="multiSelect__link"
              onClick={selectAllShown}
              disabled={shown.length === 0}
            >
              Select all{query ? " shown" : ""}
            </button>
            <button
              type="button"
              className="multiSelect__link multiSelect__link--clear"
              onClick={() => onChange?.([])}
              disabled={value.length === 0}
            >
              Clear ({value.length})
            </button>
          </div>

          <ul className="multiSelect__list">
            {shown.length === 0 && (
              <li className="multiSelect__empty">No match found</li>
            )}
            {shown.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <li key={option.value}>
                  <label
                    className={`multiSelect__option ${
                      checked ? "multiSelect__option--checked" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
