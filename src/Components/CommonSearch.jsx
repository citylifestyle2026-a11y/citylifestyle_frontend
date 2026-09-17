/**
 * CommonSearch
 * ------------------------------------------------------------------
 * A generic, presentation-only search box used to remove duplicated
 * "icon + input" search UI across pages such as User, Event, Booking
 * and Entry Report.
 *
 * IMPORTANT: This component intentionally contains NO page-specific
 * data, API calls, Redux logic, debounce timers, or search/filter
 * algorithms. Every page keeps full ownership of:
 *   - its own search state (raw value vs. debounced/applied value)
 *   - when a request actually fires (on change, on debounce, on
 *     Enter, on an explicit Search button, etc.)
 *   - what happens on Enter / Escape / clear
 *
 * CommonSearch only renders the controlled <input> (plus an optional
 * icon and/or clear affordance) and forwards events to the handlers
 * the page provides — it never decides *when* to search.
 *
 * ------------------------------- Props -------------------------------
 * value: string                        // current input value (controlled)
 * onChange: (event) => void            // required — page owns what happens on change
 * onKeyDown?: (event) => void          // optional — e.g. trigger search on Enter
 * placeholder?: string                 // default: undefined (no placeholder, matches
 *                                       // pages that don't set one, e.g. Event.jsx)
 * type?: "text" | "search"             // default: "text"
 * disabled?: boolean                   // default: false — only applied if a page passes it
 * loading?: boolean                    // default: false — sets aria-busy on the container;
 *                                       // does NOT disable the input unless `disabled` is also passed,
 *                                       // since no existing page currently disables search while loading
 * icon?: React.ReactNode               // the page's own icon markup (already classNamed/wrapped
 *                                       // exactly as it was before, e.g. <FaSearch /> or a custom <svg>)
 * onClear?: () => void                 // optional — renders a clear ("x") button when provided.
 *                                       // Omit it (as all four pages currently do) and no clear
 *                                       // button is rendered, preserving current behavior exactly.
 * clearButtonClassName?: string        // className for the optional clear button
 * clearButtonLabel?: React.ReactNode   // content of the optional clear button (default: "×")
 * containerClassName?: string          // className for the wrapping <div> (e.g. "userPage__searchBox")
 * inputClassName?: string              // className for the <input> (e.g. "userPage__searchInput")
 * inputRef?: React.Ref                 // forwarded ref to the <input>, if a page needs it
 * name?: string
 * id?: string
 * autoFocus?: boolean
 * ------------------------------------------------------------------
 */
export default function CommonSearch({
  value,
  onChange,
  onKeyDown,
  placeholder,
  type = "text",
  disabled = false,
  loading = false,
  icon,
  onClear,
  clearButtonClassName,
  clearButtonLabel = "\u00D7",
  containerClassName,
  inputClassName,
  inputRef,
  name,
  id,
  autoFocus,
}) {
  return (
    <div className={containerClassName} aria-busy={loading || undefined}>
      {icon}
      <input
        ref={inputRef}
        type={type}
        name={name}
        id={id}
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      {onClear && (
        <button
          type="button"
          className={clearButtonClassName}
          onClick={onClear}
          aria-label="Clear search"
        >
          {clearButtonLabel}
        </button>
      )}
    </div>
  );
}
