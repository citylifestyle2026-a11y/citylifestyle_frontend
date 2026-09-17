/**
 * CommonExportButton
 * ------------------------------------------------------------------
 * A generic, presentation-only export button used to remove the
 * duplicated export-button UI in the Booking and Entry Report pages.
 *
 * IMPORTANT: This component intentionally contains NO export API,
 * service, or Redux logic, and NO file-generation/download logic.
 * It only renders a button and forwards clicks to `onClick`. Every
 * page keeps full ownership of:
 *   - building its own export request params from its own filters
 *   - dispatching its own thunk (exportBookingReport /
 *     exportEntryReport)
 *   - handling the response (blob creation, triggering the browser
 *     download, success/error toasts, etc.)
 *   - deciding when the button should be disabled (e.g. Entry Report
 *     additionally disables while no event is selected)
 *
 * ------------------------------- Props -------------------------------
 * onClick: () => void                  // required — page's own handleExport, unchanged
 * loading?: boolean                    // default: false — page's own exportLoading flag.
 *                                       // Swaps the icon/label to the loading variants and
 *                                       // sets aria-busy; does NOT by itself disable the button
 *                                       // (pass `disabled` separately, since Entry Report disables
 *                                       // for an extra reason — no event selected — beyond loading)
 * disabled?: boolean                   // default: false — the page computes the final boolean
 *                                       // (e.g. `exportLoading` for Booking, `exportLoading || !eventId`
 *                                       // for Entry Report) and passes it in as-is
 * label?: React.ReactNode              // default: "Export" — text shown when not loading
 * loadingLabel?: React.ReactNode       // default: "Exporting..." — text shown while loading
 * icon?: React.ReactNode               // optional override for the leading icon. If omitted, the
 *                                       // same document/export icon both pages already use is rendered,
 *                                       // switching between `iconClassName` and `iconLoadingClassName`
 *                                       // based on `loading`.
 * className?: string                   // default: "erPage__btn erPage__btn--export"
 * iconClassName?: string               // default: "erPage__exportIcon"
 * iconLoadingClassName?: string        // default: "erPage__exportIcon erPage__exportIcon--spinning"
 * ------------------------------------------------------------------
 */
export default function CommonExportButton({
  onClick,
  loading = false,
  disabled = false,
  label = "Export",
  loadingLabel = "Exporting...",
  icon,
  className = "erPage__btn erPage__btn--export",
  iconClassName = "erPage__exportIcon",
  iconLoadingClassName = "erPage__exportIcon erPage__exportIcon--spinning",
}) {
  const defaultIcon = (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={loading ? iconLoadingClassName : iconClassName}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
    >
      {icon !== undefined ? icon : defaultIcon}
      {loading ? loadingLabel : label}
    </button>
  );
}
