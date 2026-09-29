import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { createContact, updateContact, getAllContacts, getUniqueReferences, getReferenceSummary } from "../redux/contact/contactThunk";
import { clearContactState } from "../redux/contact/contactSlice";
import "../assets/CSS/CreateContactModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import {
  isValidMobileNumber,
  toLocalMobileNumber,
} from "../utilits/mobileNumber";

// Same mobile rule as CreateUserModal.jsx/EditAdminModal.jsx's `mobile`
// field: 10 digits, with or without 91 / +91 in front (see
// utilits/mobileNumber.js). The number is always sent as 10 digits.
const isValidWhatsappNumber = (value) => isValidMobileNumber(value);

const EMPTY_FORM = {
  fullName: "",
  whatsappNumber: "",
  companyName: "",
  designation: "",
  address: "",
  companyCategory: "",
  relationship: "",
  spouseName: "",
  spouseMobile: "",
  profession: "",
  professionCategory: "",
};

export default function CreateContactModal({
  onClose,
  isEditMode = false,
  editContactData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  companyCategoryFilter = "",
  referenceFilter = "",
}) {
  const dispatch = useDispatch();

  const { loading, error } = useSelector((state) => state.contact);
  const { companyCategories } = useSelector((state) => state.companyCategory);

  const [formData, setFormData] = useState(EMPTY_FORM);

  // References are edited as a working list plus a separate "next value"
  // input — same separation as searchTerm/search elsewhere in the
  // project, just for a different purpose (staging one value before it's
  // committed to the list, instead of debouncing).
  const [references, setReferences] = useState([]);
  const [referenceInput, setReferenceInput] = useState("");

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearContactState());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editContactData) {
      setFormData({
        fullName: editContactData.fullName || "",
        whatsappNumber: editContactData.whatsappNumber || "",
        companyName: editContactData.companyName || "",
        designation: editContactData.designation || "",
        address: editContactData.address || "",
        // companyCategory arrives populated as { _id, name } (see
        // contact.service.js's .populate("companyCategory", "name")) —
        // the <select> below needs the bare id.
        companyCategory: editContactData.companyCategory?._id || "",
        relationship: editContactData.relationship || "",
        spouseName: editContactData.spouseName || "",
        spouseMobile: editContactData.spouseMobile || "",
        profession: editContactData.profession || "",
        // populated as { _id, name } by contact.service.js
        professionCategory: editContactData.professionCategory?._id || "",
      });

      setReferences(
        Array.isArray(editContactData.references)
          ? editContactData.references
          : []
      );
    } else {
      setFormData(EMPTY_FORM);
      setReferences([]);
    }

    setReferenceInput("");
    setFormErrors({});
  }, [isEditMode, editContactData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Typing in Profession by hand drops a previously picked category
      // unless the text still equals that category's name exactly.
      ...(name === "profession"
        ? {
            professionCategory: (() => {
              const match = (companyCategories || []).find(
                (cat) =>
                  String(cat.name || "").trim().toLowerCase() ===
                  value.trim().toLowerCase()
              );
              return match ? match._id : "";
            })(),
          }
        : {}),
    }));
  };

  // ---- Profession <-> Company Category (Couple only) ----
  // As soon as anything is typed in the spouse's Profession (C.A, CA,
  // Doctor ...), a Category dropdown appears beside it. Picking a
  // category from the COMPANY CATEGORY list (e.g. "Chartered
  // Accountant") replaces the profession text with that category's
  // exact name, so the saved profession always matches the master list.
  // The category is COMPULSORY for Couple: it is what makes the contact
  // also show under the spouse's category in the Contact List.
  const showProfessionCategory = formData.profession.trim() !== "";

  const handleProfessionCategoryChange = (e) => {
    const category = (companyCategories || []).find(
      (c) => c._id === e.target.value
    );
    if (!category) return;
    setFormData((prev) => ({
      ...prev,
      profession: category.name,
      professionCategory: category._id,
    }));
    setFormErrors((prev) => ({
      ...prev,
      profession: undefined,
      professionCategory: undefined,
    }));
  };

  // Relationship gets its own handler (instead of the generic
  // handleChange above) purely to add ONE extra behavior on top of it:
  // switching FROM "Couple" TO "Single" clears spouseName/spouseMobile/
  // profession — those fields are about to be hidden, and a value left
  // sitting in state for a hidden field would otherwise still get sent
  // on submit (see the payload in handleSubmit below). Their inline
  // errors are cleared at the same time so a stale "required" message
  // doesn't reappear if the admin flips back to Couple later without
  // having retyped anything yet.
  const handleRelationshipChange = (e) => {
    const { value } = e.target;

    setFormData((prev) => ({
      ...prev,
      relationship: value,
      ...(value !== "Couple"
        ? { spouseName: "", spouseMobile: "", profession: "", professionCategory: "" }
        : {}),
    }));

    if (value !== "Couple") {
      setFormErrors((prev) => ({
        ...prev,
        spouseName: undefined,
        spouseMobile: undefined,
        profession: undefined,
        professionCategory: undefined,
      }));
    }
  };

  // Adds the staged reference input to the working list. Trimmed and
  // de-duplicated CASE-INSENSITIVELY against the list already on screen —
  // the same rule the backend's own pre-save/pre-findOneAndUpdate hooks
  // enforce (see models/contact.model.js's normalizeReferences), applied
  // here too so the duplicate is rejected with an inline message instead
  // of silently vanishing after the backend normalizes it away.
  const handleAddReference = () => {
    const trimmed = referenceInput.trim();

    if (!trimmed) return;

    const isDuplicate = references.some(
      (reference) => reference.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setFormErrors((prev) => ({
        ...prev,
        references: "This reference has already been added.",
      }));
      return;
    }

    setReferences((prev) => [...prev, trimmed]);
    setReferenceInput("");
    setFormErrors((prev) => ({ ...prev, references: undefined }));
  };

  const handleReferenceKeyDown = (e) => {
    // Enter adds the reference instead of submitting the whole form —
    // matches the "Enter shouldn't submit" guard CommonSearch integrations
    // already use for the main search box elsewhere in the project.
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddReference();
    }
  };

  const handleRemoveReference = (index) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  // If the admin typed a reference but forgot to press "Add" before
  // submitting, don't silently lose it — but only when it's a single,
  // unambiguous value. A comma-separated group of names typed into the
  // same box and left un-added (e.g. "dev, karan") is NOT auto-split
  // and added, since that's guessing at intent; the admin must press
  // "Add" for each one individually, same as any other reference.
  const resolvePendingReferences = () => {
    const trimmed = referenceInput.trim();
    if (!trimmed) return references;

    const tokens = trimmed
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length !== 1) return references;

    const singleValue = tokens[0];
    const isDuplicate = references.some(
      (reference) => reference.toLowerCase() === singleValue.toLowerCase()
    );

    if (isDuplicate) return references;

    return [...references, singleValue];
  };

  // Every field is compulsory EXCEPT Address — mirrors the backend's
  // createContactValidation/updateContactValidation
  // (validators/contact.validator.js). `references` counts a
  // not-yet-"Add"ed value still sitting in the reference input box
  // (see resolvePendingReferences above), so the admin isn't blocked
  // just for not pressing "Add" before submitting.
  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required.";
    }

    if (!formData.whatsappNumber.trim()) {
      errors.whatsappNumber = "WhatsApp Number is required.";
    } else if (!isValidWhatsappNumber(formData.whatsappNumber)) {
      errors.whatsappNumber =
        "Enter a valid 10-digit WhatsApp number (with or without 91).";
    }

    if (!formData.companyName.trim()) {
      errors.companyName = "Company Name is required.";
    }

    if (!formData.designation.trim()) {
      errors.designation = "Designation is required.";
    }

    if (!formData.companyCategory) {
      errors.companyCategory = "Company Category is required.";
    }

    // Relationship is required outright, independent of everything
    // below — mirrors validators/contact.validator.js's `relationship`
    // rule. No gender is inferred from this value anywhere in this
    // form.
    if (!formData.relationship) {
      errors.relationship = "Relationship is required.";
    }

    // Couple-only required fields — same conditional rule as the
    // backend's contact.validator.js (spouseName/spouseMobile/
    // profession are required for Couple, accepted blank for Single).
    // These fields are also hidden for Single (see the JSX below), so
    // in practice they can only be non-empty here if relationship is
    // currently Couple, or the admin just switched away from Couple —
    // handleRelationshipChange already clears them in that case.
    if (formData.relationship === "Couple") {
      if (!formData.spouseName.trim()) {
        errors.spouseName = "Spouse Name is required for Couple.";
      }

      if (!formData.spouseMobile.trim()) {
        errors.spouseMobile = "Spouse Mobile Number is required for Couple.";
      } else if (!isValidWhatsappNumber(formData.spouseMobile)) {
        errors.spouseMobile =
          "Enter a valid 10-digit Spouse Mobile Number (with or without 91).";
      }

      if (!formData.profession.trim()) {
        errors.profession = "Profession is required for Couple.";
      } else if (!formData.professionCategory) {
        errors.professionCategory = "Category is required for Couple.";
      }
    }

    if (resolvePendingReferences().length === 0) {
      errors.references = "At least one Reference is required.";
    }

    setFormErrors((prev) => ({
      ...prev,
      fullName: errors.fullName,
      whatsappNumber: errors.whatsappNumber,
      companyName: errors.companyName,
      designation: errors.designation,
      companyCategory: errors.companyCategory,
      relationship: errors.relationship,
      spouseName: errors.spouseName,
      spouseMobile: errors.spouseMobile,
      profession: errors.profession,
      professionCategory: errors.professionCategory,
      references: errors.references,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    const payload = {
      fullName: formData.fullName.trim(),
      whatsappNumber: toLocalMobileNumber(formData.whatsappNumber),
      companyName: formData.companyName.trim(),
      designation: formData.designation.trim(),
      address: formData.address.trim(),
      references: resolvePendingReferences(),
      companyCategory: formData.companyCategory || null,
      relationship: formData.relationship,
      // Blank for Single (handleRelationshipChange already clears these
      // when switching away from Couple, and they're hidden in the JSX
      // below), populated for Couple. spouseMobile is normalized with
      // the exact same toLocalMobileNumber used for whatsappNumber
      // above, so it's stored in the same 10-digit form.
      spouseName: formData.spouseName.trim(),
      spouseMobile: formData.spouseMobile.trim()
        ? toLocalMobileNumber(formData.spouseMobile)
        : "",
      profession: formData.profession.trim(),
      professionCategory:
        formData.relationship === "Couple" ? formData.professionCategory || null : null,
    };

    try {
      if (isEditMode) {
        const res = await dispatch(
          updateContact({ id: editContactData._id, data: payload })
        ).unwrap();

        showSuccess(res?.message || "Contact updated successfully");
      } else {
        const res = await dispatch(createContact(payload)).unwrap();

        showSuccess(res?.message || "Contact created successfully");
      }

      // Refetch using the list's actual current page/limit/search/sort/
      // filters — same reasoning as CreateUserModal.jsx's post-save
      // refetch, so the change is visible immediately without relying on
      // some unrelated state change to re-trigger ContactList's own fetch
      // effect.
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        search,
        sortBy,
        sortOrder,
      };

      if (companyCategoryFilter) params.companyCategory = companyCategoryFilter;
      if (referenceFilter) params.reference = referenceFilter;

      dispatch(getAllContacts(params));

      // A newly added reference (or the last contact holding a removed
      // one) can change which values are valid filter options — refresh
      // the dropdown's source so it never offers a stale/missing value.
      dispatch(getUniqueReferences({}));

      // Same reasoning for the grouped Reference Summary section below
      // the Contact List table — a new/edited contact's references (and
      // which contact names appear under each one) must stay in sync.
      dispatch(getReferenceSummary());

      dispatch(clearContactState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // Field-specific backend errors are shown directly below their
      // related input instead of as a toast — matches
      // contact.service.js's assertWhatsappNumberNotDuplicate message
      // ("WhatsApp Number already exists"). Any other error keeps the
      // existing toast behavior unchanged.
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("whatsapp")
      ) {
        setFormErrors((prev) => ({ ...prev, whatsappNumber: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="contactModalOverlay" onClick={onClose}>
      <div className="createContactModal" onClick={(e) => e.stopPropagation()}>
        <div className="contactModalHeader">
          <h2 className="contactModalTitle">
            {isEditMode ? "Edit Contact" : "Create Contact"}
          </h2>
          <button
            type="button"
            className="contactCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Suppressed when the same message is already shown below the
            WhatsApp Number field below, so a duplicate error (e.g.
            "WhatsApp Number already exists") isn't shown twice. */}
        {error && error !== formErrors.whatsappNumber && (
          <p className="contactFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="contactFormGrid">
          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Full Name <span className="contactRequired">*</span>
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && <p className="contactFieldError">{formErrors.fullName}</p>}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              WhatsApp Number <span className="contactRequired">*</span>
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="WhatsApp Number (91 optional)"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
            />
            {formErrors.whatsappNumber && (
              <p className="contactFieldError">{formErrors.whatsappNumber}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Company Name <span className="contactRequired">*</span>
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
            {formErrors.companyName && (
              <p className="contactFieldError">{formErrors.companyName}</p>
            )}
          </div>

          <div className="contactFieldGroup">
            <label className="contactFieldLabel">
              Designation <span className="contactRequired">*</span>
            </label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            />
            {formErrors.designation && (
              <p className="contactFieldError">{formErrors.designation}</p>
            )}
          </div>

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Company Category <span className="contactRequired">*</span>
            </label>
            <select
              className="contactFieldSelect"
              name="companyCategory"
              value={formData.companyCategory}
              onChange={handleChange}
            >
              <option value="">No category</option>
              {(companyCategories || []).map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {formErrors.companyCategory && (
              <p className="contactFieldError">{formErrors.companyCategory}</p>
            )}
          </div>

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">Address</label>
            <input
              type="text"
              className="contactFieldInput"
              placeholder="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
            {formErrors.address && <p className="contactFieldError">{formErrors.address}</p>}
          </div>

          <div className="contactFieldGroup contactFieldGroupFull">
            <label className="contactFieldLabel">
              Relationship <span className="contactRequired">*</span>
            </label>
            <select
              className="contactFieldSelect"
              name="relationship"
              value={formData.relationship}
              onChange={handleRelationshipChange}
            >
              <option value="">Select Relationship</option>
              <option value="Single">Single</option>
              <option value="Couple">Couple</option>
            </select>
            {formErrors.relationship && (
              <p className="contactFieldError">{formErrors.relationship}</p>
            )}
          </div>

          {/* Spouse Name / Spouse Mobile Number / Profession are only
              shown/collected for Couple — hidden entirely for Single,
              and their values are already cleared by
              handleRelationshipChange the moment Couple -> Single
              happens, so nothing hidden here is ever silently submitted. */}
          {formData.relationship === "Couple" && (
            <>
              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Name <span className="contactRequired">*</span>
                </label>
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="Spouse Name"
                  name="spouseName"
                  value={formData.spouseName}
                  onChange={handleChange}
                />
                {formErrors.spouseName && (
                  <p className="contactFieldError">{formErrors.spouseName}</p>
                )}
              </div>

              <div className="contactFieldGroup">
                <label className="contactFieldLabel">
                  Spouse Mobile Number <span className="contactRequired">*</span>
                </label>
                <input
                  type="text"
                  className="contactFieldInput"
                  placeholder="Spouse Mobile Number (91 optional)"
                  name="spouseMobile"
                  value={formData.spouseMobile}
                  onChange={handleChange}
                />
                {formErrors.spouseMobile && (
                  <p className="contactFieldError">{formErrors.spouseMobile}</p>
                )}
              </div>

              <div className="contactFieldGroup contactFieldGroupFull">
                <label className="contactFieldLabel">
                  Profession / Occupation &amp; Category <span className="contactRequired">*</span>
                </label>
                <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
                  <input
                    type="text"
                    className="contactFieldInput"
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Profession / Occupation"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                  />
                  {showProfessionCategory && (
                    <select
                      className="contactFieldSelect"
                      style={{ flex: 1, minWidth: 0 }}
                      aria-label="Profession category"
                      value={formData.professionCategory || ""}
                      onChange={handleProfessionCategoryChange}
                    >
                      <option value="">Select Category</option>
                      {(companyCategories || []).map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {formErrors.profession && (
                  <p className="contactFieldError">{formErrors.profession}</p>
                )}
                {formErrors.professionCategory && (
                  <p className="contactFieldError">{formErrors.professionCategory}</p>
                )}
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
                onKeyDown={handleReferenceKeyDown}
              />
              <button
                type="button"
                className="referenceAddButton"
                onClick={handleAddReference}
              >
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
                      onClick={() => handleRemoveReference(index)}
                      aria-label={`Remove reference ${reference}`}
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {formErrors.references && (
              <p className="contactFieldError">{formErrors.references}</p>
            )}
          </div>
        </div>

        <div className="contactModalFooter">
          <button
            type="button"
            className="contactModalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="contactModalCreateButton"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : isEditMode ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}