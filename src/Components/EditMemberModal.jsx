import { useState } from "react";
import { FaTimes, FaUserEdit } from "react-icons/fa";

import { updateMemberApi } from "../services/memberService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import "../assets/CSS/EditMemberModal.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Edit one member's details (Member List -> Action -> Edit).
 * professions: existing professions, offered as suggestions while typing.
 */
export default function EditMemberModal({ member, professions = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    name: member.name || "",
    mobile: member.mobile || "",
    email: member.email || "",
    profession: member.profession || "",
    companyName: member.companyName || "",
    objective: member.objective || "",
    area: member.area || "",
    city: member.city || "",
    state: member.state || "",
    references: (member.references || []).join(", "),
    source: member.source || "",
    remark: member.remark || "",
    memberStatus: member.memberStatus || "Active",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) => {
    const value = key === "mobile" ? e.target.value.replace(/[^\d+\s]/g, "") : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";

    const digits = form.mobile.replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(local)) next.mobile = "Enter a valid 10-digit mobile number";

    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      next.email = "Enter a valid email";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    try {
      const res = await updateMemberApi(member._id, form);
      showSuccess(res?.message || "Member updated successfully");
      onSaved?.(res?.data);
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Failed to update member"));
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, extra = {}) => (
    <div className={`editMember__field ${extra.wide ? "editMember__field--wide" : ""}`}>
      <label className="editMember__label" htmlFor={`editMember-${key}`}>
        {label}
        {extra.required && <span className="editMember__req"> *</span>}
      </label>
      <input
        id={`editMember-${key}`}
        className={`editMember__input ${errors[key] ? "editMember__input--error" : ""}`}
        type="text"
        value={form[key]}
        onChange={setField(key)}
        placeholder={extra.placeholder}
        list={extra.list}
        inputMode={extra.inputMode}
        maxLength={extra.maxLength}
      />
      {errors[key] && <span className="editMember__error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="editMember__overlay" onMouseDown={saving ? undefined : onClose}>
      <form
        className="editMember__container"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        noValidate
      >
        <div className="editMember__header">
          <div className="editMember__titleWrap">
            <span className="editMember__titleIcon"><FaUserEdit /></span>
            <h2 className="editMember__title">Edit Member</h2>
          </div>
          <button type="button" className="editMember__close" onClick={onClose} disabled={saving} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="editMember__grid">
          {field("name", "Name", { required: true })}
          {field("mobile", "Mobile", { required: true, inputMode: "tel", maxLength: 16 })}
          {field("email", "Email", { placeholder: "name@example.com" })}
          {field("profession", "Profession", { list: "editMember-professions" })}
          {field("companyName", "Company / Brand")}
          {field("objective", "Objective")}
          {field("area", "Area")}
          {field("city", "City")}
          {field("state", "State")}
          {field("references", "References (separate with comma)", { wide: true })}
          {field("source", "Source")}
          {field("memberStatus", "Status")}
          {field("remark", "Remark", { wide: true })}
        </div>

        <datalist id="editMember-professions">
          {professions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        <div className="editMember__footer">
          <button type="button" className="editMember__btn editMember__btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="editMember__btn editMember__btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
