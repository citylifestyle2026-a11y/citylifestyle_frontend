import React from "react";
import '../assets/CSS/DashboardCard.css';

function DashboardCard({
  title = "Card Title",
  amountValue,
  amountLabel,
  // Optional — renders a second amount block on the right side of the
  // header. Only Total/Today Pass Booking use this; every other card
  // leaves these undefined and renders exactly as before.
  secondaryAmountValue,
  secondaryAmountLabel,
  columns = ["Date", "QTY"],
  rows = [
    { label: "No Data Selected", value: "0" },
    { label: "Placeholder Row", value: "0" },
  ],
  emptyText,
  // Optional — when provided, renders this single line instead of the
  // Date/QTY table entirely. Used by Today Booking (just shows today's
  // date under the quantity, no table).
  noteText,
  // Optional — when true, renders nothing below the header at all (no
  // column headers, no rows, no empty-state text). Used by Today Pass
  // Booking so "No Bookings Available" never appears; every other card
  // leaves this false and is unaffected.
  hideBody = false,
}) {
  // Optional 3rd column (e.g. "Amount"). Only Pass Booking cards pass a
  // 3-item columns array / rows with `value2` — every other card keeps
  // its existing 2-column layout untouched.
  const hasThirdColumn = Boolean(columns[2]);

  return (
    <div className="card">
      <div className="cardHeader">
        {amountValue ? (
          <div className="cardAmount">
            <p className="cardAmountValue">{amountValue}</p>
            <p className="cardAmountLabel">{amountLabel || title}</p>
          </div>
        ) : (
          <p className="cardTitle">{title}</p>
        )}

        {secondaryAmountValue !== undefined && (
          <div className="cardAmount cardAmountSecondary">
            <p className="cardAmountValue">{secondaryAmountValue}</p>
            <p className="cardAmountLabel">{secondaryAmountLabel}</p>
          </div>
        )}
      </div>

      {!hideBody &&
        (noteText !== undefined ? (
          <p className="cardNote">{noteText}</p>
        ) : (
          <>
            <div className={`rowHeader ${hasThirdColumn ? "rowHeader--3col" : ""}`}>
              <span className="rowHeaderLabel">{columns[0]}</span>
              <span className="rowHeaderLabel">{columns[1]}</span>
              {hasThirdColumn && (
                <span className="rowHeaderLabel">{columns[2]}</span>
              )}
            </div>

            <div className="rowList">
              {emptyText ? (
                <p className="emptyState">{emptyText}</p>
              ) : (
                rows.map((row, index) => (
                  <div className={`row ${hasThirdColumn ? "row--3col" : ""}`} key={index}>
                    <span className="rowLabel">{row.label}</span>
                    <span className="rowValue">{row.value}</span>
                    {hasThirdColumn && row.value2 !== undefined && (
                      <span className="rowValue">{row.value2}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ))}
    </div>
  );
}

export default React.memo(DashboardCard);