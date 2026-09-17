import { FaTimes } from "react-icons/fa";
import "../assets/CSS/CreateRoleModal.css";


const permissions = [
  "read entryReport",
  "delete expense",
  "update expense",
  "read expense",
  "create expense",
  "delete income",
  "update income",
  "read income",
  "create income",
  "read dashboard",
  "read crew",
  "delete crew",
  "update crew",
  "create crew",
  "read event",
  "create event",
  "delete booking",
  "create booking",
  "update booking",
  "read booking",
  "delete user",
  "update user",
  "read user",
  "create user",
  "delete role",
  "update role",
  "read role",
  "create role",
  "delete permission",
  "update permission",
  "read permission",
  "create permission",
];

export default function CreateRoleModal({ onClose, isEditMode = false, selectedRole = null }) {
  return (
    <div className="roleModalOverlay" onClick={onClose}>
      <div className="roleModalContainer" onClick={(e) => e.stopPropagation()}>
        <div className="roleModalHeader">
          <h2 className="roleModalTitle">{isEditMode ? "Edit Role" : "Add Role"}</h2>
          <button
            type="button"
            className="roleModalCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="roleModalBody">
          <div className="roleModalFieldGroup">
            <label className="roleModalLabel">
              Role <span className="roleModalRequired">*</span>
            </label>
            <input
              type="text"
              className="roleModalInput"
              placeholder="Name"
              defaultValue={isEditMode && selectedRole ? selectedRole.name : ""}
            />
          </div>

          <div className="roleModalFieldGroup">
            <label className="roleModalLabel">
              Permission <span className="roleModalRequired">*</span>
            </label>

            <div className="roleModalCheckAllRow">
              <input type="checkbox" className="roleModalCheckbox" id="roleModalCheckAll" />
              <label htmlFor="roleModalCheckAll" className="roleModalCheckAllLabel">
                Check all
              </label>
            </div>

            <div className="roleModalGrid">
              {permissions.map((permission) => (
                <div className="roleModalPermissionItem" key={permission}>
                  <input
                    type="checkbox"
                    className="roleModalCheckbox"
                    id={`roleModalPerm-${permission}`}
                    defaultChecked={
                      isEditMode && selectedRole
                        ? selectedRole.permission === "All Permission"
                        : false
                    }
                  />
                  <label
                    htmlFor={`roleModalPerm-${permission}`}
                    className="roleModalPermissionLabel"
                  >
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="roleModalFooter">
          <button type="button" className="roleModalCloseButton" onClick={onClose}>
            Close
          </button>
          <button type="button" className="roleModalCreateButton">
            {isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
