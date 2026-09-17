import { memo } from "react";
import { FaSort } from "react-icons/fa";

/**
 * CommonTable
 * ------------------------------------------------------------------
 * A generic, presentation-only table used to remove duplicated table
 * markup (thead/tbody/loading/empty states) across pages such as
 * User, Event, Booking and Entry Report.
 *
 * IMPORTANT: This component intentionally contains NO page-specific
 * data, API calls, Redux logic or business logic. Every page keeps
 * full control of its own data-fetching, state and handlers, and
 * simply describes *how* its rows/columns should look via props.
 *
 * ------------------------------- Props -------------------------------
 * columns: Array<{
 *   key: string;                       // unique column id (used as React key)
 *   label: React.ReactNode;            // header text/content
 *   sortable?: boolean;                // shows the sort icon in the header (default: true)
 *   headerClassName?: string;          // className applied to the <th>
 *   cellClassName?: string;            // className applied to every <td> in this column
 *   cellStyle?: React.CSSProperties;   // inline style applied to every <td> in this column
 *   render?: (row, rowIndex) => React.ReactNode; // custom cell renderer.
 *            If omitted, the raw `row[key]` value is rendered.
 * }>
 *
 * data: Array<object>                  // rows to render
 * rowKey?: string | (row, rowIndex) => string | number
 *                                       // unique key per row (default: row._id)
 * rowClassName?: string | (row, rowIndex) => string
 *
 * loading?: boolean                    // shows the loading row instead of data
 * loadingMessage?: React.ReactNode     // default: "Loading..."
 *
 * error?: React.ReactNode | null       // shows the error row instead of data
 * errorMessage?: React.ReactNode       // fallback text if `error` isn't a string
 *
 * emptyMessage?: React.ReactNode       // shown when data.length === 0 (default: "No records found.")
 *
 * tableClassName?: string              // className applied to the <table> element
 *                                       // (drives all existing page-specific CSS, e.g. "userPage__table")
 * theadRowClassName?: string           // className applied to the header <tr>
 * thContentClassName?: string          // className applied to the <span> wrapping each header's content
 * sortIconClassName?: string           // className applied to the <FaSort /> icon
 * stateCellStyle?: React.CSSProperties // inline style applied to the loading/error/empty <td>
 *                                       // (default: { textAlign: "center" })
 * stateCellClassName?: string          // className applied to the loading/error/empty <td>
 * ------------------------------------------------------------------
 *
 * PERFORMANCE NOTE: wrapped in React.memo. CommonTable can render up to a
 * full page of rows (5–100 depending on the page-size selection), so it's
 * worth skipping its re-render when none of its props actually changed —
 * e.g. while the parent re-renders for an unrelated reason (a debounced
 * search input's local keystroke state, before the debounce fires and the
 * data/columns actually update). This only helps when the parent passes
 * referentially-stable props (memoized columns array, a Redux-selected
 * data array, primitive/string values for the rest) — it never changes
 * what gets rendered, only skips redundant re-renders of identical output.
 */
function CommonTable({
  columns = [],
  data = [],
  rowKey = "_id",
  rowClassName,

  loading = false,
  loadingMessage = "Loading...",

  error = null,
  errorMessage = "Something went wrong.",

  emptyMessage = "No records found.",

  tableClassName,
  theadRowClassName,
  thContentClassName,
  sortIconClassName,
  stateCellStyle = { textAlign: "center" },
  stateCellClassName,
}) {
  const colSpan = columns.length || 1;

  const getRowKey = (row, rowIndex) => {
    if (typeof rowKey === "function") return rowKey(row, rowIndex);
    return row?.[rowKey] ?? rowIndex;
  };

  const getRowClassName = (row, rowIndex) => {
    if (typeof rowClassName === "function") return rowClassName(row, rowIndex);
    return rowClassName;
  };

  return (
    <table className={tableClassName}>
      <thead>
        <tr className={theadRowClassName}>
          {columns.map((col) => (
            <th key={col.key} className={col.headerClassName}>
              <span className={thContentClassName}>
                {col.sortable !== false && (
                  <FaSort className={sortIconClassName} />
                )}
                {col.label}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td colSpan={colSpan} className={stateCellClassName} style={stateCellStyle}>
              {loadingMessage}
            </td>
          </tr>
        )}

        {!loading && error && (
          <tr>
            <td colSpan={colSpan} className={stateCellClassName} style={stateCellStyle}>
              {typeof error === "string" ? error : errorMessage}
            </td>
          </tr>
        )}

        {!loading && !error && data.length === 0 && (
          <tr>
            <td colSpan={colSpan} className={stateCellClassName} style={stateCellStyle}>
              {emptyMessage}
            </td>
          </tr>
        )}

        {!loading && !error && data.map((row, rowIndex) => (
          <tr key={getRowKey(row, rowIndex)} className={getRowClassName(row, rowIndex)}>
            {columns.map((col) => (
              <td key={col.key} className={col.cellClassName} style={col.cellStyle}>
                {col.render ? col.render(row, rowIndex) : row?.[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default memo(CommonTable);
