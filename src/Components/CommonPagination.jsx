import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/**
 * CommonPagination
 * ------------------------------------------------------------------
 * A generic, presentation-only pagination bar used to remove the
 * duplicated "Show X - Y of Z" + prev/numbered/next controls markup
 * across pages such as User, Event, Booking and Entry Report.
 *
 * IMPORTANT: This component intentionally contains NO page-specific
 * data, API calls, Redux logic, or pagination math beyond generating
 * the windowed page-number list (1 ... 43 44 45 ... 117) (a pure, identical computation that
 * was previously duplicated verbatim in every page). Every page keeps
 * full ownership of:
 *   - its own page/pageSize state and how it's fetched from the API
 *   - the "start/end of total" numbers shown in the info text (each
 *     page still computes these exactly as before and just passes the
 *     resulting numbers in)
 *   - what happens on Previous / Next / a specific page number click
 *     (each page passes its own existing handler function unchanged)
 *   - whether the whole control row is shown at all, and whether the
 *     Previous/Next buttons are currently disabled
 *
 * ------------------------------- Props -------------------------------
 * currentPage: number                  // required
 * totalPages: number                   // required — drives the [1..totalPages] buttons
 *
 * rangeStart: number | string          // already-computed display value for
 *                                       // "Show {rangeStart} - {rangeEnd} of {totalItems}"
 * rangeEnd: number | string
 * totalItems: number
 *
 * onPageSelect: (page: number) => void // required — called when a numbered button is clicked
 * onPrevious: () => void               // required — called on the "prev" arrow click
 * onNext: () => void                   // required — called on the "next" arrow click
 *
 * prevDisabled: boolean                // required — page computes this exactly as before
 * nextDisabled: boolean                // required — page computes this exactly as before
 * pageButtonDisabled?: boolean         // default: false — disables the numbered buttons
 *                                       // (only Entry Report currently passes `loading` here)
 *
 * showControls?: boolean               // default: totalPages > 1 — whether to render the
 *                                       // prev/numbers/next row at all (User passes its own
 *                                       // `totalEntries > rowsPerPage` condition here)
 *
 * containerClassName?: string          // default: "permissionPagePagination"
 * infoClassName?: string               // default: "permissionPagePaginationInfo"
 * controlsClassName?: string           // default: "permissionPagePaginationControls"
 * arrowClassName?: string              // default: "permissionPagePaginationArrow"
 * buttonClassName?: string             // default: "permissionPagePaginationBtn"
 * activeButtonClassName?: string       // default: "permissionPagePaginationActive"
 * inactiveButtonClassName?: string     // default: "" (Entry Report overrides both of these
 *                                       // to match its own active/reset class names)
 * prevIcon?: React.ReactNode           // default: <FaChevronLeft />
 * nextIcon?: React.ReactNode           // default: <FaChevronRight />
 * prevLabel?: string                   // default: "Previous page" — aria-label for the prev button
 * nextLabel?: string                   // default: "Next page" — aria-label for the next button
 * ------------------------------------------------------------------
 */
export default function CommonPagination({
  currentPage,
  totalPages,

  rangeStart,
  rangeEnd,
  totalItems,

  onPageSelect,
  onPrevious,
  onNext,

  prevDisabled,
  nextDisabled,
  pageButtonDisabled = false,

  showControls = totalPages > 1,

  containerClassName = "permissionPagePagination",
  infoClassName = "permissionPagePaginationInfo",
  controlsClassName = "permissionPagePaginationControls",
  arrowClassName = "permissionPagePaginationArrow",
  buttonClassName = "permissionPagePaginationBtn",
  activeButtonClassName = "permissionPagePaginationActive",
  inactiveButtonClassName = "",
  prevIcon = <FaChevronLeft />,
  nextIcon = <FaChevronRight />,
  prevLabel = "Previous page",
  nextLabel = "Next page",
}) {
  // Windowed page list: always show the first and last page plus the
  // pages around the current one, and collapse the rest into "..." so the
  // bar never overflows when there are hundreds of pages. Small page counts
  // (<= 7) still show every number exactly as before.
  const buildPageItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const safeCurrent = Math.min(Math.max(currentPage || 1, 1), totalPages);
    const pages = new Set([1, totalPages]);

    for (let p = safeCurrent - 1; p <= safeCurrent + 1; p += 1) {
      if (p > 1 && p < totalPages) pages.add(p);
    }

    // Keep the bar a steady width near the ends (e.g. 1 2 3 4 ... 117).
    if (safeCurrent <= 3) {
      [2, 3, 4].forEach((p) => pages.add(p));
    }
    if (safeCurrent >= totalPages - 2) {
      [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) =>
        pages.add(p)
      );
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const items = [];

    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        items.push(`gap-${page}`);
      }
      items.push(page);
    });

    return items;
  };

  const pageItems = buildPageItems();

  return (
    <div className={containerClassName}>
      <span className={infoClassName}>
        Show {rangeStart} - {rangeEnd} of {totalItems}
      </span>

      {showControls && (
        <div className={controlsClassName} style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className={arrowClassName}
            onClick={onPrevious}
            disabled={prevDisabled}
            aria-label={prevLabel}
          >
            {prevIcon}
          </button>

          {pageItems.map((item) =>
            typeof item === "string" ? (
              <span
                key={item}
                className={buttonClassName}
                style={{ cursor: "default", userSelect: "none" }}
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`${buttonClassName} ${
                  currentPage === item ? activeButtonClassName : inactiveButtonClassName
                }`}
                onClick={() => onPageSelect(item)}
                disabled={pageButtonDisabled}
                aria-current={currentPage === item ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            className={arrowClassName}
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={nextLabel}
          >
            {nextIcon}
          </button>
        </div>
      )}
    </div>
  );
}
