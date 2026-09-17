import { FaTimes } from "react-icons/fa";
import "../assets/CSS/PermissionModal.css";

export default function PermissionModal({ role, onClose }) {
  if (!role) return null;

  const permissionList = role.permissions || [];

  return (
    <div className="permissionModalOverlay" onClick={onClose}>
      <div className="permissionModalContainer" onClick={(e) => e.stopPropagation()}>
        <div className="permissionModalHeader">
          <h2 className="permissionModalTitle">Permission</h2>
          <button
            type="button"
            className="permissionModalCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <p className="permissionModalSubtitle">
          {permissionList.length} Permission{permissionList.length !== 1 ? "s" : ""} ·{" "}
          <span className="permissionModalRole">{role.role}</span>
        </p>

        <div className="permissionModalGrid">
          {permissionList.map((permission, index) => (
            <div className="permissionModalItem" key={permission}>
              <span className="permissionModalItemNumber">{index + 1}.</span>
              <span>{permission}</span>
            </div>
          ))}
        </div>

        <div className="permissionModalFooter">
          <button type="button" className="permissionModalCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}