import { useEffect } from "react";

// Row "Action" dropdowns (Guest List, Contact Book, Event History, Ghost List,
// User, Admin, Crew ... every page) are absolutely positioned INSIDE the table
// wrapper, which scrolls (`overflow-x: auto` also forces overflow-y to auto).
// So a menu taller than the space under its row was clipped, or the table got
// an extra scroll bar.
//
// This hook fixes ALL of them in one place, with no change to the pages:
// while a menu is open (its class ends with "Action__menuOpen") it is pulled
// out of the clipping area with `position: fixed`, placed under its Action
// button (or ABOVE it when there is no room below), and kept inside the
// screen. When the menu closes, the inline styles are removed again.
//
// Menus that already use `position: fixed` (Duplicate tab) are left alone.

const OPEN_SELECTOR = '[class*="Action__menuOpen"]';
const GAP = 6;
const EDGE = 8;
const TOUCHED = "data-floating-menu";

const place = (menu) => {
  const wrapper = menu.closest('[class*="Action__wrapper"]') || menu.parentElement;
  const button = wrapper?.querySelector('[class*="Action__button"]');
  if (!button) return;

  // Already fixed by its own stylesheet (not ours) -> leave it.
  if (
    menu.getAttribute(TOUCHED) !== "1" &&
    window.getComputedStyle(menu).position === "fixed"
  ) {
    return;
  }

  const b = button.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;

  let top = b.bottom + GAP;
  if (top + height > window.innerHeight - EDGE) {
    const above = b.top - GAP - height;
    top = above >= EDGE ? above : Math.max(EDGE, window.innerHeight - EDGE - height);
  }
  const left = Math.min(
    Math.max(EDGE, b.right - width),
    Math.max(EDGE, window.innerWidth - EDGE - width)
  );

  menu.setAttribute(TOUCHED, "1");
  menu.style.position = "fixed";
  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.right = "auto";
  menu.style.bottom = "auto";
  menu.style.zIndex = "100000";

  // The row's own cell can be a stacking context (sticky Actions column):
  // lift it so the next rows can never paint over the open menu.
  const cell = menu.closest("td");
  if (cell) {
    cell.setAttribute(TOUCHED, "1");
    cell.style.zIndex = "100000";
  }
};

const release = (menu) => {
  ["position", "top", "left", "right", "bottom", "z-index"].forEach((prop) =>
    menu.style.removeProperty(prop)
  );
  menu.removeAttribute(TOUCHED);
  const cell = menu.closest("td");
  if (cell && cell.getAttribute(TOUCHED) === "1") {
    cell.style.removeProperty("z-index");
    cell.removeAttribute(TOUCHED);
  }
};

const sync = () => {
  document.querySelectorAll(OPEN_SELECTOR).forEach(place);
  // Menus we moved earlier that are no longer open.
  document
    .querySelectorAll(`[class*="Action__menu"][${TOUCHED}="1"]`)
    .forEach((menu) => {
      if (!menu.matches(OPEN_SELECTOR)) release(menu);
    });
};

export default function useFloatingActionMenus() {
  useEffect(() => {
    // Runs right after React changes the DOM, before the browser paints.
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // Scrolling / resizing moves the button -> keep the menu under it.
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.querySelectorAll(OPEN_SELECTOR).forEach(place);
      });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, []);
}
