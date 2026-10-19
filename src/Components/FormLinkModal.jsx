import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { createFormLinkApi, updateFormLinkApi } from "../services/formLinkService";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import { copyText } from "../utilits/copyText";
import { buildFormLinkUrl } from "../services/formLinkService";
import "../assets/CSS/CreateCompanyCategoryModal.css";
import "../assets/CSS/FormLinks.css";

/**
 * Create / Edit a form link (Form Links page).
 *
 * Name     = the Reference every person who fills the form gets.
 * Quantity = how many people may fill the form with this link.
 * Edit     = a new Name is used for people who fill the form AFTER the edit.
 */
export default function FormLinkModal({ onClose, onSaved, link = null }) {
  const isEdit = Boolean(link);

  const [name, setName] = useState(link?.name || "");
  const [quantity, setQuantity] = useState(link ? String(link.quantity) : "");
  const [target, setTarget] = useState(link?.target || "contact");
  const [status, setStatus] = useState(link?.status || "active");
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
    const qty = Number(quantity);

    if (!cleanName) next.name = "Name is required.";
    else if (cleanName.length > 60) next.name = "Name is too long (max 60 characters).";

    if (!quantity) next.quantity = "Quantity is required.";
    else if (!Number.isInteger(qty) || qty < 1) next.quantity = "Enter a whole number of at least 1.";
    else if (qty > 1000) next.quantity = "Quantity cannot be more than 1000.";
    else if (isEdit && qty < link.usedCount) {
      next.quantity = `${link.usedCount} people have already filled it, so quantity cannot be less than ${link.usedCount}.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    const payload = {
      name: name.replace(/\s+/g, " ").trim(),
      quantity: Number(quantity),
      target,
    };

    setSaving(true);
    try {
      if (isEdit) {
        const res = await updateFormLinkApi(link._id, { ...payload, status });
        showSuccess(res?.message || "Form link updated.");
      } else {
        const res = await createFormLinkApi(payload);
        const created = res?.data;
        const copied = created ? await copyText(buildFormLinkUrl(created.token)) : false;
        showSuccess(copied ? "Form link created and copied." : "Form link created.");
      }
      onSaved();
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Unable to save the form link."));
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
          <h2 className="modalTitle">{isEdit ? "Edit Form Link" : "Create Form Link"}</h2>
          <button
            type="button"
            className="closeIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="formGrid">
          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="flName">
              Name (Reference) <span className="required">*</span>
            </label>
            <input
              id="flName"
              type="text"
              className="fieldInput"
              placeholder="e.g. Rahul Shah"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="fieldError">{errors.name}</p>}
            {isEdit && link.usedCount > 0 && (
              <p className="formLinks__note">
                A new name is used only for people who fill the form after this edit.
              </p>
            )}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="flQty">
              Quantity <span className="required">*</span>
            </label>
            <input
              id="flQty"
              type="number"
              min="1"
              max="1000"
              inputMode="numeric"
              className="fieldInput"
              placeholder="e.g. 15"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {errors.quantity && <p className="fieldError">{errors.quantity}</p>}
            <p className="formLinks__note">How many people can fill the form with this link.</p>
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel" htmlFor="flTarget">
              Add the data to
            </label>
            <select
              id="flTarget"
              className="fieldInput"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="contact">Guest List</option>
              <option value="member">Contact Book</option>
            </select>
          </div>

          {isEdit && (
            <div className="fieldGroup fieldGroupFull">
              <label className="fieldLabel" htmlFor="flStatus">
                Status
              </label>
              <select
                id="flStatus"
                className="fieldInput"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        <div className="modalFooter">
          <button
            type="button"
            className="modalCloseButton"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="modalCreateButton" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
