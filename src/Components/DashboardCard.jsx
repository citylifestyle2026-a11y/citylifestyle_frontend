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
  // Optional — plain-language explanation of what this card counts.
  // When provided, a small "i" (info) button is shown in the card's top
  // right corner. Hovering that button (or tapping / keyboard-focusing it
  // on touch screens) shows this text in a tooltip, so anyone reading
  // the dashboard knows what the number means.
  infoText,
}) {
  // Optional 3rd column (e.g. "Amount"). Only Pass Booking cards pass a
  // 3-item columns array / rows with `value2` — every other card keeps
  // its existing 2-column layout untouched.
  const hasThirdColumn = Boolean(columns[2]);

  return (
    <div className="card">
      {infoText && (
        <div className="cardInfo">
          <button
            type="button"
            className="cardInfoBtn"
            aria-label={`Info: ${amountLabel || title}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <circle cx="12" cy="7.2" r="0.6" fill="currentColor" />
            </svg>
          </button>
          <div className="cardInfoTooltip" role="tooltip">
            <strong className="cardInfoTooltipTitle">{amountLabel || title}</strong>
            <span>{infoText}</span>
          </div>
        </div>
      )}

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