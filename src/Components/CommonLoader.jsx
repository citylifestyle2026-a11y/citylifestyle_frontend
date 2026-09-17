/**
 * CommonLoader
 * ------------------------------------------------------------------
 * A generic, presentation-only loading-message renderer used to
 * remove the duplicated "loading..." table-state markup across the
 * Event, Booking and Entry Report pages.
 *
 * IMPORTANT: This component contains NO page-specific loading logic,
 * API calls, or Redux state. Each page still decides *when* to show
 * its loading state (its own `loading`/`listLoading` flag) and still
 * owns its own `<tr>`/`<td colSpan=...>` wrapper (colSpan differs per
 * page's column count) — CommonLoader only renders the message
 * content that goes inside that cell.
 *
 * Some pages wrap the message in a styled `<div>`/`<p>` (Booking,
 * Entry Report); Event renders the message as plain text with no
 * wrapper at all. Both are supported: omit `wrapperClassName` /
 * `messageClassName` to render bare text (Event's case), or provide
 * them to reproduce the wrapped markup exactly.
 *
 * ------------------------------- Props -------------------------------
 * message?: React.ReactNode        // default: "Loading..."
 * wrapperClassName?: string        // if provided, wraps the message in a <div>
 * messageClassName?: string        // if provided, wraps the message in a <p>
 * ------------------------------------------------------------------
 */
export default function CommonLoader({
  message = "Loading...",
  wrapperClassName,
  messageClassName,
}) {
  const content =
    messageClassName !== undefined ? (
      <p className={messageClassName}>{message}</p>
    ) : (
      message
    );

  if (!wrapperClassName) {
    return content;
  }

  return <div className={wrapperClassName}>{content}</div>;
}
