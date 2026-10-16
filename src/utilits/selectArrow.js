// ================= SITE-WIDE DROPDOWN ARROW =================
// Problem: a plain <select> shows the browser's own tiny arrow, jammed
// against the right edge (very visible on rounded / pill dropdowns).
//
// Instead of editing every page's CSS, this is wired up ONCE (see main.jsx):
// every single-choice <select> that is still using the browser's native look
// gets a clear chevron with proper spacing. Dropdowns that already draw their
// own arrow (appearance: none, or a background image) are left alone, so
// nothing that looks right today changes.
//
// The arrow takes the dropdown's own text colour, so it is dark on light
// forms and light on dark forms automatically. Rounded (pill) dropdowns get
// a little more room than square ones.

const MARK = "data-arrow";

const chevron = (color) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='${color}' stroke-width='2' fill='none' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round'/></svg>`
  )}")`;

const styleSelect = (select) => {
  if (select.hasAttribute(MARK) || select.multiple || select.size > 1) return;

  const cs = window.getComputedStyle(select);

  // Already draws its own arrow -> leave it exactly as it is.
  if (cs.appearance === "none" || cs.webkitAppearance === "none") return;
  if (cs.backgroundImage && cs.backgroundImage !== "none") return;
  // Not rendered yet (display: none) -> try again when it appears.
  if (cs.display === "none") return;

  const isPill = parseFloat(cs.borderTopRightRadius) >= 20;
  const arrowRight = isPill ? 22 : 14;
  const minPadding = isPill ? 52 : 38;

  select.setAttribute(MARK, "1");
  select.style.appearance = "none";
  select.style.webkitAppearance = "none";
  select.style.backgroundImage = chevron(cs.color || "#4a4f5c");
  select.style.backgroundRepeat = "no-repeat";
  select.style.backgroundPosition = `right ${arrowRight}px center`;
  select.style.backgroundSize = "14px 9px";

  if (parseFloat(cs.paddingRight) < minPadding) {
    select.style.paddingRight = `${minPadding}px`;
  }
};

const scan = (root) => {
  if (!root || root.nodeType !== 1) return;
  if (root.tagName === "SELECT") styleSelect(root);
  root.querySelectorAll?.("select").forEach(styleSelect);
};

export const initSelectArrow = () => {
  if (typeof window === "undefined" || window.__selectArrowInit) return;
  window.__selectArrowInit = true;

  let queued = false;
  const pending = new Set();

  const flush = () => {
    queued = false;
    pending.forEach(scan);
    pending.clear();
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => pending.add(node));
      // A hidden dropdown that becomes visible (class / style change).
      if (mutation.type === "attributes") pending.add(mutation.target);
    }
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(flush);
    }
  });

  const start = () => {
    scan(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
};
