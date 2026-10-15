import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { FaTimes, FaWhatsapp, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import CommonSelect from "./CommonSelect";
import { getAllEventsApi } from "../services/eventService";
import { getAllTicketTypesApi } from "../services/ticketTypeService";
import { sendContactPass } from "../redux/contact/contactThunk";
import { showError } from "../utilits/toast";
import "../assets/CSS/SendPassModal.css";

// Passes per contact: a Couple gets 2 guests on one pass, Single gets 1.
const guestsFor = (contact) => (contact.relationship === "Couple" ? 2 : 1);

/**
 * SendPassModal
 * Picks the event + ticket, then sends the WhatsApp invitation pass to every
 * contact in `contacts` (one contact from a row icon, or many from the
 * checkbox selection). Shows a per-contact result afterwards.
 */
export default function SendPassModal({ contacts = [], onClose, onDone }) {
  const dispatch = useDispatch();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [eventId, setEventId] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");

  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(null);

  // Upcoming / active events only.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getAllEventsApi({ page: 1, limit: 200 });
        const now = Date.now();
        const list = (res?.data || [])
          .filter(
            (event) =>
              event.isActive !== false &&
              (!event.endDateTime || new Date(event.endDateTime).getTime() >= now)
          )
          .sort(
            (a, b) =>
              new Date(a.startDateTime || 0) - new Date(b.startDateTime || 0)
          );

        if (cancelled) return;
        setEvents(list);
        if (list.length === 1) setEventId(list[0]._id);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tickets of the chosen event.
  useEffect(() => {
    setTicketTypeId("");
    setTicketTypes([]);
    if (!eventId) return undefined;

    let cancelled = false;
    setTicketsLoading(true);

    (async () => {
      try {
        const res = await getAllTicketTypesApi(eventId, { page: 1, limit: 100 });
        if (cancelled) return;
        // The ticket-type API returns the list under `ticketTypes`.
        const list = res?.ticketTypes || res?.data || [];
        setTicketTypes(list);
        if (list.length === 1) setTicketTypeId(list[0]._id);
      } catch {
        if (!cancelled) setTicketTypes([]);
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const totalGuests = useMemo(
    () => contacts.reduce((sum, contact) => sum + guestsFor(contact), 0),
    [contacts]
  );

  const selectedTicket = ticketTypes.find((t) => t._id === ticketTypeId);
  const notEnoughStock =
    selectedTicket &&
    typeof selectedTicket.availableCount === "number" &&
    selectedTicket.availableCount < totalGuests;

  const handleSend = async () => {
    if (!eventId || !ticketTypeId || sending) return;

    setSending(true);
    try {
      const res = await dispatch(
        sendContactPass({
          ids: contacts.map((contact) => contact._id),
          eventId,
          ticketTypeId,
        })
      ).unwrap();

      setReport(res.data);
      onDone?.(res);
    } catch (err) {
      showError(err || "Failed to send pass");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sendPass__overlay" onMouseDown={sending ? undefined : onClose}>
      <div
        className="sendPass__container"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="sendPass__close"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="sendPass__head">
          <span className="sendPass__headIcon">
            <FaWhatsapp />
          </span>
          <div>
            <h3 className="sendPass__title">Send Pass on WhatsApp</h3>
            <p className="sendPass__sub">
              {contacts.length} contact{contacts.length === 1 ? "" : "s"} &middot;{" "}
              {totalGuests} guest{totalGuests === 1 ? "" : "s"} in total
            </p>
          </div>
        </div>

        {!report && (
          <>
            <div className="sendPass__chips">
              {contacts.slice(0, 6).map((contact) => (
                <span key={contact._id} className="sendPass__chip">
                  {contact.fullName}
                  {guestsFor(contact) === 2 ? " (+1)" : ""}
                </span>
              ))}
              {contacts.length > 6 && (
                <span className="sendPass__chip sendPass__chipMore">
                  +{contacts.length - 6} more
                </span>
              )}
            </div>

            <label className="sendPass__label">Event</label>
            <CommonSelect
              className="sendPass__select"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder={eventsLoading ? "Loading events..." : "Select event"}
              loading={eventsLoading}
              options={events.map((event) => ({
                value: event._id,
                label: event.title,
              }))}
            />

            <label className="sendPass__label">Ticket</label>
            <CommonSelect
              className="sendPass__select"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              placeholder={
                !eventId
                  ? "Select an event first"
                  : ticketsLoading
                  ? "Loading tickets..."
                  : "Select ticket"
              }
              disabled={!eventId}
              loading={ticketsLoading}
              options={ticketTypes.map((ticket) => ({
                value: ticket._id,
                label: `${ticket.ticketName} (${ticket.availableCount ?? 0} left)`,
                disabled: (ticket.availableCount ?? 0) <= 0,
              }))}
            />

            {notEnoughStock && (
              <p className="sendPass__warn">
                Only {selectedTicket.availableCount} ticket(s) left, but{" "}
                {totalGuests} are needed. Some passes may fail.
              </p>
            )}

            <p className="sendPass__hint">
              Single contact = 1 guest, Couple = 2 guests. One pass is sent to
              each contact&apos;s WhatsApp number.
            </p>

            <div className="sendPass__actions">
              <button
                type="button"
                className="sendPass__btn sendPass__btnGhost"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sendPass__btn sendPass__btnPrimary"
                onClick={handleSend}
                disabled={!eventId || !ticketTypeId || sending}
              >
                <FaWhatsapp />
                {sending ? "Sending..." : `Send to ${contacts.length}`}
              </button>
            </div>
          </>
        )}

        {report && (
          <>
            <div className="sendPass__summary">
              <span className="sendPass__sumOk">{report.sent} sent</span>
              {report.failed > 0 && (
                <span className="sendPass__sumFail">{report.failed} failed</span>
              )}
            </div>

            <ul className="sendPass__results">
              {report.results.map((row) => (
                <li key={row.id} className="sendPass__resultRow">
                  {row.status === "sent" ? (
                    <FaCheckCircle className="sendPass__okIcon" />
                  ) : (
                    <FaTimesCircle className="sendPass__failIcon" />
                  )}
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.message}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="sendPass__actions">
              <button
                type="button"
                className="sendPass__btn sendPass__btnPrimary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
