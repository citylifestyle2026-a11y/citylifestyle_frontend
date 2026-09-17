import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, CircularProgress } from "@mui/material";
import { HiOutlineUser, HiOutlineMail, HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import DashboardLayout from "../Components/DashboardLayout";
import EditProfileModal from "../Components/EditProfileModal";
import { getProfile, resetPassword, resetPasswordState } from "../redux/auth/authSlice";
import "../assets/CSS/Profile.css";

// Same symbol rule already used by the backend's resetPasswordValidation,
// mirrored here for instant feedback.
const SYMBOL_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/;']/;

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function Profile() {
  const dispatch = useDispatch();
  // Targeted selectors (rather than destructuring the whole state.auth
  // object) so this page only re-renders when a field it actually
  // displays changes.
  const profile = useSelector((state) => state.auth.profile);
  const profileLoading = useSelector((state) => state.auth.profileLoading);
  const profileError = useSelector((state) => state.auth.profileError);
  const resetPasswordLoading = useSelector((state) => state.auth.resetPasswordLoading);
  const resetPasswordError = useSelector((state) => state.auth.resetPasswordError);
  const resetPasswordSuccess = useSelector((state) => state.auth.resetPasswordSuccess);

  // Fetch the real Admin profile on load / on refresh — backend stays
  // the source of truth, we never rely on stale Redux data alone.
  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});

  const handlePasswordFieldChange = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleOpenPasswordReset = () => {
    setIsResettingPassword(true);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordErrors({});
    dispatch(resetPasswordState());
  };

  const handleCancelPasswordReset = () => {
    setIsResettingPassword(false);
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
      setIsResettingPassword(false);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
    }
    // On rejection, resetPasswordError is already set in Redux and
    // rendered below — form stays open, entered values untouched.
  };

  // Profile image — same field/fallback pattern already used in User.jsx's
  // list view and Header.jsx (user.profileImage || LOGO_AVATAR), except
  // the generated avatar's initials are now based on this admin's own
  // name instead of a hardcoded "CL", matching Header.jsx.
  const LOGO_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile?.name || "U"
  )}&background=17a2b8&color=fff&bold=true`;

  const avatarUrl = profile?.profileImage || LOGO_AVATAR;

  // ===== Loading state =====
  if (!profile && profileLoading) {
    return (
      <DashboardLayout title="Profile">
        <div className="profileStateWrap">
          <CircularProgress size={32} />
          <p>Loading profile…</p>
        </div>
      </DashboardLayout>
    );
  }

  // ===== Error state =====
  if (!profile && profileError) {
    return (
      <DashboardLayout title="Profile">
        <div className="profileStateWrap profileStateError">
          <p>{profileError || "Something went wrong while loading your profile."}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Nothing to render yet (first paint, before the fetch has started/settled)
  if (!profile) {
    return (
      <DashboardLayout title="Profile">
        <div className="profileStateWrap">
          <CircularProgress size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile">
      {/* Breadcrumb */}
      <div className="profileBreadcrumbWrap">
        <h1 className="profilePageTitle">Profile</h1>
        <div className="profileBreadcrumb">
          <span>Dashboard</span>
          <span className="breadcrumbDivider">-</span>
          <span className="breadcrumbActive">Profile</span>
        </div>
      </div>

      {/* Profile summary */}
      <div className="profileSummary">
        <img src={avatarUrl} alt={profile.name} className="profileSummaryAvatar" />
        <div className="profileSummaryInfo">
          <h2 className="profileSummaryName">{profile.name}</h2>
          <div className="profileSummaryMeta">
            <span className="metaItem">
              <HiOutlineUser />
              {profile.role}
            </span>
            <span className="metaItem">
              <HiOutlineMail />
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details card */}
      <section className="profileCard">
        <div className="profileCardHeader">
          <h3>Profile Details</h3>
          <button
            type="button"
            className="primaryButton"
            onClick={() => setIsEditOpen(true)}
          >
            Edit Profile
          </button>
        </div>

        <div className="profileDetailsGrid">
          <div className="detailRow">
            <span className="detailLabel">Full Name</span>
            <span className="detailValue">{profile.name}</span>
          </div>
          <div className="detailRow">
            <span className="detailLabel">Email</span>
            <span className="detailValue">{profile.email}</span>
          </div>
          <div className="detailRow">
            <span className="detailLabel">
              Role <HiOutlineUser className="detailLabelIcon" />
            </span>
            <span className="detailValue">{profile.role}</span>
          </div>
        </div>
      </section>

      {/* Sign-in Method card */}
      <section className="profileCard">
        <div className="profileCardHeader">
          <h3>Sign-in Method</h3>
        </div>

        {!isResettingPassword ? (
          <>
            {resetPasswordSuccess && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => dispatch(resetPasswordState())}
              >
                {resetPasswordSuccess}
              </Alert>
            )}

            <div className="passwordRow">
              <div className="passwordInfo">
                <span className="detailLabel">Password</span>
                <span className="passwordMask">••••••••••••</span>
              </div>
              <button
                type="button"
                className="primaryButton"
                onClick={handleOpenPasswordReset}
              >
                Reset Password
              </button>
            </div>
          </>
        ) : (
          <div className="passwordEditGrid">
            {resetPasswordError && (
              <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
                {resetPasswordError}
              </Alert>
            )}

            <div className="passwordField">
              <label>Current Password</label>
              <div className="passwordInputWrap">
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  placeholder="Password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFieldChange("currentPassword")}
                  disabled={resetPasswordLoading}
                />
                <button
                  type="button"
                  className="pwdToggle"
                  onClick={() => setShowCurrentPwd((v) => !v)}
                  aria-label="Toggle current password visibility"
                >
                  {showCurrentPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
              {passwordErrors.currentPassword ? (
                <p className="modalFieldError">{passwordErrors.currentPassword}</p>
              ) : (
                <p className="passwordHint">
                  Password must be at least 8 character and contain symbols
                </p>
              )}
            </div>

            <div className="passwordField">
              <label>New Password</label>
              <div className="passwordInputWrap">
                <input
                  type={showNewPwd ? "text" : "password"}
                  placeholder="Password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFieldChange("newPassword")}
                  disabled={resetPasswordLoading}
                />
                <button
                  type="button"
                  className="pwdToggle"
                  onClick={() => setShowNewPwd((v) => !v)}
                  aria-label="Toggle new password visibility"
                >
                  {showNewPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="modalFieldError">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div className="passwordField">
              <label>Confirm New Password</label>
              <div className="passwordInputWrap">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  placeholder="Password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFieldChange("confirmPassword")}
                  disabled={resetPasswordLoading}
                />
                <button
                  type="button"
                  className="pwdToggle"
                  onClick={() => setShowConfirmPwd((v) => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="modalFieldError">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="passwordEditActions">
              <button
                type="button"
                className="primaryButton"
                onClick={handleUpdatePassword}
                disabled={resetPasswordLoading}
              >
                {resetPasswordLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  "Update Password"
                )}
              </button>
              <button
                type="button"
                className="textButton"
                onClick={handleCancelPasswordReset}
                disabled={resetPasswordLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      {/* <footer className="profileFooter">
        <span>2026 © Keenthemes</span>
        <div className="profileFooterLinks">
          <a href="#">About</a>
          <a href="#">Support</a>
          <a href="#">Purchase</a>
        </div>
      </footer> */}

      {isEditOpen && (
        <EditProfileModal
          user={{
            name: profile.name,
            email: profile.email,
            mobile: profile.mobile,
            role: profile.role,
            avatar: avatarUrl,
          }}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}