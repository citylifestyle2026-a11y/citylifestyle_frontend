import DOMPurify from "dompurify";
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaPrint } from "react-icons/fa";

import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import "../assets/CSS/RunTicket.css";

// Ticket of a Let's Run registration (/ticket?qr=<Invitation ID>).
// Same theme as the admin panel. NO payment / price line: only the ticket and
// the number of tickets. The Terms & Conditions are the ones written on the
// Event (Event -> Terms & Conditions), so they show up as soon as the event has
// them.
const IST = "Asia/Kolkata";

const dayLabel = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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
  const dateText = dayLabel(event.startDateTime) || event.date || "";
  const where = [event.venueName, event.address].filter(Boolean).join(", ");
  const purchased = purchasedLabel(invite.purchasedAt);
  const terms = String(event.termsConditions || "").trim();

  return (
    <div className="runTicket">
      <header className="runTicket__hero">
        <img className="runTicket__logo" src={logo} alt="City Lifestyle" />
        <p className="runTicket__kicker">Entry Ticket</p>
        <h1 className="runTicket__title">{event.title}</h1>
      </header>

      <main className="runTicket__ticket">
        <div className="runTicket__top">
          <p className="runTicket__label">Registered for</p>
          <p className="runTicket__guest">{invite.guestName}</p>

          <div className="runTicket__qrWrap">
            <img
              className={`runTicket__qr${used ? " runTicket__qr--off" : ""}`}
              src={invite.qrImage}
              alt={`QR code for ${invite.invitationId}`}
            />
          </div>

          <p className="runTicket__order">ORDER ID - {invite.invitationId}</p>
          {purchased && <p className="runTicket__sub">Registered on {purchased}</p>}
          {used && <p className="runTicket__used">This ticket has already been used</p>}
        </div>

        <div className="runTicket__tear" aria-hidden="true" />

        <div className="runTicket__details">
          {dateText && (
            <div className="runTicket__item">
              <FaCalendarAlt />
              <div>
                <span>Date</span>
                <b>{dateText}</b>
              </div>
            </div>
          )}
          {timeText && (
            <div className="runTicket__item">
              <FaClock />
              <div>
                <span>Time</span>
                <b>{timeText}</b>
              </div>
            </div>
          )}
          {where && (
            <div className="runTicket__item">
              <FaMapMarkerAlt />
              <div>
                <span>Venue</span>
                <b>{where}</b>
              </div>
            </div>
          )}

          {/* No payment method / price - only the ticket and how many. */}
          <div className="runTicket__row">
            <span>Ticket</span>
            <b>x1</b>
          </div>
        </div>
      </main>

      <button type="button" className="runTicket__print" onClick={() => window.print()}>
        <FaPrint /> Save / Print
      </button>

      {terms && (
        <section className="runTicket__terms">
          <h2>Terms and Conditions</h2>
          <div
            className="runTicket__termsBody"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(terms) }}
          />
        </section>
      )}
    </div>
  );
}
