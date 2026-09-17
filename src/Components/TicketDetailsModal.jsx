import { FaTimes, FaUser } from "react-icons/fa";
import "../assets/CSS/TicketDetailsModal.css";

// Human-readable status color mapping — keeps the badge visually
// meaningful without hardcoding colors inline all over the JSX.
const STATUS_CLASS = {
  Active: "ticketDetailsStatus--active",
  Used: "ticketDetailsStatus--used",
  Cancelled: "ticketDetailsStatus--cancelled",
  Expired: "ticketDetailsStatus--expired",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TicketDetailsModal({ ticket, onClose }) {
  if (!ticket) return null;

  const attendee = ticket.attendee || {};
  const statusClass = STATUS_CLASS[ticket.status] || "ticketDetailsStatus--active";

  return (
    <div className="ticketDetailsOverlay" onClick={onClose}>
      <div
        className="ticketDetailsContainer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ticketDetailsHeader">
          <h2 className="ticketDetailsTitle">Ticket Details</h2>
          <button
            type="button"
            className="ticketDetailsCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="ticketDetailsProfileSection">
          <div className="ticketDetailsPhotoCircle">
            {attendee.profileImage ? (
              <img
                src={attendee.profileImage}
                alt={attendee.name || "Attendee"}
                className="ticketDetailsProfileImage"
              />
            ) : (
              <FaUser className="ticketDetailsAvatarIcon" />
            )}
          </div>
          <div className="ticketDetailsProfileInfo">
            <span className="ticketDetailsProfileName">
              {attendee.name || "-"}
            </span>
            <span className={`ticketDetailsStatusBadge ${statusClass}`}>
              {ticket.status || "Active"}
            </span>
          </div>
        </div>

        <div className="ticketDetailsGrid">
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Ticket Number</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">{ticket.ticketNumber || "-"}</span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Booking Number</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">{ticket.bookingNumber || "-"}</span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Mobile No.</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">{attendee.mobileNumber || "-"}</span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Email</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">{attendee.email || "-"}</span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Registered At</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">
              {formatDateTime(attendee.registeredAt)}
            </span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Pass Date</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">{formatDate(ticket.passDate)}</span>
          </div>
          <div className="ticketDetailsRow">
            <span className="ticketDetailsLabel">Scanned At</span>
            <span className="ticketDetailsColon">:</span>
            <span className="ticketDetailsValue">
              {formatDateTime(ticket.scannedAt)}
            </span>
          </div>
        </div>

        <div className="ticketDetailsQrSection">
          <span className="ticketDetailsLabel">QR Code</span>
          {ticket.qrImage ? (
            <img
              src={ticket.qrImage}
              alt={ticket.ticketNumber}
              className="ticketDetailsQrImage"
            />
          ) : (
            <div className="ticketDetailsQrPlaceholder">No QR Code</div>
          )}
        </div>

        <div className="ticketDetailsFooter">
          <button
            type="button"
            className="ticketDetailsCloseButton"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}