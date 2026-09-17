import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../assets/CSS/ResendTicketModal.css";
import { getBookingById } from "../redux/booking/bookingThunk";
import { resendTicket } from "../redux/bookingTicket/bookingTicketThunk";
import { showError, showSuccess } from "../utilits/toast";
import CommonSelect from "./CommonSelect";

// This modal is opened from the Booking list page (Booking.jsx), where
// only the booking's own _id is available on each row — no individual
// BookingTicket _id. It reuses the existing getBookingById thunk (the
// same one ViewBooking.jsx already uses) to fetch that booking's
// `tickets` array, then either resends the single ticket directly or
// lets the admin pick one via the existing CommonSelect component when
// the booking has more than one ticket. No new endpoint, no new ticket,
// no new booking is ever created here — this only reads existing data
// and calls the existing resend API with the actual selected ticket's
// _id.
export default function ResendTicketModal({ bookingId, onClose, onSuccess }) {
  const dispatch = useDispatch();

  const { booking, detailsLoading, detailsError } = useSelector(
    (state) => state.booking
  );

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bookingId) {
      dispatch(getBookingById(bookingId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // `state.booking.booking` is shared with ViewBooking.jsx's own use of
  // getBookingById; only trust it here once it actually matches the
  // bookingId this modal was opened for, so a stale/previous booking
  // already in that slot is never shown while the fresh fetch is
  // in-flight.
  const isCurrentBooking = booking && booking._id === bookingId;
  const tickets = isCurrentBooking ? booking.tickets || [] : [];
  const mobileNumber = isCurrentBooking ? booking.mobileNumber : "";

  const ticketOptions = useMemo(
    () =>
      tickets.map((ticket) => ({
        value: ticket._id,
        label: ticket.ticketNumber,
      })),
    [tickets]
  );

  // Single ticket: resolved automatically, no picker needed.
  // Multiple tickets: only resolved once the admin picks one.
  const ticketToResendId =
    tickets.length === 1 ? tickets[0]._id : selectedTicketId;

  const handleResend = async () => {
    if (!ticketToResendId) {
      showError("Please select a ticket to resend.");
      return;
    }

    setIsSubmitting(true);

    const result = await dispatch(resendTicket(ticketToResendId));

    setIsSubmitting(false);

    if (resendTicket.fulfilled.match(result)) {
      showSuccess(result.payload?.message || "Ticket sent successfully");
      onClose();
      onSuccess?.();
    } else {
      showError(result.payload || "Failed to resend ticket.");
    }
  };

  const isLoadingTickets = detailsLoading && !isCurrentBooking;

  return (
    <div className="bookingResendOverlay" onClick={onClose}>
      <div className="bookingResendContainer" onClick={(e) => e.stopPropagation()}>
        <div className="bookingResendIconWrap">
          <svg
            className="bookingResendIcon"
            viewBox="0 0 70 70"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="35"
              cy="35"
              r="31"
              fill="none"
              stroke="#f2c744"
              strokeWidth="4"
            />
            <rect x="32.5" y="18" width="5" height="24" rx="2.5" fill="#f2c744" />
            <circle cx="35" cy="50" r="3" fill="#f2c744" />
          </svg>
        </div>

        <h2 className="bookingResendTitle">Are you sure!</h2>

        {isLoadingTickets ? (
          <p className="bookingResendMessage">Loading ticket details...</p>
        ) : detailsError ? (
          <p className="bookingResendMessage">{detailsError}</p>
        ) : (
          <>
            <p className="bookingResendMessage">
              You want to resend the message to this mobile number:{" "}
              <span className="bookingResendMobile">{mobileNumber}</span>
            </p>

            {tickets.length > 1 && (
              <div style={{ margin: "12px 0", textAlign: "left" }}>
                <label
                  className="bookingResendMessage"
                  style={{ display: "block", marginBottom: 6 }}
                >
                  This booking has multiple tickets — select which one to
                  resend:
                </label>
                <CommonSelect
                  className="bookingResendSelect"
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  placeholder="Select a ticket"
                  options={ticketOptions}
                />
              </div>
            )}
          </>
        )}

        <button
          type="button"
          className="bookingResendOkayBtn"
          onClick={handleResend}
          disabled={isSubmitting || isLoadingTickets || !ticketToResendId}
        >
          {isSubmitting ? "Sending..." : "Okay"}
        </button>
      </div>
    </div>
  );
}