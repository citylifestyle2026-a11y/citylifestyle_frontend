import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { createBlockApi, updateBlockApi } from "../services/blocklistService";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/BlockList.css";

/**
 * Add a person to the Block List (or edit an existing block).
 *   person   -> edit mode: { _id, name, mobileNumber, reason }
 *   prefill  -> add mode, e.g. from a Guest List row: { name, mobile }
 *   onSaved  -> called after a successful save (page refetches)
 */
export default function BlockPersonModal({ onClose, onSaved, person = null, prefill = null }) {
  const isEdit = Boolean(person);

  const [form, setForm] = useState({
    name: person?.name || prefill?.name || "",
    mobile: person?.mobileNumber || prefill?.mobile || "",
    reason: person?.reason || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";
    const digits = form.mobile.replace(/\D/g, "");
    if (!isEdit && !/^(91)?[6-9]\d{9}$/.test(digits)) {
      next.mobile = "Enter a valid 10-digit mobile number";
    }
    if (!form.reason.trim()) next.reason = "Please write the reason for blocking";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const res = isEdit
        ? await updateBlockApi(person._id, { name: form.name, reason: form.reason })
        : await createBlockApi({ name: form.name, mobileNumber: form.mobile, reason: form.reason });
      showSuccess(res?.message || "Saved");
      onSaved?.();
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="blockModal__overlay" onClick={() => !saving && onClose()}>
      <div className="blockModal__card" onClick={(e) => e.stopPropagation()}>
        <div className="blockModal__header">
          <h2 className="blockModal__title">{isEdit ? "Edit Block" : "Block Person"}</h2>
          <button type="button" className="blockModal__close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {!isEdit && (
          <p className="blockModal__hint">
            If this mobile number is added again (Guest List, Contact Book, Invitation Cards or the
            public form), it will be flagged with this reason.
          </p>
        )}

        <div className="blockModal__field">
          <label className="blockModal__label">
            Name <span className="blockModal__req">*</span>
          </label>
          <input
            className="blockModal__input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Person's name"
          />
          {errors.name && <p className="blockModal__error">{errors.name}</p>}
        </div>

        <div className="blockModal__field">
          <label className="blockModal__label">
            Mobile Number <span className="blockModal__req">*</span>
          </label>
          <input
            className="blockModal__input"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            inputMode="tel"
            disabled={isEdit}
          />
          {errors.mobile && <p className="blockModal__error">{errors.mobile}</p>}
        </div>

        <div className="blockModal__field">
          <label className="blockModal__label">
            Reason / Remarks <span className="blockModal__req">*</span>
          </label>
          <textarea
            className="blockModal__textarea"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Why is this person blocked?"
            maxLength={500}
          />
          {errors.reason && <p className="blockModal__error">{errors.reason}</p>}
        </div>

        <div className="blockModal__footer">
          <button type="button" className="blockModal__cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="blockModal__save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save" : "Block"}
          </button>
        </div>
      </div>
    </div>
  );
}
