import { useEffect, useRef, useState } from "react";

// This is a SEPARATE Google Sheet from the "Join Community" form
// (Pages/Site/Contact.jsx) — its own Google Apps Script Web App, its own
// Sheet, and its own field set (see the Code.gs delivered alongside this
// file: google-apps-script/ParvRegisterForm.gs). Nothing in Contact.jsx
// or its Sheet/script is touched by this.
//
// SETUP (one-time): deploy google-apps-script/ParvRegisterForm.gs as its
// own Web App (see the setup steps at the top of that file), then paste
// the deployment's "Web app URL" below in place of the placeholder.
const PARV_REGISTER_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby2MX8lKZIjVwXd7zG7qibpeOIoRKaxJt6LoptykM1AOQnONk8vF8MIpUGG98hjj9M/exec";

// Accepts a WhatsApp number with or without a country code and always
// sends it to the sheet as +91XXXXXXXXXX — so the person filling the
// form is never required to type +91 themselves (the hint under the
// field says so), but the sheet still gets a consistent, dialable
// format either way.
const normalizeWhatsapp = (value) => {
  const stripped = String(value || "").replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;

  const withoutLeadingZero = stripped.replace(/^0+/, "");
  // Already has the country code, just missing the "+" (e.g. "919876543210").
  if (withoutLeadingZero.startsWith("91") && withoutLeadingZero.length > 10) {
    return `+${withoutLeadingZero}`;
  }
  return `+91${withoutLeadingZero}`;
};

/**
 * "Request Invitation" / "Request Your Invitation" modal for the Parv
 * page — the Parv Register Form. Visually the same "Join Community"
 * card as Pages/Site/Contact.jsx (reuses its .join-section/.join-card/
 * ... CSS as-is — nothing there was touched) but opens as an overlay on
 * the current page instead of navigating to a separate route, wrapped
 * in its own .invite-modal overlay (styled after the existing
 * .event-modal lightbox pattern).
 *
 * Fields, per what was asked:
 *  - Name
 *  - WhatsApp Number (accepts with/without +91)
 *  - Email Address
 *  - Location
 *  - How many people are you bringing to Parv?
 *  - Reference (optional — how they heard about it / who referred them)
 *
 * Submits to its OWN Google Sheet (PARV_REGISTER_SCRIPT_URL above) —
 * separate from the Join Community form's sheet.
 *
 * Props:
 *  - open: boolean — modal shown when true
 *  - onClose: () => void
 */
export default function InviteRequestModal({ open, onClose }) {
  const formRef = useRef(null);
  const [status, setStatus] = useState({ visible: false, color: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  // Lock page scroll behind the modal while it's open (same behavior as
  // EventGalleryModal.jsx).
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes, same as EventGalleryModal.jsx.
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Reset any leftover status message from a previous open.
  useEffect(() => {
    if (!open) {
      setStatus({ visible: false, color: "", message: "" });
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (PARV_REGISTER_SCRIPT_URL.startsWith("PASTE_YOUR_")) {
      setStatus({
        visible: true,
        color: "#ff6b6b",
        message:
          "Form isn't connected to a Google Sheet yet — deploy google-apps-script/ParvRegisterForm.gs and paste its URL into InviteRequestModal.jsx.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({ visible: true, color: "#F4DD4E", message: "Sending your registration..." });

    const formData = new FormData(form);
    formData.set("whatsapp", normalizeWhatsapp(formData.get("whatsapp")));

    try {
      // no-cors: request reaches Google and the sheet gets the row.
      // Response is opaque (can't be read), so reach = success — same
      // assumption Contact.jsx already makes for its own endpoint.
      await fetch(PARV_REGISTER_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });
      setStatus({
        visible: true,
        color: "#F4DD4E",
        message: "Thanks! Your Parv registration has been submitted.",
      });
      form.reset();
    } catch (err) {
      setStatus({
        visible: true,
        color: "#ff6b6b",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="invite-modal active">
      <div className="invite-modal-overlay" onClick={onClose}></div>

      <div className="invite-modal-content">
        <div className="join-card" data-aos="zoom-in">
          <button type="button" className="join-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>

          <div className="join-badge">&#9733;</div>

          <h1 className="join-title">PARV RIGISTRATION FORM</h1>
          <p className="join-tagline">
            IF YOU'D LIKE TO ATTEND PARV, PLEASE TAKE A MOMENT TO FILL OUT THIS FORM.
          </p>

          <form className="join-form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <input type="text" name="name" placeholder="NAME *" aria-label="Name" required />

            <div>
              <input
                type="tel"
                name="whatsapp"
                placeholder="WHATSAPP NUMBER *"
                aria-label="WhatsApp number"
                required
              />
              <p className="join-hint">You can enter it with or without +91 — either way works.</p>
            </div>

            <input type="email" name="email" placeholder="EMAIL ADDRESS *" aria-label="Email address" required />

            <input type="text" name="location" placeholder="LOCATION (CITY) *" aria-label="Location" required />

            <input
              type="number"
              name="peopleCount"
              min="1"
              step="1"
              placeholder="HOW MANY PEOPLE ARE YOU BRINGING TO PARV? *"
              aria-label="Number of people attending"
              required
            />

            <input
              type="text"
              name="reference"
              placeholder="REFERENCE (HOW DID YOU HEAR ABOUT US?)"
              aria-label="Reference"
            />

            <div className="join-actions">
              <button type="submit" className="join-submit" disabled={submitting}>
                {submitting ? "Submitting..." : <>Submit Registration &rarr;</>}
              </button>
            </div>
            {status.visible && (
              <p className="join-status" style={{ color: status.color }}>
                {status.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}