import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/DeletePermissionModal.css";

export default function DeletePermissionModal({ permissionName, count = 1, onClose, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isBulk = count > 1 || (count === 1 && !permissionName);

  return (
    <div className="permissionDeleteOverlay" onClick={onClose}>
      <div className="permissionDeleteModal" onClick={(e) => e.stopPropagation()}>
        <div className="permissionDeleteHeader">
          <h2 className="permissionDeleteTitle">Delete Permission</h2>
          <button
            type="button"
            className="permissionDeleteCloseIcon"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="permissionDeleteBody">
          {isBulk ? (
            <p className="permissionDeleteMessage">
              Are you sure want to delete <span className="permissionDeleteHighlight">{count}</span>{" "}
              {count === 1 ? "Permission" : "Permissions"}?
            </p>
          ) : (
            <p className="permissionDeleteMessage">
              Are you sure want to delete{" "}
              <span className="permissionDeleteHighlight">{permissionName}</span> ?
            </p>
          )}
        </div>

        <div className="permissionDeleteFooter">
          <button type="button" className="permissionDeleteCloseButton" onClick={onClose}>
            Close
          </button>
          <button type="button" className="permissionDeleteConfirmButton" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
