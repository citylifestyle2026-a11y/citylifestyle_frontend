import { useState } from "react";
import { useDispatch } from "react-redux";
import "../assets/CSS/BookingResendModal.css";
import { resendTicket } from "../redux/bookingTicket/bookingTicketThunk";
import { showError, showSuccess } from "../utilits/toast";

export default function BookingResendModal({
  ticketId,
  mobileNumber,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResend = async () => {
    if (!ticketId) {
      showError("Ticket not found.");
      return;
    }

    setIsSubmitting(true);

    const result = await dispatch(resendTicket(ticketId));

    setIsSubmitting(false);

    if (resendTicket.fulfilled.match(result)) {
      showSuccess(result.payload?.message || "Ticket sent successfully");
      onClose();
      onSuccess?.();
    } else {
      showError(result.payload || "Failed to resend ticket.");
    }
  };

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

        <p className="bookingResendMessage">
          You want to resend the message to this mobile number:
        </p>
        <span className="bookingResendMobile">{mobileNumber}</span>

        <button
          type="button"
          className="bookingResendOkayBtn"
          onClick={handleResend}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Okay"}
        </button>
      </div>
    </div>
  );
}
