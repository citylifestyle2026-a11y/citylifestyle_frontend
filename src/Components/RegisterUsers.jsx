import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import "../assets/CSS/RegisterUsers.css";
import { getBookingById } from "../redux/booking/bookingThunk";
import { updateRegisterUser } from "../redux/bookingTicket/bookingTicketThunk";
import { showError, showSuccess } from "../utilits/toast";

// ================= LAYOUT PARITY WITH PublicRegisterUser.jsx =================
// This component intentionally mirrors PublicRegisterUser.jsx's structure —
// same hero, content wrapper, event/ticket-type summary card, slot-wrapped
// (max-width 420px) cards, responsive grid breakpoints, and disabled-state
// submit button — so Private and Public Registration share one visual
// design/layout. Only genuinely Private-specific pieces are kept: the
// "MEMBER N" label text (vs Public's "Registration N"), the registered
// ticket's QR thumbnail (staff-only — the public/attendee flow deliberately
// doesn't expose it), and this page's Redux-backed data source
// (getBookingById / updateRegisterUser) instead of the public token API.

function UploadPhotoPlaceholder() {
  return (
    <svg
      className="bookingRegister-avatarIcon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4" fill="#ffffff" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#ffffff" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      className="bookingRegister-editIcon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20l1-4 11-11 3 3-11 11-4 1z"
        fill="none"
        stroke="#3a3d4d"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RegisteredAvatarPlaceholder() {
  return (
    <svg
      className="bookingRegister-registeredAvatarIcon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4" fill="#ffffff" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#ffffff" />
    </svg>
  );
}

const emptyForm = {
  name: "",
  mobileNumber: "",
  email: "",
  profileImage: null,
  previewImage: "",
};

// Same validation rules used by BookingUserModal's single-ticket form, kept
// in sync here since each pending slot below submits through the same
// updateRegisterUser API.
//
// Mirrors PublicRegisterUser.jsx's getFieldErrors: returns a
// { fieldName: message } map (instead of a single string) so each error
// can be rendered directly below its own field, exactly like the Public
// Registration flow, rather than as a generic toast.
const getFieldErrors = (form) => {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Please enter name.";
  } else if (!/^[A-Za-z ]+$/.test(form.name)) {
    errors.name = "Name is invalid.";
  }

  if (!/^[6-9]\d{9}$/.test(form.mobileNumber)) {
    errors.mobileNumber = "Please enter valid mobile number.";
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter valid email.";
  }

  return errors;
};

// Maps a backend validation message to the field it's about, so it can be
// shown inline under that field (like Public Registration) instead of a
// generic toast. Backend responses here only carry a `message` string (see
// bookingTicketThunk.js), so the mapping is done by keyword — if the
// message doesn't clearly belong to one of these fields (e.g. "booking not
// found", "already registered", server errors), it falls back to the
// existing toast behavior below.
const mapBackendMessageToField = (message) => {
  if (!message) return null;
  if (/mobile/i.test(message)) return "mobileNumber";
  if (/email/i.test(message)) return "email";
  if (/\bname\b/i.test(message)) return "name";
  return null;
};

const RegisterUsers = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  // NOTE: the booking slice's failure field is `detailsError` (see
  // redux/booking/bookingSlice.js) — a plain `error` field doesn't exist
  // there, so reading it kept this always `undefined` and a real fetch
  // failure was silently falling through to the generic "No Booking Found"
  // text instead of showing the actual error.
  const { booking, detailsLoading, detailsError } = useSelector(
    (state) => state.booking
  );

  // Pending-form input state per ticket slot, keyed by ticket _id. Only
  // slots that are currently unregistered ever have an entry here.
  const [formStates, setFormStates] = useState({});
  // Field-level errors per ticket slot, keyed by ticket _id — mirrors
  // PublicRegisterUser.jsx's fieldErrorsByKey so each slot's errors render
  // directly below their own inputs instead of as a toast.
  const [fieldErrorsByKey, setFieldErrorsByKey] = useState({});
  // Optimistic per-ticket overrides applied the instant a registration
  // succeeds, so that slot flips to the registered card immediately
  // instead of waiting on the background refetch below.
  const [registeredOverrides, setRegisteredOverrides] = useState({});
  // Which ticket is currently submitting, so only that slot's Submit
  // button shows a loading state — other pending forms stay usable.
  const [submittingTicketId, setSubmittingTicketId] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(getBookingById(id));
    }
  }, [dispatch, id]);

  const getFormState = (ticketId) => formStates[ticketId] || emptyForm;
  const getFieldErrorsForTicket = (ticketId) =>
    fieldErrorsByKey[ticketId] || {};

  const updateFormField = (ticketId, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [ticketId]: { ...getFormState(ticketId), [field]: value },
    }));

    // Clear this field's visible error the instant it's edited, so a
    // corrected value doesn't keep showing a stale message (same as
    // PublicRegisterUser.jsx's updateField).
    setFieldErrorsByKey((prev) => {
      const current = prev[ticketId];
      if (!current || !current[field]) return prev;
      return { ...prev, [ticketId]: { ...current, [field]: undefined } };
    });
  };

  const handleImageChange = (ticketId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please select valid image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError("Image size should be less than 2MB.");
      return;
    }

    setFormStates((prev) => ({
      ...prev,
      [ticketId]: {
        ...getFormState(ticketId),
        profileImage: file,
        previewImage: URL.createObjectURL(file),
      },
    }));
  };

  const handleSubmit = async (ticketId) => {
    const form = getFormState(ticketId);
    const errors = getFieldErrors(form);

    // Client-side validation errors render directly below their own field
    // (like Public Registration) instead of a generic toast.
    if (Object.keys(errors).length > 0) {
      setFieldErrorsByKey((prev) => ({ ...prev, [ticketId]: errors }));
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("mobileNumber", form.mobileNumber.trim());
    payload.append("email", form.email.trim());
    if (form.profileImage) {
      payload.append("profileImage", form.profileImage);
    }

    setSubmittingTicketId(ticketId);
    const response = await dispatch(
      updateRegisterUser({ ticketId, formData: payload })
    );
    setSubmittingTicketId(null);

    if (updateRegisterUser.fulfilled.match(response)) {
      showSuccess(
        response.payload.message || "User registered successfully."
      );

      // Flip this slot straight to the registered card — no new box is
      // created, the same position just changes state.
      setRegisteredOverrides((prev) => ({
        ...prev,
        [ticketId]: response.payload.data,
      }));

      // This slot no longer needs its pending-form state.
      setFormStates((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setFieldErrorsByKey((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });

      // Resync the canonical booking/tickets list in the background so a
      // later refresh of this page reflects the server's own record.
      if (id) dispatch(getBookingById(id));
    } else {
      const message = response.payload || "Failed to register user.";
      const field = mapBackendMessageToField(message);

      if (field) {
        // Backend validation error for a specific field — show it inline
        // under that field instead of a generic toast.
        setFieldErrorsByKey((prev) => ({
          ...prev,
          [ticketId]: { ...getFieldErrorsForTicket(ticketId), [field]: message },
        }));
      } else {
        // Not tied to a specific field (e.g. booking/ticket not found,
        // already registered, server error) — same toast fallback as
        // before.
        showError(message);
      }
    }
  };

  const heroTitle = (
    <div className="bookingRegister-hero">
      <h1 className="bookingRegister-title">
        Ticket
        <br />
        Registration <span className="bookingRegister-wave">&#128075;</span>
      </h1>
    </div>
  );

  if (detailsLoading) {
    return (
      <div className="bookingRegister-page">
        {heroTitle}
        <div className="bookingRegister-content">
          <p className="bookingRegister-statusText">Loading...</p>
        </div>
      </div>
    );
  }

  if (!booking || detailsError) {
    return (
      <div className="bookingRegister-page">
        {heroTitle}
        <div className="bookingRegister-content">
          <div className="bookingRegister-card bookingRegister-errorCard">
            <span className="bookingRegister-errorIcon">&#33;</span>
            <p className="bookingRegister-errorTitle">Booking not found</p>
            <p className="bookingRegister-errorText">
              {detailsError || "No Booking Found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const quantity = Math.max(0, Number(booking.quantity) || 0);
  const bookingTickets = booking.tickets || [];
  // One slot per booking quantity. The ticket doc already sitting in that
  // slot (if any) decides whether it renders as a registered card or a
  // pending registration form — nothing here invents extra slots or drops
  // existing registered ones.
  const slots = Array.from({ length: quantity }, (_, i) => bookingTickets[i] || null);
  const allRegistered =
    quantity > 0 && slots.every((slotTicket) => {
      if (!slotTicket) return false;
      const ticket = registeredOverrides[slotTicket._id] || slotTicket;
      return ticket.isRegistered;
    });

  return (
    <div className="bookingRegister-page">
      {heroTitle}

      <div className="bookingRegister-content">
        {/* Event / Ticket Type summary — same card as
            PublicRegisterUser.jsx's publicRegister-summary. The booking
            record already carries these populated (see backend
            getBookingById), so no extra fetch is needed here. */}
        {(booking.eventId?.title || booking.ticketTypeId?.ticketName) && (
          <div className="bookingRegister-summary">
            {booking.eventId?.title && (
              <p className="bookingRegister-summaryRow">
                <span className="bookingRegister-summaryLabel">Event</span>
                <span className="bookingRegister-summaryValue">
                  {booking.eventId.title}
                </span>
              </p>
            )}
            {booking.ticketTypeId?.ticketName && (
              <p className="bookingRegister-summaryRow">
                <span className="bookingRegister-summaryLabel">Ticket Type</span>
                <span className="bookingRegister-summaryValue">
                  {booking.ticketTypeId.ticketName}
                </span>
              </p>
            )}
          </div>
        )}

        {quantity === 0 ? (
          <p className="bookingRegister-statusText">
            This booking has no ticket quantity to register.
          </p>
        ) : (
          <div
            className={
              quantity > 1 ? "bookingRegister-grid" : "bookingRegister-singleWrap"
            }
          >
            {slots.map((slotTicket, index) => {
              const memberNumber = index + 1;

              if (!slotTicket) {
                return (
                  <div className="bookingRegister-slot" key={`empty-${memberNumber}`}>
                    {quantity > 1 && (
                      <span className="bookingRegister-memberLabel">
                        MEMBER {memberNumber}
                      </span>
                    )}
                    <div className="bookingRegister-card">
                      <p className="bookingRegister-unavailableText">
                        Ticket data not available.
                      </p>
                    </div>
                  </div>
                );
              }

              const ticket = registeredOverrides[slotTicket._id] || slotTicket;

              if (ticket.isRegistered) {
                const attendee = ticket.attendee || {};
                return (
                  <div className="bookingRegister-slot" key={ticket._id}>
                    {quantity > 1 && (
                      <span className="bookingRegister-memberLabel">
                        MEMBER {memberNumber}
                      </span>
                    )}

                    <div className="bookingRegister-registeredCard">
                      <span className="bookingRegister-registeredAvatar">
                        {attendee.profileImage ? (
                          <img
                            src={attendee.profileImage}
                            alt={attendee.name}
                            className="bookingRegister-registeredAvatarImage"
                          />
                        ) : (
                          <RegisteredAvatarPlaceholder />
                        )}
                      </span>

                      <div className="bookingRegister-registeredInfo">
                        <span className="bookingRegister-registeredName">
                          {attendee.name || "-"}
                        </span>
                        <span className="bookingRegister-registeredMobile">
                          {attendee.mobileNumber || "-"}
                        </span>
                      </div>

                      {ticket.qrImage && (
                        <img
                          src={ticket.qrImage}
                          alt={ticket.ticketNumber || "QR code"}
                          className="bookingRegister-registeredQr"
                        />
                      )}
                    </div>
                  </div>
                );
              }

              const form = getFormState(ticket._id);
              const fieldErrors = getFieldErrorsForTicket(ticket._id);
              const isFormValid = Object.keys(getFieldErrors(form)).length === 0;
              const isSubmitting = submittingTicketId === ticket._id;
              const photoInputId = `bookingRegister-photo-${ticket._id}`;

              return (
                <div className="bookingRegister-slot" key={ticket._id}>
                  {quantity > 1 && (
                    <span className="bookingRegister-memberLabel">
                      MEMBER {memberNumber}
                    </span>
                  )}

                  <div className="bookingRegister-card">
                    <div className="bookingRegister-photoWrap">
                      <span className="bookingRegister-photoCircle">
                        {form.previewImage ? (
                          <img
                            src={form.previewImage}
                            alt="Preview"
                            className="bookingRegister-photoPreviewImage"
                          />
                        ) : (
                          <UploadPhotoPlaceholder />
                        )}
                      </span>
                      <input
                        id={photoInputId}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleImageChange(ticket._id, e)}
                      />
                      <label htmlFor={photoInputId} className="bookingRegister-editBtn">
                        <EditIcon />
                      </label>
                    </div>

                    <span className="bookingRegister-uploadText">upload photo</span>

                    <div className="bookingRegister-fieldGroup">
                      <div className="bookingRegister-fieldWrap">
                        <input
                          type="text"
                          className="bookingRegister-input"
                          placeholder="Name"
                          value={form.name}
                          onChange={(e) =>
                            updateFormField(ticket._id, "name", e.target.value)
                          }
                          disabled={isSubmitting}
                        />
                        {fieldErrors.name && (
                          <p className="bookingRegister-fieldError">
                            {fieldErrors.name}
                          </p>
                        )}
                      </div>

                      <div className="bookingRegister-fieldWrap">
                        <input
                          type="tel"
                          inputMode="numeric"
                          className="bookingRegister-input"
                          placeholder="Mobile No."
                          value={form.mobileNumber}
                          maxLength={10}
                          onChange={(e) =>
                            updateFormField(
                              ticket._id,
                              "mobileNumber",
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          disabled={isSubmitting}
                        />
                        {fieldErrors.mobileNumber && (
                          <p className="bookingRegister-fieldError">
                            {fieldErrors.mobileNumber}
                          </p>
                        )}
                      </div>

                      <div className="bookingRegister-fieldWrap">
                        <input
                          type="email"
                          className="bookingRegister-input"
                          placeholder="Email"
                          value={form.email}
                          onChange={(e) =>
                            updateFormField(ticket._id, "email", e.target.value)
                          }
                          disabled={isSubmitting}
                        />
                        {fieldErrors.email && (
                          <p className="bookingRegister-fieldError">
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="bookingRegister-submitBtn"
                      onClick={() => handleSubmit(ticket._id)}
                      disabled={isSubmitting || !isFormValid}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allRegistered && (
          <p className="bookingRegister-completeText">
            All registrations for this booking are complete.
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterUsers;