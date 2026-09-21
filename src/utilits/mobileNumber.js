// ================= MOBILE NUMBER (WITH / WITHOUT 91) =================
// Same rule as the backend (utils/normalizeMobileNumber.js) — keep the two
// in sync. A mobile number is valid with OR without the India country
// code, and is always sent to the API in ONE form: "91" + 10 digits.
//
//   9876543210       -> 919876543210
//   919876543210     -> 919876543210
//   +91 98765 43210  -> 919876543210
//
// The 10-digit local number must start with 6-9.
export const MOBILE_ERROR_MESSAGE =
  "Please enter a valid 10-digit mobile number (with or without 91).";

// Returns "91XXXXXXXXXX", or "" when the value is not a valid number.
export const normalizeMobileNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "";

  if (!/^\+?[\d\s\-().]+$/.test(text)) return "";

  const hasPlus = text.startsWith("+");
  const digits = text.replace(/\D/g, "");

  let localNumber;
  if (digits.length === 12 && digits.startsWith("91")) {
    localNumber = digits.slice(2);
  } else if (digits.length === 10 && !hasPlus) {
    localNumber = digits;
  } else {
    return "";
  }

  return /^[6-9]\d{9}$/.test(localNumber) ? `91${localNumber}` : "";
};

export const isValidMobileNumber = (value) =>
  normalizeMobileNumber(value) !== "";

// Contacts (WhatsApp number), Admins and Users are stored as a bare
// 10-digit number (login uses it as-is). They accept 91 / +91 in front
// too, but always send the 10 digits: "+91 98765 43210" -> "9876543210".
// Returns "" when the value is not a valid number.
export const toLocalMobileNumber = (value) =>
  normalizeMobileNumber(value).slice(2);

export const LOCAL_MOBILE_ERROR_MESSAGE =
  "Enter a valid 10-digit mobile number (with or without 91).";

// For onChange handlers: keeps digits only and caps the length at 12
// ("91" + 10 digits). Pasting "+91 98765 43210" therefore becomes
// "919876543210" instead of being cut off by a maxLength of 10.
export const sanitizeMobileInput = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 12);
