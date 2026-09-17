/**
 * CommonPageHeader
 * ------------------------------------------------------------------
 * A generic, presentation-only page-header block used to remove the
 * duplicated "title + breadcrumb (+ optional create button)" markup
 * across the User, Event, Booking and Entry Report pages.
 *
 * IMPORTANT: This component contains NO page-specific text, routes,
 * or handlers. Every page still authors its own breadcrumb trail
 * (some pages link "Dashboard" via react-router's <Link>, User uses a
 * plain <span>) and its own action button/link (User/Booking open a
 * modal via onClick, Event navigates via <Link>, Entry Report has no
 * action button at all) and passes that fully-built markup in as
 * `breadcrumb` / `actions` — CommonPageHeader never decides what
 * those do, it only arranges them.
 *
 * Structural note: when a page has an `actions` node (User, Event,
 * Booking), the title+breadcrumb are grouped inside a "left" wrapper
 * div so the header row can lay itself out with the action on the
 * right (matching each page's existing flex/row CSS). When a page has
 * no `actions` (Entry Report), no such wrapper is rendered — the
 * title and breadcrumb become direct children instead, exactly as
 * they were before.
 *
 * ------------------------------- Props -------------------------------
 * containerClassName?: string      // outer row/block className
 * leftWrapperClassName?: string    // className of the left-grouping div;
 *                                   // only rendered when `actions` is provided.
 *                                   // Pass undefined for a bare, class-less <div>
 *                                   // wrapper (User's case).
 * title: React.ReactNode           // required
 * titleClassName?: string
 * titleStyle?: React.CSSProperties // optional inline style (User's case)
 * breadcrumb?: React.ReactNode     // full breadcrumb markup, authored by the page
 * actions?: React.ReactNode        // full action button/link markup, authored by
 *                                   // the page. Omit entirely for pages with no
 *                                   // header action (Entry Report).
 * ------------------------------------------------------------------
 */
export default function CommonPageHeader({
  containerClassName,
  leftWrapperClassName,
  title,
  titleClassName,
  titleStyle,
  breadcrumb,
  actions,
}) {
  const titleAndBreadcrumb = (
    <>
      <h1 className={titleClassName} style={titleStyle}>
        {title}
      </h1>
      {breadcrumb}
    </>
  );

  return (
    <div className={containerClassName}>
      {actions ? (
        <div className={leftWrapperClassName}>{titleAndBreadcrumb}</div>
      ) : (
        titleAndBreadcrumb
      )}
      {actions}
    </div>
  );
}
