import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/CreatePermissionModal.css";

export default function CreatePermissionModal({ onClose, isEditMode = false, selectedPermission = null }) {
  const [name, setName] = useState(selectedPermission?.name || "");

  return (
    <div className="permissionCreateOverlay" onClick={onClose}>
      <div className="permissionCreateContainer" onClick={(e) => e.stopPropagation()}>
        <div className="permissionCreateHeader">
          <h2 className="permissionCreateTitle">
            {isEditMode ? "Edit Permission" : "Add Permission"}
          </h2>
          <button
            type="button"
            className="permissionCreateCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="permissionCreateFieldGroup">
          <label className="permissionCreateLabel">
            Role <span className="permissionCreateRequired">*</span>
          </label>
          <input
            type="text"
            className="permissionCreateInput"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="permissionCreateFooter">
          <button type="button" className="permissionCreateCloseButton" onClick={onClose}>
            Close
          </button>
          <button type="button" className="permissionCreateCreateButton">
            {isEditMode ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
