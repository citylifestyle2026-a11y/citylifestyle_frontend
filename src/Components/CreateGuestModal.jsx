import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { createGuest, updateGuest, getAllGuests } from "../redux/guest/guestThunk";
import { clearGuestState } from "../redux/guest/guestSlice";
import "../assets/CSS/CreateGuestModal.css";
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

// PARV CRM — Phase 1 Guest create/edit modal. Follows the same
// create/edit-in-one-modal pattern as CreateContactModal.jsx /
// CreateUserModal.jsx.
export default function CreateGuestModal({
  onClose,
  isEditMode = false,
  editGuestData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  categoryFilter = "",
}) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.guest);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearGuestState());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editGuestData) {
      setFormData({
        fullName: editGuestData.fullName || "",
        mobile: editGuestData.mobile || "",
        email: editGuestData.email || "",
        companyName: editGuestData.companyName || "",
        designation: editGuestData.designation || "",
        category: editGuestData.category || "Other",
        city: editGuestData.city || "",
        relationship: editGuestData.relationship || "Single",
        isVip: !!editGuestData.isVip,
        notes: editGuestData.notes || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormErrors({});
  }, [isEditMode, editGuestData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Only Full Name + Mobile are compulsory (mirrors
  // guest.validator.js — everything else is `optional()` there).
  const validate = () => {
    const errors = {};

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
      fullName: errors.fullName,
      mobile: errors.mobile,
      email: errors.email,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    const payload = {
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
      if (isEditMode) {
        const res = await dispatch(
          updateGuest({ id: editGuestData._id, data: payload })
        ).unwrap();

        showSuccess(res?.message || "Guest updated successfully");
      } else {
        const res = await dispatch(createGuest(payload)).unwrap();

        showSuccess(res?.message || "Guest created successfully");
      }

      // Refetch using the list's actual current page/limit/search/sort/
      // filters, same reasoning as CreateContactModal.jsx's post-save
      // refetch.
      const params = { page: currentPage, limit: rowsPerPage, search, sortBy, sortOrder };
      if (categoryFilter) params.category = categoryFilter;

      dispatch(getAllGuests(params));
      dispatch(clearGuestState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // The backend's "A guest with this mobile number already exists"
      // error (see guest.service.js) is shown right under the Mobile
      // field instead of only as a toast.
      if (typeof message === "string" && message.toLowerCase().includes("mobile")) {
        setFormErrors((prev) => ({ ...prev, mobile: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="guestModalOverlay" onClick={onClose}>
      <div className="createGuestModal" onClick={(e) => e.stopPropagation()}>
        <div className="guestModalHeader">
          <h2 className="guestModalTitle">{isEditMode ? "Edit Guest" : "Add Guest"}</h2>
          <button
            type="button"
            className="guestCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {error && error !== formErrors.mobile && (
          <p className="guestFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="guestFormGrid">
          <div className="guestFieldGroup">
            <label className="guestFieldLabel">
              Full Name <span className="guestRequired">*</span>
            </label>
            <input
              type="text"
              className="guestFieldInput"
              placeholder="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && <p className="guestFieldError">{formErrors.fullName}</p>}
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">
              Mobile Number <span className="guestRequired">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              className="guestFieldInput"
              placeholder="Mobile Number (91 optional)"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
            {formErrors.mobile && <p className="guestFieldError">{formErrors.mobile}</p>}
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">Email</label>
            <input
              type="text"
              className="guestFieldInput"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            {formErrors.email && <p className="guestFieldError">{formErrors.email}</p>}
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">City / Area</label>
            <input
              type="text"
              className="guestFieldInput"
              placeholder="City / Area"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">Company</label>
            <input
              type="text"
              className="guestFieldInput"
              placeholder="Company"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">Designation</label>
            <input
              type="text"
              className="guestFieldInput"
              placeholder="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            />
          </div>

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">Category</label>
            <select
              className="guestFieldSelect"
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

          <div className="guestFieldGroup">
            <label className="guestFieldLabel">Relationship</label>
            <select
              className="guestFieldSelect"
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
            >
              <option value="Single">Single</option>
              <option value="Couple">Couple</option>
            </select>
          </div>

          <div className="guestFieldGroup guestFieldGroupCheckbox">
            <label className="guestCheckboxLabel">
              <input
                type="checkbox"
                name="isVip"
                checked={formData.isVip}
                onChange={handleChange}
              />
              VIP Guest
            </label>
          </div>

          <div className="guestFieldGroup guestFieldGroupFull">
            <label className="guestFieldLabel">Notes</label>
            <textarea
              className="guestFieldTextarea"
              placeholder="Admin/coordinator remarks"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="guestModalFooter">
          <button
            type="button"
            className="guestModalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="guestModalCreateButton"
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
