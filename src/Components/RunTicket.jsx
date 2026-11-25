import DOMPurify from "dompurify";

import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import "../assets/CSS/RunTicket.css";

// Ticket of a Let's Run registration (/ticket?qr=<Invitation ID>).
// Same layout as the reference ticket (event, date | time, venue, QR, order id,
// "Ticket x1") but WITHOUT any payment / price line - the run is free
// registration. The Terms & Conditions are the ones written on the Event
// (Event -> Terms & Conditions), so they show up as soon as the event has them.
const IST = "Asia/Kolkata";

const dayLabel = (value) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("weekday")} ${get("month")} ${get("day")}`;
};

const purchasedLabel = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/\u202f/g, " ");
  return `${date} | ${time}`;
};

export default function RunTicket({ invite }) {
  const { event } = invite;
  const used = invite.isUsed;
  const timeText = [event.time, event.endTime].filter(Boolean).join(" - ");
  const when = [dayLabel(event.startDateTime), timeText].filter(Boolean).join(" | ");
  const where = [event.venueName, event.address].filter(Boolean).join(" | ");
  const purchased = purchasedLabel(invite.purchasedAt);
  const terms = String(event.termsConditions || "").trim();

  return (
    <div className="runTicket">
      <div className="runTicket__sheet">
        <img className="runTicket__logo" src={logo} alt="City Lifestyle" />

        <div className="runTicket__head">
          <h1>{event.title}</h1>
          {when && <p>{when}</p>}
          {where && <p>{where}</p>}
        </div>

        <div className="runTicket__qrCard">
          <img
            className={`runTicket__qr${used ? " runTicket__qr--off" : ""}`}
            src={invite.qrImage}
            alt={`QR code for ${invite.invitationId}`}
          />
          <p className="runTicket__order">ORDER ID - {invite.invitationId}</p>
          {purchased && <p className="runTicket__sub">Registered on {purchased}</p>}
          <p className="runTicket__guest">{invite.guestName}</p>
          {used && <p className="runTicket__used">Ticket already used</p>}
        </div>

        {/* No payment method / price: only the ticket and the number of tickets. */}
        <div className="runTicket__row">
          <span>Ticket</span>
          <span>x1</span>
        </div>

        <button type="button" className="runTicket__print" onClick={() => window.print()}>
          Save / Print
        </button>

        {terms && (
          <div className="runTicket__terms">
            <h2>Terms and Conditions:</h2>
            <div
              className="runTicket__termsBody"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(terms) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
