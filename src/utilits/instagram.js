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

// ---------------------------------------------------------------------
// The contact forms ask for the Instagram PROFILE LINK (not a name).
// Returns "" when OK (blank is fine - the field is optional) or an error
// message. Same rule as the backend (utils/normalizeInstagramId.js).
//   https://instagram.com/karan.shah  OK
//   instagram.com/karan.shah/?hl=en   OK
//   karan.shah / @karan.shah          error (a name, not a link)
//   https://instagram.com/p/abc       error (a post, not a profile)
// ---------------------------------------------------------------------
const INSTAGRAM_LINK_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{1,30})\/?(?:[?#].*)?$/i;
const INSTAGRAM_RESERVED_PATHS = ["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct", "about"];

export const instagramLinkError = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const match = raw.match(INSTAGRAM_LINK_REGEX);
  if (!match || INSTAGRAM_RESERVED_PATHS.includes(match[1].toLowerCase())) {
    return "Please enter the Instagram profile link (e.g. https://instagram.com/username), not a name.";
  }
  return "";
};

export const getInstagramUrl = (id) =>
  id ? `https://instagram.com/${encodeURIComponent(id)}` : "";
