import React, { useState, useEffect } from "react";
import "../assets/CSS/ViewBooking.css";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import BookingUserModal from "../Components/BookingUserModal";
import BookingResendModal from "../Components/BookingResendModal";
import TicketDetailsModal from "../Components/TicketDetailsModal";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getBookingById } from "../redux/booking/bookingThunk";
import { showError } from "../utilits/toast";
function AvatarPlaceholder() {
  return (
    <svg
      className="bookingView-avatarIcon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4" fill="#ffffff" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#ffffff" />
    </svg>
  );
}
function QrPlaceholder() {
  return (
    <svg
      className="bookingView-qrIcon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" fill="#c4c6d2" />
      <rect x="14" y="3" width="7" height="7" rx="1" fill="#c4c6d2" />
      <rect x="3" y="14" width="7" height="7" rx="1" fill="#c4c6d2" />
      <rect x="14" y="14" width="3" height="3" fill="#c4c6d2" />
      <rect x="18" y="14" width="3" height="3" fill="#c4c6d2" />
      <rect x="14" y="18" width="3" height="3" fill="#c4c6d2" />
      <rect x="18" y="18" width="3" height="3" fill="#c4c6d2" />
    </svg>
  );
}
const ViewBooking = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { booking, detailsLoading, detailsError } = useSelector((state) => state.booking);
  const { registerUser } = useSelector((state)=>state.bookingTicket)
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [isBookingUserModalOpen, setIsBookingUserModalOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [viewDetailsTicket, setViewDetailsTicket] = useState(null);
  // Was position:absolute inside the table cell, which the members card's
  // overflow:hidden then clipped/mis-rendered for rows near the table's
  // edges (see .bookingView-membersCard). Computing a fixed, viewport-
  // relative position from the trigger button's own rect — the same
  // approach already used for the Booking list's action menu — makes the
  // menu render on top of everything, in the right place, for every row.
  //
  // The top/bottom values are also clamped to the viewport (not just
  // flipped up/down) so the menu can never extend past the bottom of the
  // screen and require scrolling the page to see the rest of it — it
  // always renders fully on-screen no matter how close to the edge the
  // trigger button is.
  //
  // `event.currentTarget` is read here, synchronously, before any state
  // update — not inside the setOpenMenuId updater callback. React can
  // (and in dev/StrictMode, does) invoke a functional updater more than
  // once; by the second call the synthetic event has already been
  // released and `event.currentTarget` is null, which crashed here.
  const toggleMenu = (rowId, event) => {
    if (openMenuId === rowId) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedMenuHeight = 160; // ~3 menu items + padding
    const viewportMargin = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward =
      spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    let top;
    let bottom;

    if (openUpward) {
      bottom = Math.max(window.innerHeight - rect.top + 6, viewportMargin);
    } else {
      top = Math.min(
        rect.bottom + 6,
        window.innerHeight - estimatedMenuHeight - viewportMargin
      );
      top = Math.max(top, viewportMargin);
    }

    setMenuPos({
      top,
      bottom,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(rowId);
  };

  // Stale coordinates on scroll/resize would leave the menu floating in
  // the wrong spot, so just close it instead of trying to track it.
  useEffect(() => {
    if (openMenuId === null) return undefined;

    const closeMenu = () => {
      setOpenMenuId(null);
      setMenuPos(null);
    };

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (id) {
      dispatch(getBookingById(id));
    }
  }, [dispatch, id]);

  if (detailsLoading) {
    return (
      <div className="bookingPage-wrapper">
        <Sidebar />
        <div className="bookingPageMainArea">
          <Header title="View Booking" />
          <div className="bookingView-wrapper">
            <div className="bookingView-header">
              <h1 className="bookingView-title">View Booking</h1>
              <div className="bookingView-breadcrumb">
                <span>Dashboard</span>
                <span className="bookingView-breadcrumbSep">-</span>
                <span className="bookingView-breadcrumbActive">View Booking</span>
              </div>
            </div>

            <Link to={'/booking'} className="bookingView-backLink">
              <span className="bookingView-backArrow">&#8592;</span> Back Page
            </Link>

            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Human-readable error message — never render the raw error value
  // directly in JSX since it could be an object depending on how the
  // API/thunk fails.
  const detailsErrorMessage =
    typeof detailsError === "string"
      ? detailsError
      : detailsError
        ? "Failed to load booking details. Please try again."
        : "";

  if (!booking || detailsErrorMessage) {
    return (
      <div className="bookingPage-wrapper">
        <Sidebar />
        <div className="bookingPageMainArea">
          <Header title="View Booking" />
          <div className="bookingView-wrapper">
            <div className="bookingView-header">
              <h1 className="bookingView-title">View Booking</h1>
              <div className="bookingView-breadcrumb">
                <span>Dashboard</span>
                <span className="bookingView-breadcrumbSep">-</span>
                <span className="bookingView-breadcrumbActive">View Booking</span>
              </div>
            </div>

            <Link to={'/booking'} className="bookingView-backLink">
              <span className="bookingView-backArrow">&#8592;</span> Back Page
            </Link>

            {detailsErrorMessage ? (
              <>
                <p className="bookingView-stateError">{detailsErrorMessage}</p>
                <button
                  type="button"
                  className="bookingView-stateRetryBtn"
                  onClick={() => id && dispatch(getBookingById(id))}
                >
                  Retry
                </button>
              </>
            ) : (
              <p>No Booking Found</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const unitPrice = booking.ticketTypeId?.amount ?? 0;
  const totalPay = booking.amount ?? 0;
  const discountNote =
    booking.discount && booking.discount > 0
      ? `Discount: Rs. ${booking.discount}`
      : "No Discount";

  const tickets = booking.tickets || [];

  return (
    <div className="bookingPage-wrapper">
      <Sidebar />
      <div className="bookingPageMainArea">
        <Header title="View Booking" />
        <div className="bookingView-wrapper">
          <div className="bookingView-header">
            <h1 className="bookingView-title">View Booking</h1>
            <div className="bookingView-breadcrumb">
              <span>Dashboard</span>
              <span className="bookingView-breadcrumbSep">-</span>
              <span className="bookingView-breadcrumbActive">View Booking</span>
            </div>
          </div>

          <Link to={'/booking'} className="bookingView-backLink">
            <span className="bookingView-backArrow">&#8592;</span> Back Page
          </Link>

          <div className="bookingView-content">
            <div className="bookingView-detailsCard">
              <h2 className="bookingView-detailsTitle">Details</h2>

              <div className="bookingView-detailsList">
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Name</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.name || "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Mobile No.</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.mobileNumber || "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Email</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.email || "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Event Name</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.eventId?.title || "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Ticket Type</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.ticketTypeId?.ticketName || "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">QTY</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.quantity ?? "-"}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Discount</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">
                    {booking.discount ? `Rs. ${booking.discount}` : "-"}
                  </span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Price</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{`Rs. ${unitPrice}`}</span>
                </div>
                <div className="bookingView-detailsRow">
                  <span className="bookingView-detailsLabel">Remark</span>
                  <span className="bookingView-detailsColon">:</span>
                  <span className="bookingView-detailsValue">{booking.remark || "-"}</span>
                </div>
              </div>

              <div className="bookingView-totalPayRow">
                <div className="bookingView-totalPayLeft">
                  <span className="bookingView-totalPayLabel">Total Pay</span>
                  <span className="bookingView-totalPaySub">
                    ({booking.quantity ?? 0} x Rs.{unitPrice})
                  </span>
                  <span className="bookingView-discountNote">
                    {discountNote}
                  </span>
                </div>
                <span className="bookingView-totalPayValue">{`Rs. ${totalPay}`}</span>
              </div>
            </div>

            <div className="bookingView-membersCard">
              {openMenuId !== null && (
                <div
                  onClick={() => {
                    setOpenMenuId(null);
                    setMenuPos(null);
                  }}
                  style={{ position: "fixed", inset: 0, zIndex: 15 }}
                />
              )}

              <div className="bookingView-tableWrap">
                <table className="bookingView-table">
                  <thead>
                    <tr>
                      <th className="bookingView-hashCol">#</th>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Mobile No.</th>
                      <th>Email Id</th>
                      <th>QR Code</th>
                      <th className="bookingView-actionCol">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, index) => (
                      <tr key={ticket._id}>
                        <td>{index + 1}</td>
                        <td>
                          <span className="bookingView-avatar">
                            {ticket.attendee?.profileImage ? (
                              <img
                                src={ticket.attendee.profileImage}
                                alt={ticket.attendee.name}
                                className="bookingView-avatarImage"
                              />
                            ) : (
                              <AvatarPlaceholder />
                            )}
                          </span>
                        </td>

                        <td>{ticket.attendee?.name || "-"}</td>

                        <td>{ticket.attendee?.mobileNumber || "-"}</td>

                        <td>{ticket.attendee?.email || "-"}</td>
                        <td>
                          {ticket.qrImage ? (
                            <img
                              src={ticket.qrImage}
                              alt={ticket.ticketNumber}
                              className="bookingView-qrIcon"
                            />
                          ) : (
                            <QrPlaceholder />
                          )}
                        </td>
                        <td className="bookingView-actionCol">
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <button
                              type="button"
                              className="bookingView-actionMenuBtn"
                              aria-label="Row actions"
                              onClick={(event) => toggleMenu(ticket._id, event)}
                            >
                              &#8226;&#8226;&#8226;
                            </button>

                            {openMenuId === ticket._id && menuPos && (
                              <div
                                style={{
                                  position: "fixed",
                                  top: menuPos.top,
                                  bottom: menuPos.bottom,
                                  right: menuPos.right,
                                  backgroundColor: "#ffffff",
                                  borderRadius: "10px",
                                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                                  padding: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "2px",
                                  minWidth: "150px",
                                  maxHeight: "calc(100vh - 24px)",
                                  overflowY: "auto",
                                  zIndex: 20,
                                }}
                              >
                                <button
                                  type="button"
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    fontSize: "13.5px",
                                    color: "#3a3d4d",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                  }}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setMenuPos(null);
                                    // Opens THIS exact row's own generated
                                    // ticket PDF (ticketPdfUrl) — the same
                                    // PDF already delivered via the
                                    // WhatsApp "Download Ticket" button —
                                    // never any other ticket's PDF.
                                    if (ticket.ticketPdfUrl) {
                                      window.open(
                                        ticket.ticketPdfUrl,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    } else {
                                      showError(
                                        "Ticket PDF is not available yet for this registration."
                                      );
                                    }
                                  }}
                                >
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    fontSize: "13.5px",
                                    color: "#3a3d4d",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                  }}
                                  onClick={() => {
                                    setSelectedTicketId(ticket._id);
                                    setIsBookingUserModalOpen(true);
                                    setOpenMenuId(null);
                                    setMenuPos(null);
                                  }}
                                >
                                  Add Details
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    fontSize: "13.5px",
                                    color: "#3a3d4d",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                  }}
                                  onClick={() => {
                                    setResendTarget({
                                      ticketId: ticket._id,
                                      mobileNumber: booking.mobileNumber,
                                    });
                                    setOpenMenuId(null);
                                    setMenuPos(null);
                                  }}
                                >
                                  Resend Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewDetailsTicket && (
        <div
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setViewDetailsTicket(null);
            }
          }}
        >
          <TicketDetailsModal
            ticket={viewDetailsTicket}
            onClose={() => setViewDetailsTicket(null)}
          />
        </div>
      )}

      {isBookingUserModalOpen && (
        <div
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsBookingUserModalOpen(false);
            }
          }}
        >
          <BookingUserModal
            onSuccess={() => {
              dispatch(getBookingById(id));
            }}
            ticketId={selectedTicketId}
            onClose={() => setIsBookingUserModalOpen(false)} />
        </div>
      )}

      {resendTarget && (
        <div
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setResendTarget(null);
            }
          }}
        >
          <BookingResendModal
            ticketId={resendTarget.ticketId}
            mobileNumber={resendTarget.mobileNumber}
            onClose={() => setResendTarget(null)}
          />
        </div>
      )}
    </div>
  );
};

export default ViewBooking;