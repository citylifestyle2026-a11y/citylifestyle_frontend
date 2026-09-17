import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, CircularProgress } from "@mui/material";
import { HiOutlinePencil, HiOutlineX, HiOutlineUser } from "react-icons/hi";

import { updateProfile, resetProfileUpdateState } from "../redux/auth/authSlice";
import "../assets/CSS/Profile.css";

// Same format rules already used by the backend validator, mirrored here
// for instant feedback — the backend remains the source of truth for
// duplicate email/mobile checks.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9]{10}$/;

export default function EditProfileModal({ user, onClose }) {
  const dispatch = useDispatch();
  // Targeted selectors, not the whole state.auth object, so this modal
  // only re-renders on the fields it actually uses.
  const updateLoading = useSelector((state) => state.auth.updateLoading);
  const updateError = useSelector((state) => state.auth.updateError);

  const [formData, setFormData] = useState({
    name: user.name || "",
    // email: user.email || "",
    mobile: user.mobile || "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [avatar, setAvatar] = useState(user.avatar);

  // The actual selected File (if any) — `avatar` above is only ever a
  // preview URL (either the existing photo's URL, or a local blob URL
  // for a newly picked file) and is never itself sent to the backend.
  const [imageFile, setImageFile] = useState(null);

  // Fresh open → clear any error left over from a previous attempt.
  useEffect(() => {
    dispatch(resetProfileUpdateState());
  }, [dispatch]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar("");
    setImageFile(null);
  };

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

  

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (updateLoading) return; // guards against double-submit
    if (!validate()) return;

    // multipart/form-data — required so a newly picked profileImage
    // file can go up alongside the text fields in the same request
    // (matches the backend's PUT /api/auth/profile, which parses it via
    // `upload.single("profileImage")` before this data ever reaches the
    // controller). axios auto-detects FormData and sets the correct
    // Content-Type/boundary itself (see api/axios.js) — nothing else
    // about the request needs to change for this to work.
    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("mobile", formData.mobile.trim());

    if (imageFile) {
      payload.append("profileImage", imageFile);
    }

    const result = await dispatch(updateProfile(payload));

    if (updateProfile.fulfilled.match(result)) {
      onClose();
    }
    // On rejection, updateError is already set in Redux and rendered
    // below — modal stays open, entered values are untouched.
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <h2 className="modalTitle">Edit User</h2>
        <button
          type="button"
          className="profilemodalCloseButton"
          onClick={onClose}
          aria-label="Close"
        >
          X
        </button>
        <div className="modalInnerCard">
          <h3 className="modalInnerTitle">Profile Details</h3>

          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {updateError}
            </Alert>
          )}

          <div className="modalFormGrid">
            <div className="modalFormRow">
              <label>Profile</label>
              <div className="avatarEditWrap">
                <div className="avatarEditImage">
                  {avatar && <img src={avatar} alt="Profile" />}
                  <label className="avatarEditPencil" htmlFor="avatarUpload">
                    <HiOutlinePencil />
                  </label>
                  <input
                    id="avatarUpload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAvatarChange}
                    hidden
                  />
                  {avatar && (
                    <button
                      type="button"
                      className="avatarEditRemove"
                      onClick={handleRemoveAvatar}
                      aria-label="Remove photo"
                    >
                      <HiOutlineX />
                    </button>
                  )}
                </div>
                <p className="avatarHint">Allowed file types: png, jpg, jpeg, webp.</p>
              </div>
            </div>

            <div className="modalFormRow">
              <label>
                Full Name <span className="requiredStar">*</span>
              </label>
              <div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange("name")}
                  className="modalInput"
                  disabled={updateLoading}
                />
                {fieldErrors.name && (
                  <p className="modalFieldError">{fieldErrors.name}</p>
                )}
              </div>
            </div>

            <div className="modalFormRow">
              <label>
                Email
              </label>
              <div>
                { <input
                  type="email"
                  value={user.email}
                  className="modalInput"
                  disabled
                />
}
              </div>
            </div>


            <div className="modalFormRow">
              <label>
                Role <HiOutlineUser className="roleIcon" />
              </label>
              <span className="roleValue">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className="primaryButton"
            onClick={handleSave}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
