import Swal from "sweetalert2";
import "../assets/CSS/AppSwal.css";

// One themed SweetAlert2 used for every confirm / result popup in the admin
// (rounded card, app font, soft blue confirm button, red for destructive).
// Plain Swal.fire(...) calls elsewhere keep working exactly as before.
const themed = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  showClass: { popup: "appSwal__in" },
  hideClass: { popup: "appSwal__out" },
  customClass: {
    popup: "appSwal",
    icon: "appSwal__icon",
    title: "appSwal__title",
    htmlContainer: "appSwal__body",
    actions: "appSwal__actions",
    confirmButton: "appSwal__btn appSwal__btn--confirm",
    cancelButton: "appSwal__btn appSwal__btn--cancel",
  },
});

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

// Confirm dialog -> resolves true / false.
//   tone: "warning" (orange) | "danger" (red button) | "info" (blue)
//   points: [{ icon: "🔒", text: "..." }] bullet rows shown under the text
export const confirmDialog = async ({
  title,
  text = "",
  points = [],
  confirmText = "Yes, continue",
  cancelText = "Cancel",
  tone = "warning",
}) => {
  const pointsHtml = points.length
    ? `<ul class="appSwal__points">${points
        .map(
          (p) =>
            `<li><span class="appSwal__pointIcon">${escapeHtml(p.icon || "•")}</span><span>${escapeHtml(p.text)}</span></li>`
        )
        .join("")}</ul>`
    : "";

  const result = await themed.fire({
    icon: tone === "info" ? "info" : "warning",
    title,
    html: `${text ? `<p class="appSwal__text">${escapeHtml(text)}</p>` : ""}${pointsHtml}`,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      popup: "appSwal",
      icon: "appSwal__icon",
      title: "appSwal__title",
      htmlContainer: "appSwal__body",
      actions: "appSwal__actions",
      confirmButton: `appSwal__btn appSwal__btn--confirm${tone === "danger" ? " appSwal__btn--danger" : ""}`,
      cancelButton: "appSwal__btn appSwal__btn--cancel",
    },
  });

  return result.isConfirmed;
};

// Result / notice popup (no cancel button). icon: success | error | warning | info
export const noticeDialog = ({ icon = "info", title, text = "", hint = "", confirmText = "OK" }) =>
  themed.fire({
    icon,
    title,
    html:
      (text ? `<p class="appSwal__text">${escapeHtml(text)}</p>` : "") +
      (hint ? `<p class="appSwal__hint">${escapeHtml(hint)}</p>` : ""),
    confirmButtonText: confirmText,
    focusCancel: false,
    reverseButtons: false,
  });

export default themed;
