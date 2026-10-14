// Shared date display helpers — same look as Event.jsx / Event History:
//   formatDate      -> 29-09-2026
//   formatDateTime  -> 29-09-2026 10:57 AM
// Only changes how a value is DISPLAYED; stored values are untouched.

export const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${formatDate(value)} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};