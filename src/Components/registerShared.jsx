import { isValidMobileNumber, MOBILE_ERROR_MESSAGE } from "../utilits/mobileNumber";

// Shared by RegisterUsers.jsx (staff) and PublicRegisterUser.jsx (public link).
// Both pages used to carry an identical copy of everything below; only the
// CSS class prefix of the icons differs ("bookingRegister" / "publicRegister").

export const makeRegisterIcons = (prefix) => {
  function UploadPhotoPlaceholder() {
    return (
      <svg
        className={`${prefix}-avatarIcon`}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="8" r="4" fill="#ffffff" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#ffffff" />
      </svg>
    );
  }

  function EditIcon() {
    return (
      <svg
        className={`${prefix}-editIcon`}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 20l1-4 11-11 3 3-11 11-4 1z"
          fill="none"
          stroke="#3a3d4d"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function RegisteredAvatarPlaceholder() {
    return (
      <svg
        className={`${prefix}-registeredAvatarIcon`}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="8" r="4" fill="#ffffff" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#ffffff" />
      </svg>
    );
  }

  return { UploadPhotoPlaceholder, EditIcon, RegisteredAvatarPlaceholder };
};

export const emptyForm = {
  name: "",
  mobileNumber: "",
  email: "",
  profileImage: null,
  previewImage: "",
};

// Returns a { fieldName: message } map so each error can render directly
// below its own field.
export const getFieldErrors = (form) => {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Please enter name.";
  } else if (!/^[A-Za-z ]+$/.test(form.name)) {
    errors.name = "Name is invalid.";
  }

  // Valid with OR without 91 (9876543210 / 919876543210).
  if (!isValidMobileNumber(form.mobileNumber)) {
    errors.mobileNumber = MOBILE_ERROR_MESSAGE;
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter valid email.";
  }

  return errors;
};

// Maps a backend validation message to the field it is about, so it is shown
// right under that field instead of only as a toast.
export const mapBackendMessageToField = (message) => {
  if (!message) return null;
  if (/mobile/i.test(message)) return "mobileNumber";
  if (/email/i.test(message)) return "email";
  if (/\bname\b/i.test(message)) return "name";
  return null;
};
