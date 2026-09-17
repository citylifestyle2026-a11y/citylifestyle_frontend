import { useState } from "react";
import { useDispatch } from "react-redux";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import "../assets/CSS/DeleteEventModal.css";
import { deleteEvent } from "../redux/event/eventThunk";
import { showSuccess } from "../utilits/toast";

// Second step of the secure Manual Event Delete flow (Step 4): the
// existing "Are you sure?" SweetAlert confirmation (still in Event.jsx)
// happens first; only once that's confirmed does this modal open, asking
// the currently authenticated admin to re-enter their own email +
// password. Submitting calls the (Step 3) DELETE /events/:id/delete API
// via the existing deleteEvent thunk/eventService — nothing about the
// delete transaction itself is duplicated or reimplemented here.
export default function DeleteEventModal({
  eventId,
  eventTitle,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chrome/Edge can ignore autoComplete="off" on fields that merely look
  // like a login form and fill them from saved credentials before the
  // user ever types anything. Keeping the real fields readOnly until the
  // user actually clicks/focuses them blocks that automatic fill (the
  // browser won't write into a readOnly field), while still letting the
  // admin type normally the moment they interact with it. Combined with
  // the hidden decoy fields below (which the browser's autofill targets
  // instead of the real ones), this ensures both fields start empty and
  // are only ever populated by what the admin actually types.
  const [emailLocked, setEmailLocked] = useState(true);
  const [passwordLocked, setPasswordLocked] = useState(true);

  // Independent show/hide state for this field only.
  const [showPassword, setShowPassword] = useState(false);

  const handleDelete = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setFormError("Admin email and password are required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const result = await dispatch(
      deleteEvent({
        id: eventId,
        email: trimmedEmail,
        password,
      })
    );

    setIsSubmitting(false);

    if (deleteEvent.fulfilled.match(result)) {
      showSuccess(result.payload?.message || "Event deleted successfully.");
      onClose();
      onSuccess?.();
      return;
    }

    // Wrong/invalid credentials (or any other backend rejection): keep
    // this modal open and show the backend's own message inline in the
    // form, per the required flow — never toast-and-close on failure.
    // `password` itself is never included in this message, logged, or
    // read back from the store anywhere.
    setFormError(result.payload || "Failed to delete event.");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (formError) setFormError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (formError) setFormError("");
  };

  const handleOverlayClick = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <div className="eventDeleteOverlay" onClick={handleOverlayClick}>
      <div
        className="eventDeleteContainer"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="eventDeleteTitle">Confirm Admin Password</h2>

        <p className="eventDeleteMessage">
          To permanently delete{" "}
          <span className="eventDeleteHighlight">{eventTitle}</span>, please
          confirm your admin credentials.
        </p>

        {/* Decoy fields: invisible to the admin, but browsers that ignore
            autoComplete="off" will target these (being the first
            email/password-shaped inputs in the DOM) with any saved
            autofill instead of the real fields below. Never read from,
            submitted, or referenced anywhere else. */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, width: 0, overflow: "hidden" }} aria-hidden="true">
          <input type="text" name="username" tabIndex={-1} autoComplete="username" />
          <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
        </div>

        <div className="eventDeleteFieldGroup">
          <label className="eventDeleteLabel">
            Admin Email <span className="eventDeleteRequired">*</span>
          </label>
          <input
            type="email"
            className="eventDeleteInput"
            placeholder="Enter admin email"
            value={email}
            onChange={handleEmailChange}
            onFocus={() => setEmailLocked(false)}
            disabled={isSubmitting}
            readOnly={emailLocked}
            name="admin-delete-email-field"
            autoComplete="off"
          />
        </div>

        <div className="eventDeleteFieldGroup">
          <label className="eventDeleteLabel">
            Password <span className="eventDeleteRequired">*</span>
          </label>
          <div className="eventDeleteInputWrap">
            <input
              type={showPassword ? "text" : "password"}
              className="eventDeleteInput"
              placeholder="Enter admin password"
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => setPasswordLocked(false)}
              disabled={isSubmitting}
              readOnly={passwordLocked}
              name="admin-delete-password-field"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="eventDeletePasswordToggle"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isSubmitting}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
          </div>
        </div>

        {formError && (
          <p className="eventDeleteError" role="alert">
            {formError}
          </p>
        )}

        <div className="eventDeleteFooter">
          <button
            type="button"
            className="eventDeleteCloseBtn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
          <button
            type="button"
            className="eventDeleteDeleteBtn"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}