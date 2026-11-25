import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

import { useGlobalEvent } from "../context/EventContext";
import {
  RUN_DISTANCES,
  createRunRegistrationApi,
  updateRunRegistrationApi,
} from "../services/runRegistrationService";
import { showError, showSuccess, showWarning } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import {
  isValidMobileNumber,
  sanitizeMobileInput,
  LOCAL_MOBILE_ERROR_MESSAGE,
} from "../utilits/mobileNumber";

import "../assets/CSS/CreateCompanyCategoryModal.css";
import "../assets/CSS/RunRegistration.css";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 10-digit part of a stored "91XXXXXXXXXX" number (what the input shows).
const toLocal = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
};

/**
 * "Add Data" / "Edit Data".
 *
 *  Add  - the admin types a Name and a Mobile number. On save the backend
 *         sends that number a WhatsApp message with the registration link.
 *         The row is saved under the event picked in the header dropdown.
 *  Edit - pass `item`. Name + mobile can always be changed; once the person
 *         has registered, email and distance can be changed too.
 *         Changing the mobile of a person who has NOT registered yet sends
 *         the link to the new number.
 */
export default function RunRegistrationModal({ item = null, onClose, onSaved }) {
  const { effectiveEventId, events } = useGlobalEvent();
  const isEdit = Boolean(item);
  const isRegistered = isEdit && item.status === "registered";

  // The edition (event) this person is / will be registered in.
  const editionId = isEdit ? item.eventId : effectiveEventId;
  const editionName =
    (events || []).find((e) => e._id === editionId)?.title || item?.eventTitle || "";

  const [name, setName] = useState(item?.name || "");
  const [mobile, setMobile] = useState(toLocal(item?.mobileNumber));
  const [email, setEmail] = useState(item?.email || "");
  const [distance, setDistance] = useState(item?.distance ? String(item.distance) : "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const validate = () => {
    const next = {};
    const cleanName = name.replace(/\s+/g, " ").trim();

    if (!cleanName) next.name = "Name is required.";
    else if (cleanName.length > 60) next.name = "Name is too long (max 60 characters).";

    if (!mobile) next.mobile = "Mobile number is required.";
    else if (!isValidMobileNumber(mobile)) next.mobile = LOCAL_MOBILE_ERROR_MESSAGE;

    if (isRegistered) {
      // Email is optional; when given it must be valid.
      if (email.trim() && !EMAIL_RX.test(email.trim())) next.email = "Enter a valid email address.";
      if (!distance) next.distance = "Please select 5 KM or 10 KM.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    const cleanName = name.replace(/\s+/g, " ").trim();
    setSaving(true);
    try {
      if (isEdit) {
        const res = await updateRunRegistrationApi(item._id, {
          name: cleanName,
          mobile,
          ...(isRegistered ? { email: email.trim(), distance: Number(distance) } : {}),
        });

        if (res?.whatsappSent === false) {
          showWarning("Saved, but the WhatsApp link could not be sent. Use Resend Link.");
        } else if (res?.whatsappSent === true) {
          showSuccess("Updated. Registration link sent on the new number.");
        } else {
          showSuccess("Updated.");
        }
      } else {
        const res = await createRunRegistrationApi({
          name: cleanName,
          mobile,
          // The edition (event) this person belongs to.
          ...(effectiveEventId ? { eventId: effectiveEventId } : {}),
        });

        // The entry is saved even if WhatsApp failed - the admin can use
        // "Resend Link" from the list afterwards.
        if (res?.whatsappSent === false) {
          showWarning("Saved, but the WhatsApp message could not be sent. Use Resend Link.");
        } else {
          showSuccess("Added. Registration link sent on WhatsApp.");
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      showError(getErrorText(err, isEdit ? "Unable to update." : "Unable to add the data."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="companyCategoryModalOverlay" onClick={onClose}>
      <form
        className="createCompanyCategoryModal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="modalHeader">
          <h2 className="modalTitle">{isEdit ? "Edit Data" : "Add Data"}</h2>
          <button type="button" className="closeIconButton" onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        <div className="formGrid">
          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="runEdition">
              Edition (Event)
            </label>
            <input
              id="runEdition"
              type="text"
              className="fieldInput"
              value={editionName || "Active event"}
              readOnly
              disabled
            />
            {!isEdit && (
              <p className="runModal__note">
                This person is registered in this edition. Change it from the Event dropdown at the top.
              </p>
            )}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="runName">
              Name <span className="required">*</span>
            </label>
            <input
              id="runName"
              type="text"
              className="fieldInput"
              placeholder="Enter full name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="fieldError">{errors.name}</p>}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="runMobile">
              Mobile Number (WhatsApp) <span className="required">*</span>
            </label>
            <input
              id="runMobile"
              type="tel"
              inputMode="numeric"
              className="fieldInput"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
            />
            {errors.mobile && <p className="fieldError">{errors.mobile}</p>}
            {!isEdit && (
              <p className="runModal__note">
                The registration link is sent on this WhatsApp number as soon as you save.
              </p>
            )}
            {isEdit && !isRegistered && (
              <p className="runModal__note">
                If you change the number, the registration link is sent to the new number.
              </p>
            )}
          </div>

          {isRegistered && (
            <>
              <div className="fieldGroup fieldGroupFull">
                <label className="fieldLabel" htmlFor="runEmail">
                  Email <span className="runModal__note">(optional)</span>
                </label>
                <input
                  id="runEmail"
                  type="email"
                  className="fieldInput"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="fieldError">{errors.email}</p>}
              </div>

              <div className="fieldGroup fieldGroupFull">
                <label className="fieldLabel" htmlFor="runDistance">
                  Distance <span className="required">*</span>
                </label>
                <select
                  id="runDistance"
                  className="fieldInput"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                >
                  <option value="">Select distance</option>
                  {RUN_DISTANCES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {errors.distance && <p className="fieldError">{errors.distance}</p>}
                <p className="runModal__note">
                  The QR stays the same. Use Resend QR if the person needs it again.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="modalFooter">
          <button type="button" className="modalCloseButton" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="modalCreateButton" disabled={saving}>
            {saving ? (isEdit ? "Saving..." : "Sending...") : isEdit ? "Save Changes" : "Save & Send Link"}
          </button>
        </div>
      </form>
    </div>
  );
}
