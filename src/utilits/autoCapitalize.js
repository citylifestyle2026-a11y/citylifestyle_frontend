// ================= SITE-WIDE AUTO-CAPITALIZATION =================
// Requirement: anywhere on the site, the very first letter typed into a
// text field (before any space exists yet) AND the first letter typed
// right after a space should be automatically uppercased as the user
// types — i.e. every word gets Capitalized automatically.
//
// Rather than touching every single form's onChange handler across the
// project (CreateContactModal, CreateUserModal, CreateEvent, etc.),
// this is wired up ONCE (see main.jsx) as a single global `input`
// listener attached in the CAPTURE phase on `document`. Capture runs
// BEFORE React's own listener (React 17+ attaches its listeners on the
// root container during the bubble phase), so by the time React reads
// `event.target.value` to feed a controlled input's `onChange`, the
// value has already been capitalized — no need to touch any existing
// component.
//
// Field types that should never be auto-capitalized (emails, passwords,
// numbers, phone numbers, dates, etc.) are excluded below.

const EXCLUDED_INPUT_TYPES = new Set([
  "password",
  "email",
  "url",
  "number",
  "tel",
  "search",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "color",
  "range",
  "file",
  "checkbox",
  "radio",
  "hidden",
  "submit",
  "button",
  "reset",
]);

// Opt a specific field out with data-no-autocap="true" (e.g. a
// reference/tag input where casing is intentionally user-controlled),
// should that ever be needed — none of the current fields use it.
function isEligibleField(target) {
  if (!target || !target.tagName) return false;
  if (target.dataset && target.dataset.noAutocap === "true") return false;

  if (target.tagName === "TEXTAREA") return true;

  if (target.tagName === "INPUT") {
    const type = (target.type || "text").toLowerCase();
    return !EXCLUDED_INPUT_TYPES.has(type);
  }

  return false;
}

// Uppercases the very first character of the string, and the first
// character following any whitespace run. Leaves everything else
// (including characters the user already typed in whatever case they
// chose mid-word) untouched.
export function capitalizeWords(value) {
  if (!value) return value;
  return value.replace(/(^|\s)([a-z])/g, (_match, boundary, letter) =>
    boundary + letter.toUpperCase()
  );
}

export function initAutoCapitalize() {
  if (typeof document === "undefined") return;

  document.addEventListener(
    "input",
    (event) => {
      const target = event.target;

      // Ignore IME composition keystrokes (e.g. while typing in
      // Gujarati/Hindi input methods) — only act once composition ends.
      if (event.isComposing) return;

      if (!isEligibleField(target)) return;

      const original = target.value;
      const capitalized = capitalizeWords(original);

      if (capitalized === original) return;

      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;

      // Set the value via the native property setter (not
      // `target.value = ...` directly) so React's own change-tracking
      // still detects this as a "new" value once its listener runs
      // right after this one, in the bubble phase.
      const prototype =
        target.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(target, capitalized);
      } else {
        target.value = capitalized;
      }

      // Only the letter-casing changed, never the length, so the
      // caret's numeric position is still valid — just restore it,
      // since setting `.value` programmatically resets the caret to
      // the end otherwise.
      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        target.setSelectionRange(selectionStart, selectionEnd);
      }
    },
    true // capture phase — must run before React's listener
  );
}
