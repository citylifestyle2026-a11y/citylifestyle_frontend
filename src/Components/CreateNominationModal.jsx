import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { createNomination, getAllNominations } from "../redux/nomination/nominationThunk";
import { clearNominationState } from "../redux/nomination/nominationSlice";
import { getAllEditions } from "../redux/edition/editionThunk";
import "../assets/CSS/CreateNominationModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import {
  isValidMobileNumber,
  toLocalMobileNumber,
  LOCAL_MOBILE_ERROR_MESSAGE,
} from "../utilits/mobileNumber";

const CATEGORY_OPTIONS = [
  "HNI",
  "Entrepreneur",
  "Creator",
  "Business Leader",
  "Professional",
  "Artist",
  "Influencer",
  "Other",
];

const EMPTY_FORM = {
  editionId: "",
  fullName: "",
  mobile: "",
  email: "",
  companyName: "",
  designation: "",
  category: "Other",
  city: "",
  relationship: "Single",
  isVip: false,
  notes: "",
};

// PARV CRM — Phase 2: "Add Nomination" — a Coordinator submits a guest
// for the currently active PARV edition (doc section 4). No edit mode —
// a nomination is create-only in Phase 2 (review/approval is Phase 4).
// The backend does the exact-mobile Guest match/create (doc section 4,
// priority #1/#2) and reports back via `matchType` whether this linked
// to an existing master Guest or created a new one — surfaced here as
// the success toast so the coordinator immediately sees which happened.
export default function CreateNominationModal({
  onClose,
  currentPage = 1,
  rowsPerPage = 10,
}) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.nomination);
  const { editions, loading: editionsLoading } = useSelector((state) => state.edition);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearNominationState());
    // Only Active editions can be nominated into (doc section 4:
    // "Selects active PARV edition"). Fetched fresh every time the
    // modal opens so a just-activated edition shows up immediately.
    dispatch(getAllEditions({ status: "Active", limit: 100, sortBy: "editionNumber", sortOrder: "desc" }));
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.editionId) {
      errors.editionId = "Please select an edition.";
    }

    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required.";
    }

    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile Number is required.";
    } else if (!isValidMobileNumber(formData.mobile)) {
      errors.mobile = LOCAL_MOBILE_ERROR_MESSAGE;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    setFormErrors((prev) => ({
      ...prev,
      editionId: errors.editionId,
      fullName: errors.fullName,
      mobile: errors.mobile,
      email: errors.email,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!validate()) return;

    const payload = {
      editionId: formData.editionId,
      fullName: formData.fullName.trim(),
      mobile: toLocalMobileNumber(formData.mobile),
      email: formData.email.trim(),
      companyName: formData.companyName.trim(),
      designation: formData.designation.trim(),
      category: formData.category,
      city: formData.city.trim(),
      relationship: formData.relationship,
      isVip: formData.isVip,
      notes: formData.notes.trim(),
    };

    try {
      const res = await dispatch(createNomination(payload)).unwrap();

      const matchType = res?.data?.matchType;
      if (matchType === "Existing") {
        showSuccess("Nomination created — linked to an existing guest already in the master database.");
      } else {
        showSuccess(res?.message || "Nomination created successfully");
      }

      dispatch(getAllNominations({ page: currentPage, limit: rowsPerPage }));
      dispatch(clearNominationState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // The backend's "You have already nominated ... for this edition"
      // duplicate error (see nomination.service.js) is shown right
      // under the Edition field instead of only as a toast.
      if (typeof message === "string" && message.toLowerCase().includes("already nominated")) {
        setFormErrors((prev) => ({ ...prev, editionId: message }));
        return;
      }
      if (typeof message === "string" && message.toLowerCase().includes("mobile")) {
        setFormErrors((prev) => ({ ...prev, mobile: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="nominationModalOverlay" onClick={onClose}>
      <div className="createNominationModal" onClick={(e) => e.stopPropagation()}>
        <div className="nominationModalHeader">
          <h2 className="nominationModalTitle">Add Nomination</h2>
          <button
            type="button"
            className="nominationCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {error && error !== formErrors.mobile && error !== formErrors.editionId && (
          <p className="nominationFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="nominationFormGrid">
          <div className="nominationFieldGroup nominationFieldGroupFull">
            <label className="nominationFieldLabel">
              PARV Edition <span className="nominationRequired">*</span>
            </label>
            <select
              className="nominationFieldSelect"
              name="editionId"
              value={formData.editionId}
              onChange={handleChange}
              disabled={editionsLoading}
            >
              <option value="">
                {editionsLoading ? "Loading editions..." : "Select an edition"}
              </option>
              {editions.map((edition) => (
                <option key={edition._id} value={edition._id}>
                  {edition.name}
                </option>
              ))}
            </select>
            {!editionsLoading && editions.length === 0 && (
              <p className="nominationFieldError">No active edition available right now.</p>
            )}
            {formErrors.editionId && (
              <p className="nominationFieldError">{formErrors.editionId}</p>
            )}
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">
              Full Name <span className="nominationRequired">*</span>
            </label>
            <input
              type="text"
              className="nominationFieldInput"
              placeholder="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && <p className="nominationFieldError">{formErrors.fullName}</p>}
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">
              Mobile Number <span className="nominationRequired">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              className="nominationFieldInput"
              placeholder="Mobile Number (91 optional)"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
            {formErrors.mobile && <p className="nominationFieldError">{formErrors.mobile}</p>}
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">Email</label>
            <input
              type="text"
              className="nominationFieldInput"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            {formErrors.email && <p className="nominationFieldError">{formErrors.email}</p>}
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">City / Area</label>
            <input
              type="text"
              className="nominationFieldInput"
              placeholder="City / Area"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">Company</label>
            <input
              type="text"
              className="nominationFieldInput"
              placeholder="Company"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">Designation</label>
            <input
              type="text"
              className="nominationFieldInput"
              placeholder="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            />
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">Category</label>
            <select
              className="nominationFieldSelect"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="nominationFieldGroup">
            <label className="nominationFieldLabel">Relationship</label>
            <select
              className="nominationFieldSelect"
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
            >
              <option value="Single">Single</option>
              <option value="Couple">Couple</option>
            </select>
          </div>

          <div className="nominationFieldGroup nominationFieldGroupCheckbox">
            <label className="nominationCheckboxLabel">
              <input
                type="checkbox"
                name="isVip"
                checked={formData.isVip}
                onChange={handleChange}
              />
              VIP Guest
            </label>
          </div>

          <div className="nominationFieldGroup nominationFieldGroupFull">
            <label className="nominationFieldLabel">Notes</label>
            <textarea
              className="nominationFieldTextarea"
              placeholder="Any remarks for this nomination"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="nominationModalFooter">
          <button
            type="button"
            className="nominationModalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="nominationModalCreateButton"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
