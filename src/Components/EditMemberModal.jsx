import { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

import { createMemberApi, updateMemberApi } from "../services/memberService";
import { getAllCompanyCategoriesApi } from "../services/companyCategoryService";
import { getErrorText } from "../utilits/apiError";
import { showError, showSuccess } from "../utilits/toast";
import { getInstagramUrl, instagramLinkError } from "../utilits/instagram";
import { newReferencesFrom } from "../utilits/references";
import ContactPhotoPicker from "./ContactPhotoPicker";
// Same look as Create Contact (Guest List) and the other pages' popups.
import "../assets/CSS/CreateContactModal.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_OPTIONS = ["Active", "Inactive"];

// Same image rules as the Guest List (Create Contact) photos.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const EMPTY_PHOTO = { file: null, preview: "", remove: false };

const normalizeStatus = (value) =>
  String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active";

/**
 * Add a contact (Contact Book -> Add Contact) or, when `member` is passed,
 * edit one (Contact Book -> Action -> Edit).
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
    area: member.area || "",
    city: member.city || "",
    state: member.state || "",
    source: member.source || "",
    remark: member.remark || "",
    memberStatus: normalizeStatus(member.memberStatus),
    // Same extra details as the Guest List.
    designation: member.designation || "",
    address: member.address || "",
    instagramId: getInstagramUrl(member.instagramId),
    relationship: member.relationship === "Couple" ? "Couple" : "Single",
    spouseName: member.spouseName || "",
    spouseMobile: member.spouseMobile || "",
    spouseInstagramId: getInstagramUrl(member.spouseInstagramId),
    spouseProfession: member.spouseProfession || "",
  });
  // Photo state: `file` = newly picked (not uploaded yet), `preview` = what
  // the circle shows, `remove` = Remove pressed on a SAVED photo.
  const [profilePhoto, setProfilePhoto] = useState({
    file: null,
    preview: member.profileImage || "",
    remove: false,
  });
  const [spousePhoto, setSpousePhoto] = useState({
    file: null,
    preview: member.spouseProfileImage || "",
    remove: false,
  });
  const profilePhotoRef = useRef(profilePhoto);
  const spousePhotoRef = useRef(spousePhoto);
  profilePhotoRef.current = profilePhoto;
  spousePhotoRef.current = spousePhoto;

  const releasePreview = (photo) => {
    if (photo?.file && photo.preview) URL.revokeObjectURL(photo.preview);
  };

  useEffect(() => {
    return () => {
      releasePreview(profilePhotoRef.current);
      releasePreview(spousePhotoRef.current);
    };
  }, []);

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
  const optionsWith = (currentValue) => {
    const names = categories.map((c) => c.name).filter(Boolean);
    const current = String(currentValue || "").trim();
    if (current && !names.some((n) => n.toLowerCase() === current.toLowerCase())) {
      names.unshift(current);
    }
    return names;
  };
  const professionOptions = optionsWith(form.profession);
  const spouseProfessionOptions = optionsWith(form.spouseProfession);

  // kind = "profile" | "spouse"
  const pickPhoto = (kind, file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showError("Only PNG, JPG, JPEG and WEBP files are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError("Image size should be less than 100MB.");
      return;
    }
    const setter = kind === "spouse" ? setSpousePhoto : setProfilePhoto;
    const current = kind === "spouse" ? spousePhotoRef.current : profilePhotoRef.current;
    releasePreview(current);
    setter({ file, preview: URL.createObjectURL(file), remove: false });
  };

  const removePhoto = (kind) => {
    const setter = kind === "spouse" ? setSpousePhoto : setProfilePhoto;
    const current = kind === "spouse" ? spousePhotoRef.current : profilePhotoRef.current;
    const saved = kind === "spouse" ? member.spouseProfileImage : member.profileImage;
    releasePreview(current);
    setter({ file: null, preview: "", remove: Boolean(isEdit && saved) });
  };

  const setField = (key) => (e) => {
    const value = key === "mobile" || key === "spouseMobile" ? e.target.value.replace(/[^\d+\s]/g, "") : e.target.value;
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Single = no spouse details.
      ...(key === "relationship" && value !== "Couple"
        ? { spouseName: "", spouseMobile: "", spouseInstagramId: "", spouseProfession: "" }
        : {}),
    }));
    if (key === "relationship" && value !== "Couple") {
      // Spouse photo goes away with the rest of the spouse details.
      releasePreview(spousePhotoRef.current);
      setSpousePhoto({
        file: null,
        preview: "",
        remove: Boolean(isEdit && member.spouseProfileImage),
      });
    }
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // ---- References (chips, same as Create Contact) ----
  const addReference = () => {
    const text = referenceInput.trim();
    if (!text) return;

    // "Ramesh & Suresh" / "Ramesh/Suresh" / "Ramesh-Suresh" = two references.
    const fresh = newReferencesFrom(text, references);
    if (fresh.length === 0) {
      setErrors((prev) => ({ ...prev, references: "This reference has already been added." }));
      return;
    }

    setReferences((prev) => [...prev, ...fresh]);
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
    const fresh = newReferencesFrom(referenceInput, references);
    return fresh.length === 0 ? references : [...references, ...fresh];
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Full Name is required.";

    const digits = form.mobile.replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!form.mobile.trim()) next.mobile = "WhatsApp Number is required.";
    else if (!/^[6-9]\d{9}$/.test(local)) next.mobile = "Enter a valid 10-digit mobile number.";

    if (!form.companyName.trim()) next.companyName = "Company Name is required.";
    if (!form.profession.trim()) next.profession = "Company Category is required.";
    if (finalReferences().length === 0) next.references = "At least one Reference is required.";

    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      next.email = "Enter a valid email.";
    }

    const instagramError = instagramLinkError(form.instagramId);
    if (instagramError) next.instagramId = instagramError;

    if (form.relationship === "Couple") {
      if (form.spouseMobile.trim()) {
        const sDigits = form.spouseMobile.replace(/\D/g, "");
        const sLocal = sDigits.length === 12 && sDigits.startsWith("91") ? sDigits.slice(2) : sDigits;
        if (!/^[6-9]\d{9}$/.test(sLocal)) next.spouseMobile = "Enter a valid 10-digit mobile number.";
      }
      const spouseInstagramError = instagramLinkError(form.spouseInstagramId);
      if (spouseInstagramError) next.spouseInstagramId = spouseInstagramError;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (saving || !validate()) return;

    const isCouple = form.relationship === "Couple";
    const json = { ...form, references: finalReferences() };

    // Plain JSON when no photo was touched (works exactly as before);
    // multipart/form-data only when a photo is picked or removed.
    const photoTouched =
      profilePhoto.file || profilePhoto.remove || spousePhoto.file || spousePhoto.remove;
    let payload = json;

    if (photoTouched) {
      payload = new FormData();
      Object.entries(json).forEach(([key, value]) =>
        payload.append(key, key === "references" ? JSON.stringify(value) : value)
      );
      if (profilePhoto.file) payload.append("profileImage", profilePhoto.file);
      else if (profilePhoto.remove) payload.append("removeProfileImage", "true");

      if (isCouple) {
        if (spousePhoto.file) payload.append("spouseProfileImage", spousePhoto.file);
        else if (spousePhoto.remove) payload.append("removeSpouseProfileImage", "true");
      } else if (spousePhoto.remove) {
        payload.append("removeSpouseProfileImage", "true");
      }
    }

    setSaving(true);
    try {
      const res = isEdit
        ? await updateMemberApi(member._id, payload)
        : await createMemberApi(payload);
      showSuccess(res?.message || (isEdit ? "Contact updated successfully" : "Contact added successfully"));
      onSaved?.(res?.data);
      onClose();
    } catch (err) {
      const message = getErrorText(err, isEdit ? "Failed to update contact" : "Failed to add contact");

      // A mobile problem is shown under the Mobile field, like Create Contact.
      if (typeof message === "string" && /mobile|whatsapp/i.test(message)) {
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
          <h2 className="contactModalTitle">{isEdit ? "Edit Contact" : "Add Contact"}</h2>
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
          {/* Same order and names as Guest List -> Create Contact. */}
          {field("name", "Full Name", { required: true })}
          {field("mobile", "WhatsApp Number", {
            required: true,
            inputMode: "tel",
            maxLength: 16,
            placeholder: "WhatsApp Number (91 optional)",
          })}
          {field("companyName", "Company Name", { required: true })}
          {field("designation", "Designation")}
          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel" htmlFor="member-profession">
              Company Category <span className="contactRequired">*</span>
            </label>
            <select
              id="member-profession"
              className="contactFieldSelect"
              value={form.profession}
              onChange={setField("profession")}
              disabled={categoriesLoading}
            >
              <option value="" disabled>
                {categoriesLoading ? "Loading categories..." : "Select Category"}
              </option>
              {professionOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {errors.profession && <p className="contactFieldError">{errors.profession}</p>}
          </div>
          {field("address", "Address")}
          {field("area", "Area")}
          {field("instagramId", "Instagram Link", { placeholder: "https://instagram.com/username" })}

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">Profile Photo</label>
            <ContactPhotoPicker
              label="Profile photo"
              preview={profilePhoto.preview}
              onPick={(file) => pickPhoto("profile", file)}
              onRemove={() => removePhoto("profile")}
              disabled={saving}
            />
          </div>

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel" htmlFor="member-relationship">
              Relationship
            </label>
            <select
              id="member-relationship"
              className="contactFieldSelect"
              value={form.relationship}
              onChange={setField("relationship")}
            >
              <option value="Single">Single</option>
              <option value="Couple">Couple</option>
            </select>
          </div>

          {form.relationship === "Couple" && (
            <>
              {field("spouseName", "Spouse Name")}
              {field("spouseMobile", "Spouse Mobile Number", {
                inputMode: "tel",
                maxLength: 16,
                placeholder: "Spouse Mobile Number (91 optional)",
              })}
              {field("spouseInstagramId", "Spouse Instagram Link", {
                placeholder: "https://instagram.com/username",
              })}

              <div className="contactFieldGroup">
                <label className="contactFieldLabel">Spouse Profile Photo</label>
                <ContactPhotoPicker
                  label="Spouse profile photo"
                  preview={spousePhoto.preview}
                  onPick={(file) => pickPhoto("spouse", file)}
                  onRemove={() => removePhoto("spouse")}
                  disabled={saving}
                />
              </div>

              <div className="contactFieldGroup contactFieldGroupFull">
                <label className="contactFieldLabel" htmlFor="member-spouseProfession">
                  Spouse Category
                </label>
                <select
                  id="member-spouseProfession"
                  className="contactFieldSelect"
                  value={form.spouseProfession}
                  onChange={setField("spouseProfession")}
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading ? "Loading categories..." : "Select Category"}
                  </option>
                  {spouseProfessionOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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

          {/* Not on the Guest List form: kept at the very end. */}
          {field("email", "Email", { placeholder: "name@example.com" })}
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
        </div>

        <div className="contactModalFooter">
          <button type="button" className="contactModalCloseButton" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="contactModalCreateButton" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </form>
    </div>
  );
}