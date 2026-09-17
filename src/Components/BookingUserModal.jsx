import { FaTimes, FaPencilAlt, FaUser } from "react-icons/fa";
import "../assets/CSS/BookingUserModal.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getRegisterUser,
  updateRegisterUser,
} from "../redux/bookingTicket/bookingTicketThunk";
import { showError, showSuccess } from "../utilits/toast";
import { getBookingById } from "../redux/booking/bookingThunk";

export default function BookingUserModal({ onClose, ticketId, onSuccess }) {
  //Redux connect
  const dispatch = useDispatch();
  const { registerUser, loading } = useSelector(
    (state) => state.bookingTicket
  );
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    email: "",
    profileImage: null,
  });
  const [previewImage, setPreviewImage] = useState("");
  // Modal open thay tyare API call
  useEffect(() => {
    if (ticketId) {
      dispatch(getRegisterUser(ticketId));
    }
  }, [dispatch, ticketId]);
  // API Response thi Form Fill
  // Backend returns the raw BookingTicket document, so the attendee's
  // details live under `registerUser.attendee` (name/mobileNumber/email/
  // profileImage) — same nested shape used everywhere else in the app
  // (e.g. RegisterUsers.jsx's `ticket.attendee`), not top-level fields.
  useEffect(() => {
    if (!registerUser) return;

    const attendee = registerUser.attendee || {};

    setFormData({
      name: attendee.name || "",
      mobileNumber: attendee.mobileNumber || "",
      email: attendee.email || "",
      profileImage: null,
    });
    setPreviewImage(
      attendee.profileImage || ""
    );
  }, [registerUser]);
  // image 
  const handleImageChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please select valid image.");
      return;
    }

    // ================= IMAGE SIZE LIMIT =================
    // Private Registration attendee photo: images up to 100 MB are now
    // allowed (raised from the previous 20 MB cap); only files over
    // 100 MB are rejected. Matches the backend's registration-specific
    // upload limit (middlewares/upload.middleware.js's
    // `registrationPhotoUpload`, used by the PUT
    // /booking-ticket/register-user/:ticketId endpoint this form
    // submits to). Allowed image types/formats are unchanged.
    if (file.size > 100 * 1024 * 1024) {
      showError("Image size should be less than 100MB.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      profileImage: file,
    }));

    setPreviewImage(URL.createObjectURL(file));

  };
  // remove image
  const handleRemoveImage = () => {

    setFormData((prev) => ({
      ...prev,
      profileImage: null,
    }));

    setPreviewImage("");

  };
  // validation
  const validateForm = () => {
    if (!formData.name.trim())
      return "Please enter name.";

    if (!/^[A-Za-z ]+$/.test(formData.name))
      return "Name is invalid.";

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber))
      return "Please enter valid mobile number.";

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      return "Please enter valid email.";

    return null;
  };
  // submit 
  const handleSubmit = async () => {

    const validationError = validateForm();

    if (validationError) {
      showError(validationError);
      return;
    }

    const payload = new FormData();

    payload.append("name", formData.name.trim());
    payload.append(
      "mobileNumber",
      formData.mobileNumber.trim()
    );
    payload.append(
      "email",
      formData.email.trim()
    );
    if (formData.profileImage) {
      payload.append(
        "profileImage",
        formData.profileImage
      );
    }
    const response = await dispatch(
      updateRegisterUser({
        ticketId,
        formData: payload,
      })
    );

    if (updateRegisterUser.fulfilled.match(response)) {

      showSuccess(
        response.payload.message ||
        "User details updated successfully."
      );

      if (onSuccess) {
        await onSuccess();
      }

      onClose();

    } else {

      showError(
        response.payload ||
        "Failed to update user."
      );

    }
  };
  return (
    <div className="bookingUserOverlay" onClick={onClose}>
      <div className="bookingUserContainer" onClick={(e) => e.stopPropagation()}>
        <div className="bookingUserHeader">
          <h2 className="bookingUserTitle">Book User</h2>
          <button
            type="button"
            className="bookingUserCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="bookingUserProfileSection">
          <span className="bookingUserProfileLabel">Profile</span>

          <div className="bookingUserPhotoBlock">
            <div className="bookingUserPhotoCircleWrap">
              <div className="bookingUserPhotoCircle">

                {previewImage ? (

                  <img
                    src={previewImage}
                    alt="Profile"
                    className="bookingUserProfileImage"
                  />
                ) : (
                  <FaUser className="bookingUserAvatarIcon" />
                )}
              </div>
              <input
                id="bookingUserImage"
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
              <label
                htmlFor="bookingUserImage"
                className="bookingUserEditPhotoButton"
              >
                <FaPencilAlt />
              </label>
              <button
                type="button"
                className="bookingUserRemovePhotoButton"
                aria-label="Remove photo"
                onClick={handleRemoveImage}
              >
                <FaTimes />
              </button>
            </div>
            <p className="bookingUserPhotoHint">Allowed file types: png, jpg, jpeg.</p>
          </div>
        </div>

        <div className="bookingUserGrid">
          <div className="bookingUserFieldGroup">
            <label className="bookingUserLabel">
              Name <span className="bookingUserRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingUserInput"
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </div>

          <div className="bookingUserFieldGroup">
            <label className="bookingUserLabel">
              Mobile Number <span className="bookingUserRequired">*</span>
            </label>
            <input
              type="text"
              className="bookingUserInput"
              placeholder="Mobile Number"
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  mobileNumber: e.target.value,
                }))
              }
            />
          </div>

          <div className="bookingUserFieldGroup bookingUserFullRow">
            <label className="bookingUserLabel">Email Id</label>
            <input
              type="email"
              className="bookingUserInput"
              placeholder="Email Id"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="bookingUserFooter">
          <button type="button" className="bookingUserCloseButton" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="bookingUserCreateButton"
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