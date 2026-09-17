/**
 * CommonEmptyState
 * ------------------------------------------------------------------
 * A generic, presentation-only "no records" state used to remove the
 * duplicated icon + message empty-state markup across the Event,
 * Booking and Entry Report pages — all three used the exact same SVG
 * icon and the same "icon above a message" shape, just with different
 * CSS classNames and different message text.
 *
 * IMPORTANT: This component contains NO page-specific data, API
 * calls, or Redux logic. Each page still decides *when* to show its
 * empty state and still owns its own `<tr>`/`<td colSpan=...>`
 * wrapper (colSpan and td/tr classNames differ per page) —
 * CommonEmptyState only renders the icon + message content that goes
 * inside that cell. Each page also supplies its own message text
 * (including Entry Report's dynamic "select an event" vs "no reports
 * found" text) rather than anything being hardcoded here.
 *
 * ------------------------------- Props -------------------------------
 * message: React.ReactNode         // required — the page's own empty-state text
 * icon?: React.ReactNode           // optional override. Defaults to the same
 *                                   // document/box icon every page already used.
 * wrapperClassName?: string        // className for the wrapping <div>
 * textClassName?: string           // className for the message <p>
 * ------------------------------------------------------------------
 */
const DEFAULT_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 460 512"
    width="120"
    className="bookingPage-stateIcon"
  >
    <path d="M220.6 130.3l-67.2 28.2V43.2L98.7 233.5l54.7-24.2v130.3l67.2-209.3zm-83.2-96.7l-1.3 4.7-15.2 52.9C80.6 106.7 52 145.8 52 191.5c0 52.3 34.3 95.9 83.4 105.5v53.6C57.5 340.1 0 272.4 0 191.6c0-80.5 59.8-147.2 137.4-158zm311.4 447.2c-11.2 11.2-23.1 12.3-28.6 10.5-5.4-1.8-27.1-19.9-60.4-44.4-33.3-24.6-33.6-35.7-43-56.7-9.4-20.9-30.4-42.6-57.5-52.4l-9.7-14.7c-24.7 16.9-53 26.9-81.3 28.7l2.1-6.6 15.9-49.5c46.5-11.9 80.9-54 80.9-104.2 0-54.5-38.4-102.1-96-107.1V32.3C254.4 37.4 320 106.8 320 191.6c0 33.6-11.2 64.7-29 90.4l14.6 9.6c9.8 27.1 31.5 48 52.4 57.4s32.2 9.7 56.8 43c24.6 33.2 42.7 54.9 44.5 60.3s.7 17.3-10.5 28.5zm-9.9-17.9c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8z" />
  </svg>
);

export default function CommonEmptyState({
  message,
  icon = DEFAULT_ICON,
  wrapperClassName,
  textClassName,
}) {
  return (
    <div className={wrapperClassName}>
      {icon}
      <p className={textClassName}>{message}</p>
    </div>
  );
}
