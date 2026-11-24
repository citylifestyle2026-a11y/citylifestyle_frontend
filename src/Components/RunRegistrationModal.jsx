import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

import { createRunRegistrationApi } from "../services/runRegistrationService";
import { showError, showSuccess, showWarning } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import {
  isValidMobileNumber,
  sanitizeMobileInput,
  LOCAL_MOBILE_ERROR_MESSAGE,
} from "../utilits/mobileNumber";

import "../assets/CSS/CreateCompanyCategoryModal.css";
import "../assets/CSS/RunRegistration.css";

/**
 * "Add Data" - the admin types a Name and a Mobile number.
 * On save the backend sends that number a WhatsApp message with the
 * registration link (5 KM / 10 KM + name + mobile + email form).
 */
export default function RunRegistrationModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
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

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    try {
      const res = await createRunRegistrationApi({
        name: name.replace(/\s+/g, " ").trim(),
        mobile,
      });

      // The entry is saved even if WhatsApp failed - the admin can use
      // "Resend Link" from the list afterwards.
      if (res?.whatsappSent === false) {
        showWarning("Saved, but the WhatsApp message could not be sent. Use Resend Link.");
      } else {
        showSuccess("Added. Registration link sent on WhatsApp.");
      }
      onSaved();
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Unable to add the data."));
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
          <h2 className="modalTitle">Add Data</h2>
          <button type="button" className="closeIconButton" onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        <div className="formGrid">
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
            <p className="runModal__note">
              The registration link is sent on this WhatsApp number as soon as you save.
            </p>
          </div>
        </div>

        <div className="modalFooter">
          <button type="button" className="modalCloseButton" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="modalCreateButton" disabled={saving}>
            {saving ? "Sending..." : "Save & Send Link"}
          </button>
        </div>
      </form>
    </div>
  );
}
