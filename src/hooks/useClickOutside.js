import { useEffect, useRef } from "react";

// Calls `onOutside` when the user presses the mouse outside `ref`'s element.
// Replaces the identical mousedown listener every list page used to repeat
// for its row-action dropdown.
export default function useClickOutside(ref, onOutside) {
  const handlerRef = useRef(onOutside);

  useEffect(() => {
    handlerRef.current = onOutside;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handlerRef.current();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
