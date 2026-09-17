import Sidebar from "./Sidebar";
import Header from "./Header";

/**
 * CommonListLayout
 * ------------------------------------------------------------------
 * A generic, presentation-only page skeleton used to remove the
 * duplicated "Sidebar + Header + content wrapper" structure that was
 * identical (structurally) across the User, Event, Booking and Entry
 * Report pages — each page just used its own className and header
 * title.
 *
 * IMPORTANT: This component contains NO page-specific data, API
 * calls, Redux logic, or routing. It only arranges `<Sidebar />`,
 * `<Header title={headerTitle} />`, and the page's own content.
 *
 * `children` renders inside the content wrapper div — this is where
 * each page puts its header block, filter/table card, pagination,
 * and (for Booking, which already nested its modals inside its
 * content div) its modals too, exactly where they already were.
 *
 * `outsideMainArea` is an optional extra slot for content that a page
 * renders as a sibling of the Sidebar+Header+content area but still
 * inside the outer page wrapper — this preserves User's existing
 * structure, where its two modals sit outside `mainAreaClassName`
 * but inside `pageClassName`, without forcing that content to move
 * into the content wrapper (which would change existing structure).
 *
 * ------------------------------- Props -------------------------------
 * pageClassName?: string       // outermost wrapper className
 * mainAreaClassName?: string   // className of the div wrapping Header+content
 * contentClassName?: string    // className of the div wrapping `children`
 * headerTitle: string          // passed straight through to <Header title={...} />
 * children: React.ReactNode    // the page's own content
 * outsideMainArea?: React.ReactNode // optional, rendered after mainArea, still
 *                                    // inside the outer page wrapper
 * ------------------------------------------------------------------
 */
export default function CommonListLayout({
  pageClassName,
  mainAreaClassName,
  contentClassName,
  headerTitle,
  children,
  outsideMainArea,
}) {
  return (
    <div className={pageClassName}>
      <Sidebar />
      <div className={mainAreaClassName}>
        <Header title={headerTitle} />
        <div className={contentClassName}>{children}</div>
      </div>
      {outsideMainArea}
    </div>
  );
}
