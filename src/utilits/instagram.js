// Instagram ID helpers — same rules as the backend's
// utils/normalizeInstagramId.js, so the form can show an error before the
// request is even sent.
//   "@Karan.Shah" / "karan.shah" / "https://instagram.com/karan.shah/?hl=en"
//   -> "karan.shah"
const INSTAGRAM_USERNAME_REGEX = /^[a-z0-9._]{1,30}$/;

export const normalizeInstagramId = (value) => {
  let v = String(value ?? "").trim();
  if (!v) return "";

  const linkMatch = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (linkMatch) v = linkMatch[1];

  return v.replace(/^@+/, "").trim().toLowerCase();
};

// An empty value is valid (Instagram ID is optional).
export const isValidInstagramId = (value) => {
  const normalized = normalizeInstagramId(value);
  return !normalized || INSTAGRAM_USERNAME_REGEX.test(normalized);
};

export const getInstagramUrl = (id) =>
  id ? `https://instagram.com/${encodeURIComponent(id)}` : "";
