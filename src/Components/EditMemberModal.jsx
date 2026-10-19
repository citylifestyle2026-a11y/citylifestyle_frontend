import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

import { createMemberApi, updateMemberApi } from "../services/memberService";
import { getAllCompanyCategoriesApi } from "../services/companyCategoryService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
// Same look as Create Contact (Guest List) and the other pages' popups.
import "../assets/CSS/CreateContactModal.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_OPTIONS = ["Active", "Inactive"];

const normalizeStatus = (value) =>
  String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active";

/**
 * Add a member (Member List -> Add Member) or, when `member` is passed,
 * edit one (Member List -> Action -> Edit).
 *
 * Required: Name, Mobile, Company / Brand, Profession, at least one Reference.
 * Status is a dropdown: Active / Inactive.
 * Profession is a dropdown of the Company Categories (Guest List -> Company
 * Category) — the same list the Guest List uses — so the two always match.
 * There is no "No category" option: Profession is required.
 * The modal loads the categories itself (all of them, A-Z), so it never
 * depends on whatever page/search the Company Category screen was left on.
 */
export default function EditMemberModal({ member = null, onClose, onSaved }) {
  const isEdit = Boolean(member?._id);
  member = member || {};

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
    source: member.source || "",
    remark: member.remark || "",
    memberStatus: normalizeStatus(member.memberStatus),
  });
  const [references, setReferences] = useState(member.references || []);
  const [referenceInput, setReferenceInput] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Page behind the popup does not scroll (same as Create Contact).
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Profession options = every Company Category name.
  useEffect(() => {
    let cancelled = false;

    getAllCompanyCategoriesApi({ page: 1, limit: 1000, sortBy: "name", sortOrder: "asc" })
      .then((res) => {
        if (!cancelled) setCategories(res?.data || []);
      })
      .catch((err) => {
        if (!cancelled) showError(getErrorText(err, "Unable to load professions. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // An older member may hold a profession that is not (or no longer) a
  // Company Category. Keep it selectable so editing never silently drops it.
  const professionOptions = (() => {
    const names = categories.map((c) => c.name).filter(Boolean);
    const current = form.profession.trim();
    if (current && !names.some((n) => n.toLowerCase() === current.toLowerCase())) {
      names.unshift(current);
    }
    return names;
  })();

  const setField = (key) => (e) => {
    const value = key === "mobile" ? e.target.value.replace(/[^\d+\s]/g, "") : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // ---- References (chips, same as Create Contact) ----
  const addReference = () => {
    const text = referenceInput.trim();
    if (!text) return;

    if (references.some((r) => r.toLowerCase() === text.toLowerCase())) {
      setErrors((prev) => ({ ...prev, references: "This reference has already been added." }));
      return;
    }

    setReferences((prev) => [...prev, text]);
    setReferenceInput("");
    setErrors((prev) => ({ ...prev, references: "" }));
  };

  const onReferenceKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addReference();
    }
  };

  const removeReference = (index) => setReferences((prev) => prev.filter((_, i) => i !== index));

  // A reference typed but not yet "Add"-ed is not lost on save.
  const finalReferences = () => {
    const text = referenceInput.trim();
    if (!text || references.some((r) => r.toLowerCase() === text.toLowerCase())) return references;
    return [...references, text];
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";

    const digits = form.mobile.replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!form.mobile.trim()) next.mobile = "Mobile is required.";
    else if (!/^[6-9]\d{9}$/.test(local)) next.mobile = "Enter a valid 10-digit mobile number.";

    if (!form.companyName.trim()) next.companyName = "Company / Brand is required.";
    if (!form.profession.trim()) next.profession = "Profession is required.";
    if (finalReferences().length === 0) next.references = "At least one Reference is required.";

    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      next.email = "Enter a valid email.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (saving || !validate()) return;

    const payload = { ...form, references: finalReferences() };

    setSaving(true);
    try {
      const res = isEdit
        ? await updateMemberApi(member._id, payload)
        : await createMemberApi(payload);
      showSuccess(res?.message || (isEdit ? "Member updated successfully" : "Member added successfully"));
      onSaved?.(res?.data);
      onClose();
    } catch (err) {
      const message = getErrorText(err, isEdit ? "Failed to update member" : "Failed to add member");

      // A mobile problem is shown under the Mobile field, like Create Contact.
      if (typeof message === "string" && message.toLowerCase().includes("mobile")) {
        setErrors((prev) => ({ ...prev, mobile: message }));
        return;
      }
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, extra = {}) => (
    <div className={`contactFieldGroup ${extra.wide ? "contactFieldGroupFull" : ""}`}>
      <label className="contactFieldLabel" htmlFor={`member-${key}`}>
        {label}
        {extra.required && <span className="contactRequired"> *</span>}
      </label>
      <input
        id={`member-${key}`}
        type="text"
        className="contactFieldInput"
        placeholder={extra.placeholder || label}
        value={form[key]}
        onChange={setField(key)}
        inputMode={extra.inputMode}
        maxLength={extra.maxLength}
      />
      {errors[key] && <p className="contactFieldError">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="contactModalOverlay" onClick={saving ? undefined : onClose}>
      <form
        className="createContactModal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        noValidate
      >
        <div className="contactModalHeader">
          <h2 className="contactModalTitle">{isEdit ? "Edit Member" : "Add Member"}</h2>
          <button
            type="button"
            className="contactCloseIconButton"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {isEdit && member.mobileStatus && member.mobileStatus !== "valid" && (
          <p className="contactFieldError" style={{ marginBottom: 14 }}>
            Imported with a problem: {member.importNote || "details need fixing"}. Correct the
            details and save to remove it from Needs Fix.
          </p>
        )}

        <div className="contactFormGrid">
          {field("name", "Name", { required: true })}
          {field("mobile", "Mobile", {
            required: true,
            inputMode: "tel",
            maxLength: 16,
            placeholder: "Mobile (91 optional)",
          })}
          {field("companyName", "Company / Brand", { required: true })}
          <div className="contactFieldGroup">
            <label className="contactFieldLabel" htmlFor="member-profession">
              Profession <span className="contactRequired">*</span>
            </label>
            <select
              id="member-profession"
              className="contactFieldSelect"
              value={form.profession}
              onChange={setField("profession")}
              disabled={categoriesLoading}
            >
              <option value="" disabled>
                {categoriesLoading ? "Loading professions..." : "Select Profession"}
              </option>
              {professionOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {errors.profession && <p className="contactFieldError">{errors.profession}</p>}
          </div>
          {field("email", "Email", { placeholder: "name@example.com" })}
          {field("objective", "Objective")}
          {field("area", "Area")}
          {field("city", "City")}
          {field("state", "State")}

          <div className="contactFieldGroup">
            <label className="contactFieldLabel" htmlFor="member-memberStatus">
              Status
            </label>
            <select
              id="member-memberStatus"
              className="contactFieldSelect"
              value={form.memberStatus}
              onChange={setField("memberStatus")}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {field("source", "Source")}
          {field("remark", "Remark", { wide: true })}

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Reference <span className="contactRequired">*</span>
            </label>
            <div className="referenceInputRow">
              <input
                type="text"
                className="contactFieldInput"
                placeholder="Type a reference and press Add"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                onKeyDown={onReferenceKeyDown}
              />
              <button type="button" className="referenceAddButton" onClick={addReference}>
                Add
              </button>
            </div>

            {references.length > 0 && (
              <div className="referenceChipList">
                {references.map((reference, index) => (
                  <span key={`${reference}-${index}`} className="referenceChip">
                    {reference}
                    <button
                      type="button"
                      className="referenceChipRemove"
                      onClick={() => removeReference(index)}
                      aria-label={`Remove reference ${reference}`}
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {errors.references && <p className="contactFieldError">{errors.references}</p>}
          </div>
        </div>

        <div className="contactModalFooter">
          <button type="button" className="contactModalCloseButton" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="contactModalCreateButton" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
