import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { createContact, updateContact, getAllContacts, getUniqueReferences, getReferenceSummary } from "../redux/contact/contactThunk";
import { clearContactState } from "../redux/contact/contactSlice";
import "../assets/CSS/CreateContactModal.css";
import { showError, showSuccess } from "../utilits/toast";

// Same "10 digit mobile number" convention already used by
// CreateUserModal.jsx/EditAdminModal.jsx's `mobile` field — the backend's
// own check (express-validator's isMobilePhone("en-IN")) is a little more
// permissive (e.g. accepts a +91 prefix), but this keeps the frontend's
// field-level message consistent with every other form in the project
// rather than introducing a different rule just for this one field.
const isValidWhatsappNumber = (value) => /^\d{10}$/.test(value.trim());

const EMPTY_FORM = {
  fullName: "",
  whatsappNumber: "",
  companyName: "",
  address: "",
  companyCategory: "",
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
        address: editContactData.address || "",
        // companyCategory arrives populated as { _id, name } (see
        // contact.service.js's .populate("companyCategory", "name")) —
        // the <select> below needs the bare id.
        companyCategory: editContactData.companyCategory?._id || "",
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
    }));
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

  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required.";
    }

    if (!formData.whatsappNumber.trim()) {
      errors.whatsappNumber = "WhatsApp Number is required.";
    } else if (!isValidWhatsappNumber(formData.whatsappNumber)) {
      errors.whatsappNumber = "Enter a valid 10-digit WhatsApp number.";
    }

    setFormErrors((prev) => ({
      ...prev,
      fullName: errors.fullName,
      whatsappNumber: errors.whatsappNumber,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    const payload = {
      fullName: formData.fullName.trim(),
      whatsappNumber: formData.whatsappNumber.trim(),
      companyName: formData.companyName.trim(),
      address: formData.address.trim(),
      references: resolvePendingReferences(),
      companyCategory: formData.companyCategory || null,
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
      const message =
        err?.message ||
        err?.response?.data?.message ||
        (typeof err === "string" ? err : "Something went wrong");

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
        <div className="modalHeader">
          <h2 className="modalTitle">
            {isEditMode ? "Edit Contact" : "Create Contact"}
          </h2>
          <button
            type="button"
            className="closeIconButton"
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
          <p className="fieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="formGrid">
          <div className="fieldGroup">
            <label className="fieldLabel">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && <p className="fieldError">{formErrors.fullName}</p>}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">
              WhatsApp Number <span className="required">*</span>
            </label>
            <input
              type="text"
              className="fieldInput"
              placeholder="WhatsApp Number"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
            />
            {formErrors.whatsappNumber && (
              <p className="fieldError">{formErrors.whatsappNumber}</p>
            )}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">Company Name</label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
            {formErrors.companyName && (
              <p className="fieldError">{formErrors.companyName}</p>
            )}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">Company Category</label>
            <select
              className="fieldSelect"
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
              <p className="fieldError">{formErrors.companyCategory}</p>
            )}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel">Address</label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
            {formErrors.address && <p className="fieldError">{formErrors.address}</p>}
          </div>

          <div className="fieldGroup fieldGroupFull">
            <label className="fieldLabel">Reference</label>
            <div className="referenceInputRow">
              <input
                type="text"
                className="fieldInput"
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
              <p className="fieldError">{formErrors.references}</p>
            )}
          </div>
        </div>

        <div className="modalFooter">
          <button
            type="button"
            className="modalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="modalCreateButton"
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