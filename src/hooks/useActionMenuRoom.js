import { useLayoutEffect } from "react";

// Row "Action" dropdowns are absolutely positioned inside a table wrapper that
// has `overflow-y: hidden`, so a menu taller than the space left under its row
// was cut off (e.g. "Delete" at the bottom of the Guest List menu). A fixed
// `padding-bottom` could not fit every menu, because the number of items
// changes with the guest's status.
//
// This hook measures the OPEN menu and, if it sticks out below the wrapper,
// adds exactly the missing room as extra bottom padding while the menu is open.
//
//   wrapperRef   - ref of the scroll wrapper around the table
//   openKey      - id of the row whose menu is open (null = none)
//   openSelector - CSS selector of the open menu, e.g. ".contactAction__menuOpen"
export default function useActionMenuRoom(wrapperRef, openKey, openSelector) {
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    // Back to the stylesheet's own padding, then measure.
    wrapper.style.paddingBottom = "";

    if (openKey === null || openKey === undefined) return undefined;

    const menu = wrapper.querySelector(openSelector);
    if (!menu) return undefined;

    const base = parseFloat(window.getComputedStyle(wrapper).paddingBottom) || 0;
    const menuBottom = menu.getBoundingClientRect().bottom;
    const wrapperBottom = wrapper.getBoundingClientRect().bottom;
    const missing = menuBottom + 16 - wrapperBottom; // 16px breathing room

    if (missing > 0) {
      wrapper.style.paddingBottom = `${Math.ceil(base + missing)}px`;
    }

    return () => {
      wrapper.style.paddingBottom = "";
    };
  }, [wrapperRef, openKey, openSelector]);
}
