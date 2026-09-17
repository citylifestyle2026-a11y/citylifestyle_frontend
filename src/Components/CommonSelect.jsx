/**
 * CommonSelect
 * ------------------------------------------------------------------
 * A generic, presentation-only <select> dropdown used to remove
 * duplicated select/filter UI across pages such as User, Event,
 * Booking and Entry Report (rows-per-page selects, event filter
 * dropdowns, status filter, etc).
 *
 * IMPORTANT: This component intentionally contains NO page-specific
 * or hardcoded options. Every page keeps full ownership of:
 *   - what options exist (rows-per-page numbers, event lists, status
 *     values, ...) and how they're built/labelled/sorted
 *   - what happens on change (which state updates, whether the page
 *     resets to page 1, whether it re-fetches, etc.)
 *   - its own filtering/business logic
 *
 * CommonSelect only renders a controlled <select> (optionally with a
 * leading placeholder option and/or a clear button) and forwards
 * events to the handlers the page provides.
 *
 * ------------------------------- Props -------------------------------
 * value: string | number               // current selected value (controlled)
 * onChange: (event) => void            // required — page owns what happens on change
 * options: Array<{                     // required — the page supplies every option
 *   value: string | number;
 *   label: React.ReactNode;
 *   disabled?: boolean;
 * }>
 * placeholder?: React.ReactNode        // optional leading option (e.g. "All Events").
 *                                       // Omit it (as the rows-per-page selects do) and
 *                                       // no placeholder option is rendered.
 * placeholderValue?: string | number   // value of the placeholder option (default: "")
 * disabled?: boolean                   // default: false — only applied if a page passes it
 * loading?: boolean                    // default: false — sets aria-busy on the <select>;
 *                                       // does NOT disable it unless `disabled` is also passed
 * className?: string                   // className for the <select> itself
 *                                       // (e.g. "userPage__rowsSelect", "bookingPage-filterSelect")
 * containerClassName?: string          // optional wrapping <div> className. If omitted (and no
 *                                       // onClear), the <select> renders with no extra wrapper,
 *                                       // matching every page's current bare <select> markup.
 * onClear?: () => void                 // optional — renders a clear button when provided.
 *                                       // Omit it (as all current integrations do) and no clear
 *                                       // button is rendered, preserving current behavior exactly.
 * clearButtonClassName?: string
 * clearButtonLabel?: React.ReactNode   // default: "×"
 * id?: string
 * name?: string
 * ------------------------------------------------------------------
 */
export default function CommonSelect({
  value,
  onChange,
  options = [],
  placeholder,
  placeholderValue = "",
  disabled = false,
  loading = false,
  className,
  containerClassName,
  onClear,
  clearButtonClassName,
  clearButtonLabel = "\u00D7",
  id,
  name,
}) {
  const selectEl = (
    <select
      id={id}
      name={name}
      className={className}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-busy={loading || undefined}
    >
      {placeholder !== undefined && (
        <option value={placeholderValue}>{placeholder}</option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  // No page currently needs a wrapper/clear button around its select —
  // keep the DOM identical to the original bare <select> in that case.
  if (!containerClassName && !onClear) {
    return selectEl;
  }

  return (
    <div className={containerClassName}>
      {selectEl}
      {onClear && (
        <button
          type="button"
          className={clearButtonClassName}
          onClick={onClear}
          aria-label="Clear selection"
        >
          {clearButtonLabel}
        </button>
      )}
    </div>
  );
}
