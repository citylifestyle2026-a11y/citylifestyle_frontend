import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { createEdition, updateEdition, getAllEditions } from "../redux/edition/editionThunk";
import { clearEditionState } from "../redux/edition/editionSlice";
import "../assets/CSS/CreateEditionModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

const STATUS_OPTIONS = ["Draft", "Active", "Closed", "Archived"];

const EMPTY_FORM = {
  name: "",
  editionNumber: "",
  year: "",
  eventDateTime: "",
  venue: "",
  guestCapacity: "",
  status: "Draft",
};

// PARV CRM — Phase 1 Edition create/edit modal. Same
// create/edit-in-one-modal pattern as CreateGuestModal.jsx.
export default function CreateEditionModal({
  onClose,
  isEditMode = false,
  editEditionData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
  sortBy = "editionNumber",
  sortOrder = "desc",
  statusFilter = "",
}) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.edition);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearEditionState());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editEditionData) {
      setFormData({
        name: editEditionData.name || "",
        editionNumber: editEditionData.editionNumber ?? "",
        year: editEditionData.year ?? "",
        // <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm", ISO
        // strings from the API have seconds/timezone, so trim to that.
        eventDateTime: editEditionData.eventDateTime
          ? new Date(editEditionData.eventDateTime).toISOString().slice(0, 16)
          : "",
        venue: editEditionData.venue || "",
        guestCapacity: editEditionData.guestCapacity ?? "",
        status: editEditionData.status || "Draft",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormErrors({});
  }, [isEditMode, editEditionData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Mirrors edition.validator.js: name/editionNumber/year required,
  // everything else optional.
  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Edition Name is required.";
    }

    if (!String(formData.editionNumber).trim()) {
      errors.editionNumber = "Edition Number is required.";
    } else if (!Number.isInteger(Number(formData.editionNumber)) || Number(formData.editionNumber) < 1) {
      errors.editionNumber = "Edition Number must be a positive whole number.";
    }

    if (!String(formData.year).trim()) {
      errors.year = "Year is required.";
    } else if (Number(formData.year) < 2000 || Number(formData.year) > 2100) {
      errors.year = "Year must be a valid year.";
    }

    if (
      formData.guestCapacity !== "" &&
      (!Number.isInteger(Number(formData.guestCapacity)) || Number(formData.guestCapacity) < 1)
    ) {
      errors.guestCapacity = "Guest Capacity must be a positive whole number.";
    }

    setFormErrors((prev) => ({
      ...prev,
      name: errors.name,
      editionNumber: errors.editionNumber,
      year: errors.year,
      guestCapacity: errors.guestCapacity,
    }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      editionNumber: Number(formData.editionNumber),
      year: Number(formData.year),
      eventDateTime: formData.eventDateTime
        ? new Date(formData.eventDateTime).toISOString()
        : null,
      venue: formData.venue.trim(),
      guestCapacity: formData.guestCapacity ? Number(formData.guestCapacity) : null,
      status: formData.status,
    };

    try {
      if (isEditMode) {
        const res = await dispatch(
          updateEdition({ id: editEditionData._id, data: payload })
        ).unwrap();

        showSuccess(res?.message || "Edition updated successfully");
      } else {
        const res = await dispatch(createEdition(payload)).unwrap();

        showSuccess(res?.message || "Edition created successfully");
      }

      const params = { page: currentPage, limit: rowsPerPage, search, sortBy, sortOrder };
      if (statusFilter) params.status = statusFilter;

      dispatch(getAllEditions(params));
      dispatch(clearEditionState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // The backend's "Edition number X already exists" error (see
      // edition.service.js) is shown right under the Edition Number
      // field instead of only as a toast.
      if (typeof message === "string" && message.toLowerCase().includes("edition number")) {
        setFormErrors((prev) => ({ ...prev, editionNumber: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="editionModalOverlay" onClick={onClose}>
      <div className="createEditionModal" onClick={(e) => e.stopPropagation()}>
        <div className="editionModalHeader">
          <h2 className="editionModalTitle">{isEditMode ? "Edit Edition" : "Add Edition"}</h2>
          <button
            type="button"
            className="editionCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {error && error !== formErrors.editionNumber && (
          <p className="editionFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="editionFormGrid">
          <div className="editionFieldGroup editionFieldGroupFull">
            <label className="editionFieldLabel">
              Edition Name <span className="editionRequired">*</span>
            </label>
            <input
              type="text"
              className="editionFieldInput"
              placeholder="e.g. PARV 6"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            {formErrors.name && <p className="editionFieldError">{formErrors.name}</p>}
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">
              Edition Number <span className="editionRequired">*</span>
            </label>
            <input
              type="number"
              min="1"
              className="editionFieldInput"
              placeholder="6"
              name="editionNumber"
              value={formData.editionNumber}
              onChange={handleChange}
            />
            {formErrors.editionNumber && (
              <p className="editionFieldError">{formErrors.editionNumber}</p>
            )}
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">
              Year <span className="editionRequired">*</span>
            </label>
            <input
              type="number"
              className="editionFieldInput"
              placeholder="2026"
              name="year"
              value={formData.year}
              onChange={handleChange}
            />
            {formErrors.year && <p className="editionFieldError">{formErrors.year}</p>}
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">Event Date/Time</label>
            <input
              type="datetime-local"
              className="editionFieldInput"
              name="eventDateTime"
              value={formData.eventDateTime}
              onChange={handleChange}
            />
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">Venue</label>
            <input
              type="text"
              className="editionFieldInput"
              placeholder="Venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
            />
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">Guest Capacity</label>
            <input
              type="number"
              min="1"
              className="editionFieldInput"
              placeholder="Optional"
              name="guestCapacity"
              value={formData.guestCapacity}
              onChange={handleChange}
            />
            {formErrors.guestCapacity && (
              <p className="editionFieldError">{formErrors.guestCapacity}</p>
            )}
          </div>

          <div className="editionFieldGroup">
            <label className="editionFieldLabel">Status</label>
            <select
              className="editionFieldSelect"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="editionModalFooter">
          <button
            type="button"
            className="editionModalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="editionModalCreateButton"
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
