import "../assets/CSS/DeleteUserModal.css";

export default function DeleteUserModal({
  userName,
  onClose,
  onDelete,
  // Optional — lets this same confirmation modal be reused for other
  // entity types (e.g. "admin" from Pages/Admin.jsx) without changing
  // its existing behavior for User Management, which never passes this
  // prop and keeps getting "user" exactly as before.
  entityLabel = "user",
}) {
  return (
    <div className="userDelete__overlay" onClick={onClose}>
      <div className="userDelete__container" onClick={(e) => e.stopPropagation()}>
        <div className="userDelete__iconWrap">
          <svg
            className="userDelete__icon"
            viewBox="0 0 70 70"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="35"
              cy="35"
              r="31"
              fill="none"
              stroke="#f2c744"
              strokeWidth="4"
            />
            <rect x="32.5" y="18" width="5" height="24" rx="2.5" fill="#f2c744" />
            <circle cx="35" cy="50" r="3" fill="#f2c744" />
          </svg>
        </div>

        <h2 className="userDelete__title">Are you sure!</h2>

        <p className="userDelete__message" style={{ color: "#1b2a4e" }}>
          you want to delete  <span className="userDelete__highlight" style={{ color: "#e0331e" }}>
            {userName}
          </span>{" "} {entityLabel}?
        </p>
         
        <button type="button" className="userDelete__okayBtn" onClick={onDelete}>
          Okay
        </button>
      </div>
    </div>
  );
}