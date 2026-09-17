import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { createAdmin, getAllAdmins } from "../redux/admin/adminThunk";
import { clearAdminState } from "../redux/admin/adminSlice";
import "../assets/CSS/EditAdminModal.css";
import { showError, showSuccess } from "../utilits/toast";

// Create-only modal for the Admin Management page — Super-Admin-only
// (Pages/Admin.jsx only ever renders this for a logged-in admin whose
// adminType is "superadmin"; the backend, POST /api/admin, independently
// enforces the same rule via authorize.requireSuperAdmin regardless of
// what the frontend shows/hides). Fields are limited to
// name/email/mobile/password/confirmPassword — there is no role or
// adminType field anywhere in this form, matching the backend contract
// (new admins always get role: "admin" / adminType: "admin" server-side).
export default function CreateAdminModal({ onClose }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.admin);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Independent show/hide state for each password field — toggling one
  // never affects the other.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fresh open → clear any error/success left over from a previous attempt.
  useEffect(() => {
    dispatch(clearAdminState());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = "Enter a valid 10-digit mobile number.";
    }

    if (!formData.password) {
      errors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    try {
      await dispatch(
        createAdmin({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          password: formData.password,
        })
      ).unwrap();

      showSuccess("Admin created successfully");

      // Refresh the list so the new admin appears immediately, same
      // belt-and-braces refetch pattern EditAdminModal/CreateUserModal use.
      dispatch(getAllAdmins());

      dispatch(clearAdminState());

      onClose();
    } catch (err) {
      showError(err?.message || err?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="adminModalOverlay" onClick={onClose}>
      <div className="editAdminModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2 className="modalTitle">Add Admin</h2>
          <button
            type="button"
            className="closeIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <p className="fieldError" style={{ textAlign: "center", marginTop: 8 }}>
            {typeof error === "string" ? error : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="adminFormGrid">
          <div className="fieldGroup">
            <label className="fieldLabel">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            {formErrors.name && <p className="fieldError">{formErrors.name}</p>}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              className="fieldInput"
              placeholder="email@email.com"
              name="email"
              autoComplete="off"
              value={formData.email}
              onChange={handleChange}
            />
            {formErrors.email && <p className="fieldError">{formErrors.email}</p>}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">
              Mobile no <span className="required">*</span>
            </label>
            <input
              type="text"
              className="fieldInput"
              placeholder="Mobile Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
            {formErrors.mobile && <p className="fieldError">{formErrors.mobile}</p>}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">
              Password <span className="required">*</span>
            </label>
            <div className="fieldInputWrap">
              <input
                type={showPassword ? "text" : "password"}
                className="fieldInput"
                name="password"
                autoComplete="new-password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="fieldPasswordToggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
            {formErrors.password && <p className="fieldError">{formErrors.password}</p>}
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel">
              Confirm Password <span className="required">*</span>
            </label>
            <div className="fieldInputWrap">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="fieldInput"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="fieldPasswordToggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <p className="fieldError">{formErrors.confirmPassword}</p>
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
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}