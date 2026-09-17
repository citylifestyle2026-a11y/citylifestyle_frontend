import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { updateOwnAdmin, updateAdminById, getAllAdmins } from "../redux/admin/adminThunk";
import { clearAdminState } from "../redux/admin/adminSlice";
// Same resetPassword thunk (POST /api/auth/reset-password) already wired
// up and working on the Profile page's "Sign-in Method" section — reused
// here as-is rather than duplicating the call/validation logic.
import { resetPassword, resetPasswordState } from "../redux/auth/authSlice";
import "../assets/CSS/EditAdminModal.css";
import { showError, showSuccess } from "../utilits/toast";

// Same symbol rule used by Profile.jsx and the backend's
// resetPasswordValidation, mirrored here for instant feedback.
const SYMBOL_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/;

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

// Edit-only modal for the Admin Management page (no create/delete here).
// `admin` is either the current logged-in admin's own record, or — when
// the logged-in admin is the Super Admin — any other Admin's record (see
// Pages/Admin.jsx). `isEditingSelf` tells this modal which endpoint to
// call for the name/email/mobile fields: PUT /api/admin/me for one's own
// profile, or PUT /api/admin/:id (Super-Admin-only, enforced server-side
// regardless of what the frontend sends) for any other Admin.
//
// The Password section below is gated on isEditingSelf for a different
// reason: the only password-reset endpoint that exists on the backend is
// POST /api/auth/reset-password, and it always targets req.user.id (the
// currently logged-in account) after checking currentPassword — there is
// no backend support for a Super Admin to reset a *different* Admin's
// password. So the field only appears when this modal is open on the
// logged-in admin's own row; editing another Admin still shows
// name/email/mobile only, same as before.
export default function EditAdminModal({ admin, onClose, isEditingSelf = true }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.admin);
  const resetPasswordLoading = useSelector((state) => state.auth.resetPasswordLoading);
  const resetPasswordError = useSelector((state) => state.auth.resetPasswordError);

  const [formData, setFormData] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
    mobile: admin?.mobile || "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Password section is its own collapsed/expanded mini-form, independent
  // of the name/email/mobile Save above — they hit two different APIs
  // (PUT /admin/me|:id vs POST /auth/reset-password), same separation
  // Profile.jsx already uses between "Edit Profile" and "Reset Password".
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fresh open → clear any error/success left over from a previous attempt.
  useEffect(() => {
    dispatch(clearAdminState());
    dispatch(resetPasswordState());
  }, [dispatch]);

  const handlePasswordFieldChange = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleOpenPasswordChange = () => {
    setIsChangingPassword(true);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordErrors({});
    dispatch(resetPasswordState());
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordErrors({});
    dispatch(resetPasswordState());
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.trim().length < 8) {
      errors.newPassword = "New password must be at least 8 characters long";
    } else if (!SYMBOL_REGEX.test(passwordForm.newPassword)) {
      errors.newPassword = "New password must contain at least one symbol";
    }

    if (!passwordForm.confirmPassword.trim()) {
      errors.confirmPassword = "Confirm password is required";
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "New password and confirm password do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (resetPasswordLoading) return; // guards against double-submit
    if (!validatePasswordForm()) return;

    const result = await dispatch(
      resetPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
    );

    if (resetPassword.fulfilled.match(result)) {
      showSuccess("Password updated successfully");
      setIsChangingPassword(false);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
    } else if (resetPassword.rejected.match(result)) {
      showError(result.payload || "Failed to update password");
    }
  };

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

    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = "Enter a valid 10-digit mobile number.";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // guards against double-submit
    if (!validate()) return;

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
      };

      if (isEditingSelf) {
        await dispatch(updateOwnAdmin(payload)).unwrap();
      } else {
        await dispatch(updateAdminById({ id: admin._id, data: payload })).unwrap();
      }

      showSuccess("Admin updated successfully");

      // Refresh the list so every row (not just this one, which the
      // slice already patches in place) reflects the latest data —
      // same belt-and-braces refetch pattern CreateUserModal uses.
      dispatch(getAllAdmins());

      dispatch(clearAdminState());

      onClose();
    } catch (err) {
      showError(err?.message || "Something went wrong");
    }
  };

  return (
    <div className="adminModalOverlay" onClick={onClose}>
      <div className="editAdminModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2 className="modalTitle">Edit Admin</h2>
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
        </div>

        {/* Password change — self-editing only (see the isEditingSelf
            comment above the component for why). */}
        {isEditingSelf && (
          <div className="fieldGroup" style={{ marginTop: 8 }}>
            {!isChangingPassword ? (
              <button
                type="button"
                className="modalCloseButton"
                onClick={handleOpenPasswordChange}
                style={{ alignSelf: "flex-start" }}
              >
                Change Password
              </button>
            ) : (
              <div className="adminFormGrid">
                {resetPasswordError && (
                  <p
                    className="fieldError"
                    style={{ gridColumn: "1 / -1", textAlign: "center" }}
                  >
                    {resetPasswordError}
                  </p>
                )}

                <div className="fieldGroup">
                  <label className="fieldLabel">
                    Current Password <span className="required">*</span>
                  </label>
                  <div className="fieldInputWrap">
                    <input
                      type={showCurrentPwd ? "text" : "password"}
                      className="fieldInput"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange("currentPassword")}
                      disabled={resetPasswordLoading}
                    />
                    <button
                      type="button"
                      className="fieldPasswordToggle"
                      onClick={() => setShowCurrentPwd((v) => !v)}
                      aria-label={showCurrentPwd ? "Hide password" : "Show password"}
                    >
                      {showCurrentPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="fieldError">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div className="fieldGroup">
                  <label className="fieldLabel">
                    New Password <span className="required">*</span>
                  </label>
                  <div className="fieldInputWrap">
                    <input
                      type={showNewPwd ? "text" : "password"}
                      className="fieldInput"
                      placeholder="Password"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange("newPassword")}
                      disabled={resetPasswordLoading}
                    />
                    <button
                      type="button"
                      className="fieldPasswordToggle"
                      onClick={() => setShowNewPwd((v) => !v)}
                      aria-label={showNewPwd ? "Hide password" : "Show password"}
                    >
                      {showNewPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                    </button>
                  </div>
                  {passwordErrors.newPassword ? (
                    <p className="fieldError">{passwordErrors.newPassword}</p>
                  ) : (
                    <p className="fieldError" style={{ color: "#8a8d9c" }}>
                      Must be at least 8 characters and contain a symbol
                    </p>
                  )}
                </div>

                <div className="fieldGroup">
                  <label className="fieldLabel">
                    Confirm New Password <span className="required">*</span>
                  </label>
                  <div className="fieldInputWrap">
                    <input
                      type={showConfirmPwd ? "text" : "password"}
                      className="fieldInput"
                      placeholder="Password"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordFieldChange("confirmPassword")}
                      disabled={resetPasswordLoading}
                    />
                    <button
                      type="button"
                      className="fieldPasswordToggle"
                      onClick={() => setShowConfirmPwd((v) => !v)}
                      aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                    >
                      {showConfirmPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="fieldError">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div
                  className="fieldGroup"
                  style={{
                    gridColumn: "1 / -1",
                    flexDirection: "row",
                    gap: 12,
                    justifyContent: "flex-start",
                  }}
                >
                  <button
                    type="button"
                    className="modalCreateButton"
                    onClick={handleUpdatePassword}
                    disabled={resetPasswordLoading}
                  >
                    {resetPasswordLoading ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    className="modalCloseButton"
                    onClick={handleCancelPasswordChange}
                    disabled={resetPasswordLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}