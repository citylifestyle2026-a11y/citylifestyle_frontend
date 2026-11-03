import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

import "../assets/CSS/ReferenceDetailsModal.css";

/**
 * Event History -> "+N more" on the Reference column.
 * Lists EVERY edition of one person with that edition's reference(s) and
 * status, so nothing is squeezed into the table cell.
 *
 *  personName   - guest name (or spouse name for a spouse row)
 *  mobile       - the person's number
 *  rows         - [{ id, edition, references: string[], status }]
 *  highlightKeys- Set of lower-case references currently ticked in the filter
 *  onClose      - () => void
 */
export default function ReferenceDetailsModal({
  personName = "",
  mobile = "",
  rows = [],
  highlightKeys = new Set(),
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="refModal__overlay" onClick={onClose}>
      <div
        className="refModal__container"
        role="dialog"
        aria-modal="true"
        aria-label="Reference by edition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="refModal__header">
          <div>
            <h3 className="refModal__title">Reference by Edition</h3>
            <p className="refModal__sub">
              <strong>{personName || "-"}</strong>
              {mobile ? <span> · {mobile}</span> : null}
            </p>
          </div>
          <button type="button" className="refModal__close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="refModal__body">
          <table className="refModal__table">
            <thead>
              <tr>
                <th>Edition</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="refModal__edition">{item.edition || "-"}</td>
                  <td>
                    {item.references.length === 0 ? (
                      "-"
                    ) : (
                      <span className="refModal__chips">
                        {item.references.map((ref) => (
                          <span
                            key={ref}
                            className={`refModal__chip${
                              highlightKeys.has(ref.trim().toLowerCase()) ? " refModal__chip--hit" : ""
                            }`}
                          >
                            {ref}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`refModal__status refModal__status--${(item.status || "").replace(/\s+/g, "")}`}
                    >
                      {item.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="refModal__footer">
          <button type="button" className="refModal__doneBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
