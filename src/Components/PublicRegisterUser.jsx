import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../assets/CSS/PublicRegisterUser.css";
import { showError, showSuccess } from "../utilits/toast";
import {
  getPublicRegistrationDetailsApi,
  submitPublicRegistrationApi,
} from "../services/publicRegistrationService";

// Public, no-login registration page for a BOOKING, opened from a
// WhatsApp link at /r/:token. The token is the ONLY ticket/booking
// identity used anywhere below — a ticketId is never read, stored, or
// sent from here.
//
// ================= SOURCE OF TRUTH =================
// Exactly like the authenticated RegisterUsers.jsx page, `tickets` below
// is never anything other than the backend's own record for this
// booking (GET/PUT /api/public/registration/:token, which already
// returns { quantity, tickets: [{ ticketNumber, isRegistered, attendee,
// ... }] } — see services/publicRegistration.service.js on the
// backend). No localStorage/sessionStorage is used to remember which
// slots are registered: a slot shows as registered because the DB says
// so, which is exactly what makes this correct after a page refresh.

function UploadPhotoPlaceholder() {
  return (
    <svg
      className="publicRegister-avatarIcon"
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
      className="publicRegister-editIcon"
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

// Same registered-avatar placeholder used by the authenticated
// RegisterUsers.jsx page, reused here so a registered slot's UI matches
// exactly (per the requirement to reuse the existing Private
// Registration registered-user UI wherever possible).
function RegisteredAvatarPlaceholder() {
  return (
    <svg
      className="publicRegister-registeredAvatarIcon"
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

// Same validation rules as RegisterUsers.jsx / BookingUserModal.
// Returns a { fieldName: message } map so each error can render
// directly below its own field.
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

// Maps a failed axios call to one clean, customer-facing message — never
// a raw server/stack-trace string. Falls back to the backend's own
// `message` field first, then to a friendly default per status code.
const getFriendlyErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (serverMessage) return serverMessage;

  switch (status) {
    case 400:
      return "This registration link is missing required information.";
    case 401:
      return "This registration link is invalid or has expired.";
    case 404:
      return "We couldn't find a ticket for this registration link.";
    case 409:
      return "This ticket has already been registered.";
    case 500:
      return "Something went wrong on our end. Please try again shortly.";
    default:
      return fallback;
  }
};

// The GET/PUT public registration endpoints come back as
// { success, message, data: { quantity, tickets } } — `data` here is the
// axios response BODY (services/publicRegistrationService.js returns
// response.data), so unwrapping one more level gets to the actual
// { quantity, tickets } / { tickets } payload. Mirrors the same helper
// in RegisterUsers.jsx.
const unwrap = (response) => response?.data ?? response;

const PublicRegisterUser = () => {
  // The registration token from the URL — the only ticket/booking
  // identity used anywhere in this component.
  const { token } = useParams();

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState("");

  // Tickets as last read from the backend — the single source of truth
  // for which slots are registered. Never mutated locally except by
  // replacing it wholesale with a fresh server response, so a page
  // refresh (which re-runs the fetch below) always reflects reality.
  const [tickets, setTickets] = useState([]);

  // Pending-form input state, keyed by each ticket's ticketNumber (the
  // only stable identifier the public API exposes — see
  // toPublicSafeTicket on the backend). Using ticketNumber instead of
  // array index keeps a slot's in-progress typing tied to the same
  // ticket even if the backend's fill order means a different slot ends
  // up registering first.
  const [formStates, setFormStates] = useState({});
  const [fieldErrorsByKey, setFieldErrorsByKey] = useState({});
  const [submittingKey, setSubmittingKey] = useState(null);

  const loadRegistrationDetails = useCallback(async () => {
    if (!token) {
      setValidationError("This registration link is invalid.");
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setValidationError("");

    try {
      const result = unwrap(await getPublicRegistrationDetailsApi(token));
      setTickets(Array.isArray(result?.tickets) ? result.tickets : []);
    } catch (error) {
      setValidationError(
        getFriendlyErrorMessage(
          error,
          "This registration link could not be verified."
        )
      );
    } finally {
      setIsValidating(false);
    }
  }, [token]);

  useEffect(() => {
    loadRegistrationDetails();
  }, [loadRegistrationDetails]);

  const getTicketKey = (ticket, index) =>
    ticket.ticketNumber || `slot-${index + 1}`;

  const getForm = (key) => formStates[key] || emptyForm;
  const getFieldErrorsForKey = (key) => fieldErrorsByKey[key] || {};

  const updateField = (key, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [key]: { ...getForm(key), [field]: value },
    }));

    // Clear this field's visible error the instant it's edited, so a
    // corrected value doesn't keep showing a stale message.
    setFieldErrorsByKey((prev) => {
      const current = prev[key];
      if (!current || !current[field]) return prev;
      return { ...prev, [key]: { ...current, [field]: undefined } };
    });
  };

  const handleImageChange = (key, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please select valid image.");
      return;
    }

    // Matches the backend's registration-specific upload limit
    // (middlewares/upload.middleware.js's `registrationPhotoUpload`).
    if (file.size > 100 * 1024 * 1024) {
      showError("Image size should be less than 100MB.");
      return;
    }

    setFormStates((prev) => ({
      ...prev,
      [key]: {
        ...getForm(key),
        profileImage: file,
        previewImage: URL.createObjectURL(file),
      },
    }));
  };

  // ================= SUBMIT =================
  // Uses the SAME existing endpoint/request shape as before
  // (submitPublicRegistrationApi(token, FormData) -> PUT
  // /api/public/registration/:token with name/mobileNumber/email/
  // profileImage) — no new API, no new fields. The token in the URL
  // remains the sole ticket/booking identity. After a successful
  // submit, every slot is repainted from the server's own response
  // (result.tickets) rather than guessing locally which slot just got
  // filled — the backend always fills the earliest still-unregistered
  // ticket under this booking.
  const handleSubmit = async (key, e) => {
    e.preventDefault();

    if (submittingKey !== null) return;

    const form = getForm(key);
    const errors = getFieldErrors(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrorsByKey((prev) => ({ ...prev, [key]: errors }));
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("mobileNumber", form.mobileNumber.trim());
    payload.append("email", form.email.trim());
    if (form.profileImage) {
      payload.append("profileImage", form.profileImage);
    }

    setSubmittingKey(key);

    try {
      const result = unwrap(await submitPublicRegistrationApi(token, payload));
      showSuccess(result?.message || "You have been registered successfully.");

      if (Array.isArray(result?.tickets)) {
        setTickets(result.tickets);
      } else {
        await loadRegistrationDetails();
      }

      setFormStates((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFieldErrorsByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (error) {
      showError(
        getFriendlyErrorMessage(
          error,
          "Failed to submit your registration. Please try again."
        )
      );
      // Someone may have just filled the last open slot from another
      // tab/device; resync so this page doesn't keep offering a slot
      // that no longer exists.
      await loadRegistrationDetails();
    } finally {
      setSubmittingKey(null);
    }
  };

  const heroTitle = (
    <div className="publicRegister-hero">
      <h1 className="publicRegister-title">
        Ticket
        <br />
        Registration <span className="publicRegister-wave">&#128075;</span>
      </h1>
    </div>
  );

  if (isValidating) {
    return (
      <div className="publicRegister-page">
        {heroTitle}
        <div className="publicRegister-content">
          <p className="publicRegister-statusText">Checking your link...</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="publicRegister-page">
        {heroTitle}
        <div className="publicRegister-content">
          <div className="publicRegister-card publicRegister-errorCard">
            <span className="publicRegister-errorIcon">&#33;</span>
            <p className="publicRegister-errorTitle">Link not valid</p>
            <p className="publicRegister-errorText">{validationError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="publicRegister-page">
        {heroTitle}
        <div className="publicRegister-content">
          <p className="publicRegister-statusText">No Booking Found</p>
        </div>
      </div>
    );
  }

  const firstTicket = tickets[0] || {};
  const quantity = tickets.length;
  const allRegistered = tickets.every((t) => t.isRegistered);

  return (
    <div className="publicRegister-page">
      {heroTitle}

      <div className="publicRegister-content">
        {(firstTicket.eventTitle || firstTicket.ticketTypeName) && (
          <div className="publicRegister-summary">
            {firstTicket.eventTitle && (
              <p className="publicRegister-summaryRow">
                <span className="publicRegister-summaryLabel">Event</span>
                <span className="publicRegister-summaryValue">
                  {firstTicket.eventTitle}
                </span>
              </p>
            )}
            {firstTicket.ticketTypeName && (
              <p className="publicRegister-summaryRow">
                <span className="publicRegister-summaryLabel">Ticket Type</span>
                <span className="publicRegister-summaryValue">
                  {firstTicket.ticketTypeName}
                </span>
              </p>
            )}
          </div>
        )}

        {/* ================= REGISTRATION SLOT(S) =================
            One card per ticket under this booking, in the exact order
            the backend persists them (see getRegistrationDetails on the
            backend). Each slot's registered/pending state comes only
            from that ticket's own `isRegistered`/`attendee` fields —
            never from any local "just submitted" flag — so every slot
            renders identically on first load and after a refresh. */}
        <div
          className={
            quantity > 1 ? "publicRegister-grid" : "publicRegister-singleWrap"
          }
        >
          {tickets.map((ticket, index) => {
            const key = getTicketKey(ticket, index);
            const memberNumber = index + 1;

            if (ticket.isRegistered) {
              const attendee = ticket.attendee || {};
              return (
                <div className="publicRegister-slot" key={key}>
                  {quantity > 1 && (
                    <span className="publicRegister-slotLabel">
                      Registration {memberNumber}
                    </span>
                  )}

                  <div className="publicRegister-registeredCard">
                    <span className="publicRegister-registeredAvatar">
                      {attendee.profileImage ? (
                        <img
                          src={attendee.profileImage}
                          alt={attendee.name}
                          className="publicRegister-registeredAvatarImage"
                        />
                      ) : (
                        <RegisteredAvatarPlaceholder />
                      )}
                    </span>

                    <div className="publicRegister-registeredInfo">
                      <span className="publicRegister-registeredName">
                        {attendee.name || "-"}
                      </span>
                      <span className="publicRegister-registeredMobile">
                        {attendee.mobileNumber || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            const form = getForm(key);
            const fieldErrors = getFieldErrorsForKey(key);
            const isFormValid = Object.keys(getFieldErrors(form)).length === 0;
            const isSubmitting = submittingKey === key;
            const photoInputId = `publicRegister-photo-${key}`;

            return (
              <div className="publicRegister-slot" key={key}>
                {quantity > 1 && (
                  <span className="publicRegister-slotLabel">
                    Registration {memberNumber}
                  </span>
                )}

                <form
                  className="publicRegister-card"
                  onSubmit={(e) => handleSubmit(key, e)}
                >
                  <div className="publicRegister-photoWrap">
                    <span className="publicRegister-photoCircle">
                      {form.previewImage ? (
                        <img
                          src={form.previewImage}
                          alt="Preview"
                          className="publicRegister-photoPreviewImage"
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
                      onChange={(e) => handleImageChange(key, e)}
                    />
                    <label htmlFor={photoInputId} className="publicRegister-editBtn">
                      <EditIcon />
                    </label>
                  </div>

                  <span className="publicRegister-uploadText">upload photo</span>

                  <div className="publicRegister-fieldGroup">
                    <div className="publicRegister-fieldWrap">
                      <input
                        type="text"
                        className="publicRegister-input"
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) => updateField(key, "name", e.target.value)}
                        disabled={isSubmitting}
                      />
                      {fieldErrors.name && (
                        <p className="publicRegister-fieldError">{fieldErrors.name}</p>
                      )}
                    </div>

                    <div className="publicRegister-fieldWrap">
                      <input
                        type="tel"
                        inputMode="numeric"
                        className="publicRegister-input"
                        placeholder="Mobile No."
                        value={form.mobileNumber}
                        maxLength={10}
                        onChange={(e) =>
                          updateField(
                            key,
                            "mobileNumber",
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        disabled={isSubmitting}
                      />
                      {fieldErrors.mobileNumber && (
                        <p className="publicRegister-fieldError">
                          {fieldErrors.mobileNumber}
                        </p>
                      )}
                    </div>

                    <div className="publicRegister-fieldWrap">
                      <input
                        type="email"
                        className="publicRegister-input"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => updateField(key, "email", e.target.value)}
                        disabled={isSubmitting}
                      />
                      {fieldErrors.email && (
                        <p className="publicRegister-fieldError">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="publicRegister-submitBtn"
                    disabled={isSubmitting || !isFormValid}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        {allRegistered && (
          <p className="publicRegister-completeText">
            All registrations for this booking are complete.
          </p>
        )}
      </div>
    </div>
  );
};

export default PublicRegisterUser;