import "../assets/CSS/DeleteRoleModal.css";

export default function DeleteRoleModal({ roleName, onClose }) {
  return (
    <div className="roleDeleteOverlay" onClick={onClose}>
      <div className="roleDeleteContainer" onClick={(e) => e.stopPropagation()}>
        <h2 className="roleDeleteTitle">Delete Role</h2>
        <p className="roleDeleteMessage">
          Are you sure want to delete <span className="roleDeleteHighlight">{roleName}</span>?
        </p>

        <div className="roleDeleteFooter">
          <button type="button" className="roleDeleteCloseBtn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="roleDeleteDeleteBtn">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
