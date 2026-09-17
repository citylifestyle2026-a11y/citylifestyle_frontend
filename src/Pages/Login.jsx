import "../assets/CSS/Login.css";
import logo from "../assets/images/logo/city-lifestyle-logo.jpg";
import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Box,
  Grid,
  Paper,
  Typography,
} from "@mui/material";

import { EmailOutlined, LockOutlined } from "@mui/icons-material";

import { BsCalendarEventFill, BsFillTicketFill } from "react-icons/bs";
import { LuScanQrCode } from "react-icons/lu";
import { FaUsers } from "react-icons/fa";

import {
  login,
  forgotPassword,
  resetPasswordWithOtp,
  resetForgotPasswordState,
} from "../redux/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

const FEATURES = [
  { icon: <BsCalendarEventFill />, label: "Events" },
  { icon: <BsFillTicketFill />, label: "Bookings" },
  { icon: <LuScanQrCode />, label: "QR Entry" },
  { icon: <FaUsers />, label: "Attendees" },
];

const Login = () => {
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });

  // Field-level validation errors (client-side + backend field-specific).
  const [errors, setErrors] = useState({
    login: "",
    password: "",
  });

  // Generic backend error that can't be safely attributed to either
  // field (e.g. "Invalid email/mobile or password"). Kept separate
  // from `errors` so it never gets rendered as if it belongs to one
  // specific TextField.
  const [generalError, setGeneralError] = useState("");

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading } = useSelector((state) => state.auth);

  // ===== Forgot Password (OTP, via email) =====
  // Which screen is currently shown: "login" (default), "forgot-email"
  // (enter email to request an OTP), or "forgot-reset" (enter the OTP +
  // new password). Kept as a single view flag so only one screen is ever
  // rendered at a time.
  const [authView, setAuthView] = useState("login");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");

  const [resetData, setResetData] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [resetErrors, setResetErrors] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    forgotPasswordLoading,
    forgotPasswordError,
    forgotPasswordSuccess,
    resetPasswordWithOtpLoading,
    resetPasswordWithOtpError,
    resetPasswordWithOtpSuccess,
  } = useSelector((state) => state.auth);

  const goToForgotPassword = () => {
    dispatch(resetForgotPasswordState());
    setForgotEmail("");
    setForgotEmailError("");
    setAuthView("forgot-email");
  };

  const goBackToLogin = () => {
    dispatch(resetForgotPasswordState());
    setAuthView("login");
  };

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      setForgotEmailError("Email is required.");
      return;
    }
    setForgotEmailError("");

    const result = await dispatch(forgotPassword({ email: forgotEmail.trim() }));

    if (forgotPassword.fulfilled.match(result)) {
      setResetData({ otp: "", newPassword: "", confirmPassword: "" });
      setResetErrors({ otp: "", newPassword: "", confirmPassword: "" });
      setAuthView("forgot-reset");
    }
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
    setResetErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateReset = () => {
    const nextErrors = { otp: "", newPassword: "", confirmPassword: "" };
    let isValid = true;

    if (!resetData.otp.trim()) {
      nextErrors.otp = "OTP is required.";
      isValid = false;
    }

    if (!resetData.newPassword) {
      nextErrors.newPassword = "New password is required.";
      isValid = false;
    }

    if (!resetData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password.";
      isValid = false;
    } else if (
      resetData.newPassword &&
      resetData.newPassword !== resetData.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match.";
      isValid = false;
    }

    setResetErrors(nextErrors);
    return isValid;
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!validateReset()) {
      return;
    }

    const result = await dispatch(
      resetPasswordWithOtp({
        email: forgotEmail.trim(),
        otp: resetData.otp.trim(),
        newPassword: resetData.newPassword,
        confirmPassword: resetData.confirmPassword,
      })
    );

    if (resetPasswordWithOtp.fulfilled.match(result)) {
      setAuthView("login");
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear only this field's error as the user corrects it — the
    // other field's error (if any) is left untouched.
    if (name === "login" || name === "password") {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));

      // A fresh edit means any previous backend response no longer
      // applies to what's currently in the form.
      if (generalError) {
        setGeneralError("");
      }
    }
  };

  const validate = () => {
    const nextErrors = { login: "", password: "" };
    let isValid = true;

    if (!formData.login.trim()) {
      nextErrors.login = "Email or mobile number is required.";
      isValid = false;
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
      isValid = false;
    }

    setErrors(nextErrors);
    return isValid;
  };

  // Inspects the backend message and decides, WITHOUT guessing, whether
  // it can be safely attributed to a single field. The backend
  // intentionally returns the same generic message for both a bad
  // username and a bad password ("Invalid email/mobile or password"),
  // so that generic message is always treated as general — never
  // assigned to just one TextField. Only an unambiguous, genuinely
  // field-specific message (mentions one field and not the other) is
  // shown under that field.
  const applyBackendError = (message) => {
    if (!message) {
      setGeneralError("Something went wrong while signing in. Please try again.");
      return;
    }

    const lower = message.toLowerCase();
    const mentionsLogin = lower.includes("email") || lower.includes("mobile");
    const mentionsPassword = lower.includes("password");

    if (mentionsLogin && !mentionsPassword) {
      setErrors((prev) => ({ ...prev, login: message }));
      return;
    }

    if (mentionsPassword && !mentionsLogin) {
      setErrors((prev) => ({ ...prev, password: message }));
      return;
    }

    // Mentions both, mentions neither, or is the known generic
    // "Invalid email/mobile or password" message — can't be safely
    // attributed to one field, so show it generically instead of
    // guessing.
    setGeneralError(message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setGeneralError("");

    if (!validate()) {
      return;
    }

    const result = await dispatch(
      login({
        login: formData.login,
        password: formData.password,
      })
    );

    if (login.fulfilled.match(result)) {
      navigate("/dashboard");
      return;
    }

    if (login.rejected.match(result)) {
      applyBackendError(result.payload);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Without this, the input's default mousedown behavior (stealing focus)
  // can interfere with the click on the icon actually registering,
  // which is why the toggle can feel like it "doesn't properly work."
  // This is the exact pairing MUI's own docs use for this pattern.
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box className="emsLogin__page">
      <Grid container className="emsLogin__container">

        {/* Left Side */}
        <Grid size={{ xs: 0, md: 6 }} className="emsLogin__left">
          <div className="emsLogin__illustrationWrapper">

            <img
              src={logo}
              alt="City Lifestyle"
              className="emsLogin__logo"
            />

            <Typography
              variant="h6"
              className="emsLogin__brandSubTitle"
            >
              Admin Dashboard
            </Typography>

            <Typography className="emsLogin__brandDescription">
              Create events, manage bookings, scan QR passes at entry, and
              track everything from one dashboard.
            </Typography>

            <div className="emsLogin__featureGrid">
              {FEATURES.map((feature) => (
                <div
                  className="emsLogin__featureCard"
                  key={feature.label}
                >
                  <span className="emsLogin__featureIcon">
                    {feature.icon}
                  </span>

                  <Typography variant="body2">
                    {feature.label}
                  </Typography>
                </div>
              ))}
            </div>

          </div>
        </Grid>

        {/* Right Side */}
        <Grid size={{ xs: 12, md: 6 }} className="emsLogin__right">
          <Paper elevation={0} className="emsLogin__card">

            <div className="emsLogin__mobileBrand">
              <img
                src={logo}
                alt="City Lifestyle"
                className="emsLogin__mobileLogo"
              />
            </div>

            {authView === "login" && (
              <form
                className="emsLogin__form"
                onSubmit={handleSubmit}
                noValidate
              >

                {/* Only for a backend error that can't be safely
                    attributed to one field (e.g. the generic
                    "Invalid email/mobile or password" message). */}
                {generalError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {generalError}
                  </Alert>
                )}

                {/* Shown once, right after a successful OTP-based
                    password reset, so the user knows to sign in with
                    their new password. */}
                {resetPasswordWithOtpSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {resetPasswordWithOtpSuccess} Please sign in with your new password.
                  </Alert>
                )}

                {/* Email / Mobile — plain HTML input (not MUI TextField),
                    same structure/approach as the password field below. */}
                <div className="emsLogin__mobileField">
                  <label
                    htmlFor="login"
                    className="emsLogin__mobileLabel"
                  >
                    Email or Mobile Number
                  </label>

                  <div
                    className={
                      "emsLogin__mobileInputWrapper" +
                      (errors.login
                        ? " emsLogin__mobileInputWrapper--error"
                        : "")
                    }
                  >
                    <EmailOutlined className="emsLogin__mobileStartIcon" />

                    <input
                      id="login"
                      name="login"
                      type="text"
                      value={formData.login}
                      onChange={handleChange}
                      autoComplete="username"
                      className="emsLogin__mobileInput"
                    />
                  </div>

                  {errors.login && (
                    <span className="emsLogin__mobileErrorText">
                      {errors.login}
                    </span>
                  )}
                </div>

                {/* Password — plain HTML input (not MUI TextField). Structure
                    intentionally mirrors the MUI field above it (start icon,
                    label, end toggle button) purely so the visual result
                    stays as close as possible to the original. */}
                <div className="emsLogin__passwordField">
                  <label
                    htmlFor="password"
                    className="emsLogin__passwordLabel"
                  >
                    Password
                  </label>

                  <div
                    className={
                      "emsLogin__passwordInputWrapper" +
                      (errors.password
                        ? " emsLogin__passwordInputWrapper--error"
                        : "")
                    }
                  >
                    <LockOutlined className="emsLogin__passwordStartIcon" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      className="emsLogin__passwordInput"
                    />

                    <button
                      type="button"
                      onClick={handleTogglePassword}
                      onMouseDown={handleMouseDownPassword}
                      className="emsLogin__passwordToggleBtn"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <HiOutlineEyeOff />
                      ) : (
                        <HiOutlineEye />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <span className="emsLogin__passwordErrorText">
                      {errors.password}
                    </span>
                  )}
                </div>

                {/* Forgot Password */}
                <div className="emsLogin__optionRow emsLogin__optionRow--end">
                  <button
                    type="button"
                    className="emsLogin__forgotLink"
                    onClick={goToForgotPassword}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  className="emsLogin__button"
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : (
                    "Sign In"
                  )}
                </Button>

              </form>
            )}

            {/* ===== Forgot Password — Step 1: request OTP by email ===== */}
            {authView === "forgot-email" && (
              <form
                className="emsLogin__form"
                onSubmit={handleForgotEmailSubmit}
                noValidate
              >
                <Typography
                  variant="h5"
                  className="emsLogin__title"
                >
                  Forgot Password
                </Typography>

                <Typography className="emsLogin__subtitle">
                  Enter your registered email and we'll send you an OTP to reset your password.
                </Typography>

                {forgotPasswordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {forgotPasswordError}
                  </Alert>
                )}

                {forgotPasswordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {forgotPasswordSuccess}
                  </Alert>
                )}

                <div className="emsLogin__mobileField">
                  <label
                    htmlFor="forgotEmail"
                    className="emsLogin__mobileLabel"
                  >
                    Email
                  </label>

                  <div
                    className={
                      "emsLogin__mobileInputWrapper" +
                      (forgotEmailError
                        ? " emsLogin__mobileInputWrapper--error"
                        : "")
                    }
                  >
                    <EmailOutlined className="emsLogin__mobileStartIcon" />

                    <input
                      id="forgotEmail"
                      name="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotEmailError("");
                      }}
                      autoComplete="email"
                      className="emsLogin__mobileInput"
                    />
                  </div>

                  {forgotEmailError && (
                    <span className="emsLogin__mobileErrorText">
                      {forgotEmailError}
                    </span>
                  )}
                </div>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  className="emsLogin__button"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : (
                    "Send OTP"
                  )}
                </Button>

                <div className="emsLogin__optionRow emsLogin__optionRow--center">
                  <button
                    type="button"
                    className="emsLogin__forgotLink"
                    onClick={goBackToLogin}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* ===== Forgot Password — Step 2: enter OTP + new password ===== */}
            {authView === "forgot-reset" && (
              <form
                className="emsLogin__form"
                onSubmit={handleResetSubmit}
                noValidate
              >
                <Typography
                  variant="h5"
                  className="emsLogin__title"
                >
                  Reset Password
                </Typography>

                <Typography className="emsLogin__subtitle">
                  Enter the OTP sent to {forgotEmail} along with your new password.
                </Typography>

                {resetPasswordWithOtpError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {resetPasswordWithOtpError}
                  </Alert>
                )}

                {forgotPasswordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {forgotPasswordSuccess}
                  </Alert>
                )}

                <div className="emsLogin__mobileField">
                  <label
                    htmlFor="otp"
                    className="emsLogin__mobileLabel"
                  >
                    OTP
                  </label>

                  <div
                    className={
                      "emsLogin__mobileInputWrapper" +
                      (resetErrors.otp
                        ? " emsLogin__mobileInputWrapper--error"
                        : "")
                    }
                  >
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      value={resetData.otp}
                      onChange={handleResetChange}
                      className="emsLogin__mobileInput"
                    />
                  </div>

                  {resetErrors.otp && (
                    <span className="emsLogin__mobileErrorText">
                      {resetErrors.otp}
                    </span>
                  )}
                </div>

                <div className="emsLogin__passwordField">
                  <label
                    htmlFor="newPassword"
                    className="emsLogin__passwordLabel"
                  >
                    New Password
                  </label>

                  <div
                    className={
                      "emsLogin__passwordInputWrapper" +
                      (resetErrors.newPassword
                        ? " emsLogin__passwordInputWrapper--error"
                        : "")
                    }
                  >
                    <LockOutlined className="emsLogin__passwordStartIcon" />

                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={resetData.newPassword}
                      onChange={handleResetChange}
                      autoComplete="new-password"
                      className="emsLogin__passwordInput"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      onMouseDown={handleMouseDownPassword}
                      className="emsLogin__passwordToggleBtn"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <HiOutlineEyeOff />
                      ) : (
                        <HiOutlineEye />
                      )}
                    </button>
                  </div>

                  {resetErrors.newPassword && (
                    <span className="emsLogin__passwordErrorText">
                      {resetErrors.newPassword}
                    </span>
                  )}
                </div>

                <div className="emsLogin__passwordField">
                  <label
                    htmlFor="confirmPassword"
                    className="emsLogin__passwordLabel"
                  >
                    Confirm Password
                  </label>

                  <div
                    className={
                      "emsLogin__passwordInputWrapper" +
                      (resetErrors.confirmPassword
                        ? " emsLogin__passwordInputWrapper--error"
                        : "")
                    }
                  >
                    <LockOutlined className="emsLogin__passwordStartIcon" />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={resetData.confirmPassword}
                      onChange={handleResetChange}
                      autoComplete="new-password"
                      className="emsLogin__passwordInput"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      onMouseDown={handleMouseDownPassword}
                      className="emsLogin__passwordToggleBtn"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <HiOutlineEyeOff />
                      ) : (
                        <HiOutlineEye />
                      )}
                    </button>
                  </div>

                  {resetErrors.confirmPassword && (
                    <span className="emsLogin__passwordErrorText">
                      {resetErrors.confirmPassword}
                    </span>
                  )}
                </div>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  className="emsLogin__button"
                  disabled={resetPasswordWithOtpLoading}
                >
                  {resetPasswordWithOtpLoading ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                <div className="emsLogin__optionRow emsLogin__optionRow--center">
                  <button
                    type="button"
                    className="emsLogin__forgotLink"
                    onClick={goBackToLogin}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Login;