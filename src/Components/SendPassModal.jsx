import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { FaTimes, FaWhatsapp, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import CommonSelect from "./CommonSelect";
import { getAllEventsApi } from "../services/eventService";
import { getAllTicketTypesApi } from "../services/ticketTypeService";
import { sendContactPass } from "../redux/contact/contactThunk";
import { showError } from "../utilits/toast";
import "../assets/CSS/SendPassModal.css";

// Default guests per pass = the guest's persons: Single 1, Couple 2, Manual =
// the typed number. The admin can tick "Change guests" on a row to change it
// (1 - MAX_GUESTS). For a guest from a form link, asking for more than the
// link holds is refused by the server: edit the form link first.
const defaultGuestsFor = (contact) => {
  const saved = Number(contact.persons);
  if (Number.isInteger(saved) && saved >= 1) return saved;
  return (contact.entryType || contact.relationship) === "Couple" ? 2 : 1;
};
const MAX_GUESTS = 1000;

/**
 * SendPassModal
 * Picks the event + ticket, then sends the WhatsApp invitation pass to every
 * contact in `contacts` (one contact from a row icon, or many from the
 * checkbox selection). Shows a per-contact result afterwards.
 */
export default function SendPassModal({
  contacts = [],
  defaultEventId = "",
  // Optional: async (payload) => response. Lets other lists (Crew) reuse
  // this dialog with their own API; Guest List keeps its default.
  sendPass,
  // Most guests one pass can take (Guest List: only the form link / ticket
  // stock limits it; Crew passes stay at 10).
  maxGuests = MAX_GUESTS,
  onClose,
  onDone,
}) {
  const dispatch = useDispatch();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Pre-selected when every contact belongs to the same edition.
  const [eventId, setEventId] = useState(defaultEventId || "");
  const [ticketTypeId, setTicketTypeId] = useState("");

  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(null);

  // { [contactId]: guests } - starts from Single = 1 / Couple = 2.
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(contacts.map((c) => [c._id, defaultGuestsFor(c)]))
  );

  // One "Change guests" box under Ticket: plus / minus show only when ticked.
  const [changeGuests, setChangeGuests] = useState(false);

  const guestsFor = (contact) => quantities[contact._id] ?? defaultGuestsFor(contact);

  const toggleChangeGuests = (checked) => {
    setChangeGuests(checked);
    // Un-ticking puts every guest count back to the default.
    if (!checked) {
      setQuantities(Object.fromEntries(contacts.map((c) => [c._id, defaultGuestsFor(c)])));
    }
  };

  const changeGuestsBy = (contact, delta) =>
    setQuantities((prev) => {
      const current = prev[contact._id] ?? defaultGuestsFor(contact);
      const next = Math.min(maxGuests, Math.max(1, current + delta));
      return { ...prev, [contact._id]: next };
    });

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
    () =>
      contacts.reduce(
        (sum, contact) => sum + (quantities[contact._id] ?? defaultGuestsFor(contact)),
        0
      ),
    [contacts, quantities]
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
      const payload = {
        ids: contacts.map((contact) => contact._id),
        eventId,
        ticketTypeId,
        quantities: Object.fromEntries(
          contacts.map((contact) => [contact._id, guestsFor(contact)])
        ),
      };
      const res = sendPass
        ? await sendPass(payload)
        : await dispatch(sendContactPass(payload)).unwrap();

      setReport(res.data);
      onDone?.(res);
    } catch (err) {
      showError(typeof err === "string" ? err : err?.response?.data?.message || err?.message || "Failed to send pass");
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
            <label className="sendPass__label">Guests per pass</label>
            <ul className="sendPass__guestList">
              {contacts.map((contact) => (
                <li key={contact._id} className="sendPass__guestRow">
                  <span className="sendPass__guestName" title={contact.fullName}>
                    {contact.fullName}
                    <small>
                      {contact.entryType === "Manual"
                        ? `Manual (${defaultGuestsFor(contact)})`
                        : contact.entryType || contact.relationship}
                    </small>
                  </span>

                  <b className="sendPass__guestCount">
                    {guestsFor(contact)} guest{guestsFor(contact) === 1 ? "" : "s"}
                  </b>
                </li>
              ))}
            </ul>

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

            <label className="sendPass__changeCheck sendPass__changeCheck--main">
              <input
                type="checkbox"
                checked={changeGuests}
                disabled={sending}
                onChange={(e) => toggleChangeGuests(e.target.checked)}
              />
              Change guests
            </label>

            {changeGuests && (
              <ul className="sendPass__guestList sendPass__guestList--edit">
                {contacts.map((contact) => (
                  <li key={contact._id} className="sendPass__guestRow">
                    <span className="sendPass__guestName" title={contact.fullName}>
                      {contact.fullName}
                    </span>

                    <span className="sendPass__stepper">
                      <button
                        type="button"
                        aria-label={`Fewer guests for ${contact.fullName}`}
                        onClick={() => changeGuestsBy(contact, -1)}
                        disabled={sending || guestsFor(contact) <= 1}
                      >
                        &minus;
                      </button>
                      <b>{guestsFor(contact)}</b>
                      <button
                        type="button"
                        aria-label={`More guests for ${contact.fullName}`}
                        onClick={() => changeGuestsBy(contact, 1)}
                        disabled={sending || guestsFor(contact) >= maxGuests}
                      >
                        +
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {notEnoughStock && (
              <p className="sendPass__warn">
                Only {selectedTicket.availableCount} ticket(s) left, but{" "}
                {totalGuests} are needed. Some passes may fail.
              </p>
            )}

            <p className="sendPass__hint">
              Guests start at the guest&apos;s persons (Single 1, Couple 2, Manual = typed
              number). Tick &quot;Change guests&quot; to use plus / minus; a form link guest&apos;s link progress goes up or down with it. If a
              guest from a form link needs more than the link holds, first edit that form
              link and increase its quantity. One pass is sent to each contact&apos;s WhatsApp
              number.
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
