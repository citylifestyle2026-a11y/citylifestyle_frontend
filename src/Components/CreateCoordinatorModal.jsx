import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import {
  createCoordinator,
  updateCoordinator,
  getAllCoordinators,
} from "../redux/coordinator/coordinatorThunk";
import { clearCoordinatorState } from "../redux/coordinator/coordinatorSlice";
import "../assets/CSS/CreateCoordinatorModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import {
  isValidMobileNumber,
  toLocalMobileNumber,
  LOCAL_MOBILE_ERROR_MESSAGE,
} from "../utilits/mobileNumber";

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
  status: "active",
};

// PARV CRM — Phase 2 Coordinator create/edit modal. Same
// create/edit-in-one-modal pattern as CreateGuestModal.jsx. Password/
// Confirm Password are required on create, optional on edit (leaving
// them blank keeps the existing password — mirrors
// coordinator.validator.js's updateCoordinatorValidation).
export default function CreateCoordinatorModal({
  onClose,
  isEditMode = false,
  editCoordinatorData = null,
  currentPage = 1,
  rowsPerPage = 10,
  search = "",
}) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.coordinator);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearCoordinatorState());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editCoordinatorData) {
      setFormData({
        name: editCoordinatorData.name || "",
        mobile: editCoordinatorData.mobile || "",
        email: editCoordinatorData.email || "",
        password: "",
        confirmPassword: "",
        status: editCoordinatorData.status || "active",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormErrors({});
  }, [isEditMode, editCoordinatorData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }

    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile Number is required.";
    } else if (!isValidMobileNumber(formData.mobile)) {
      errors.mobile = LOCAL_MOBILE_ERROR_MESSAGE;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    // Password is required on create, optional on edit — but if either
    // password field is touched on edit, both must be filled and match.
    const passwordTouched = formData.password || formData.confirmPassword;

    if (!isEditMode || passwordTouched) {
      if (!formData.password) {
        errors.password = "Password is required.";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters.";
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = "Confirm Password is required.";
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Password and Confirm Password do not match.";
      }
    }

    setFormErrors((prev) => ({ ...prev, ...errors }));

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!validate()) return;

    try {
      if (isEditMode) {
        const payload = {
          name: formData.name.trim(),
          mobile: toLocalMobileNumber(formData.mobile),
          email: formData.email.trim(),
          status: formData.status,
        };

        if (formData.password) {
          payload.password = formData.password;
          payload.confirmPassword = formData.confirmPassword;
        }

        const res = await dispatch(
          updateCoordinator({ id: editCoordinatorData._id, data: payload })
        ).unwrap();

        showSuccess(res?.message || "Coordinator updated successfully");
      } else {
        const payload = {
          name: formData.name.trim(),
          mobile: toLocalMobileNumber(formData.mobile),
          email: formData.email.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        const res = await dispatch(createCoordinator(payload)).unwrap();

        showSuccess(res?.message || "Coordinator created successfully");
      }

      dispatch(getAllCoordinators({ page: currentPage, limit: rowsPerPage, search }));
      dispatch(clearCoordinatorState());

      onClose();
    } catch (err) {
      const message = getErrorText(err, "Something went wrong");

      // The backend's "Mobile already exists" / "Email already exists"
      // errors (see coordinator.service.js) are shown right under the
      // matching field instead of only as a toast.
      if (typeof message === "string" && message.toLowerCase().includes("mobile")) {
        setFormErrors((prev) => ({ ...prev, mobile: message }));
        return;
      }
      if (typeof message === "string" && message.toLowerCase().includes("email")) {
        setFormErrors((prev) => ({ ...prev, email: message }));
        return;
      }

      showError(message);
    }
  };

  return (
    <div className="coordinatorModalOverlay" onClick={onClose}>
      <div className="createCoordinatorModal" onClick={(e) => e.stopPropagation()}>
        <div className="coordinatorModalHeader">
          <h2 className="coordinatorModalTitle">
            {isEditMode ? "Edit Coordinator" : "Add Coordinator"}
          </h2>
          <button
            type="button"
            className="coordinatorCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <p className="coordinatorFieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="coordinatorFormGrid">
          {/*
            Chrome autofill trap: these two fields are invisible decoys.
            Chrome's heuristics grab the FIRST username/password-shaped
            fields it finds on the page and autofill them with saved
            credentials. By placing hidden ones first, Chrome fills
            these instead of the real Email/Password fields below.
            Keep them mounted (not conditionally rendered) and out of
            tab order so screen readers / keyboard users skip them.
          */}
          <input
            type="text"
            name="fakeusername"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
          />
          <input
            type="password"
            name="fakepassword"
            autoComplete="new-password"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
          />

          <div className="coordinatorFieldGroup">
            <label className="coordinatorFieldLabel">
              Name <span className="coordinatorRequired">*</span>
            </label>
            <input
              type="text"
              className="coordinatorFieldInput"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="off"
            />
            {formErrors.name && <p className="coordinatorFieldError">{formErrors.name}</p>}
          </div>

          <div className="coordinatorFieldGroup">
            <label className="coordinatorFieldLabel">
              Mobile Number <span className="coordinatorRequired">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              className="coordinatorFieldInput"
              placeholder="Mobile Number (91 optional)"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              autoComplete="off"
            />
            {formErrors.mobile && <p className="coordinatorFieldError">{formErrors.mobile}</p>}
          </div>

          <div className="coordinatorFieldGroup">
            <label className="coordinatorFieldLabel">Email</label>
            <input
              type="text"
              className="coordinatorFieldInput"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
            />
            {formErrors.email && <p className="coordinatorFieldError">{formErrors.email}</p>}
          </div>

          {isEditMode && (
            <div className="coordinatorFieldGroup">
              <label className="coordinatorFieldLabel">Status</label>
              <select
                className="coordinatorFieldSelect"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div className="coordinatorFieldGroup">
            <label className="coordinatorFieldLabel">
              {isEditMode ? "New Password" : "Password"}
              {!isEditMode && <span className="coordinatorRequired">*</span>}
            </label>
            <input
              type="password"
              className="coordinatorFieldInput"
              placeholder={isEditMode ? "Leave blank to keep current password" : "Password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {formErrors.password && (
              <p className="coordinatorFieldError">{formErrors.password}</p>
            )}
          </div>

          <div className="coordinatorFieldGroup">
            <label className="coordinatorFieldLabel">
              {isEditMode ? "Confirm New Password" : "Confirm Password"}
              {!isEditMode && <span className="coordinatorRequired">*</span>}
            </label>
            <input
              type="password"
              className="coordinatorFieldInput"
              placeholder="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {formErrors.confirmPassword && (
              <p className="coordinatorFieldError">{formErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="coordinatorModalFooter">
          <button
            type="button"
            className="coordinatorModalCloseButton"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="coordinatorModalCreateButton"
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