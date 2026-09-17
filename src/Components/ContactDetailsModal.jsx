import { useMemo } from "react";
import { useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/ContactDetailsModal.css";

// Same "-" fallback + DD-MM-YYYY formatting convention already used across
// the admin list pages (see Pages/User.jsx's created-date formatting).
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default function ContactDetailsModal({ contact, onClose }) {
  // Reference (normalized, case-insensitive) -> every contact name that
  // holds it — same grouped data source Contactlist.jsx's own Reference
  // column already uses, so a reference shared by multiple contacts
  // (e.g. Karan and Ramesh both having "a") shows every holder's name
  // right here in the existing Reference row, instead of a separate
  // Reference Summary section/page. Hooks must run unconditionally
  // (before the `!contact` early return below), same as any other hook.
  const { referenceSummary } = useSelector((state) => state.contact);

  const referenceContactsByKey = useMemo(() => {
    const map = new Map();

    (referenceSummary || []).forEach((group) => {
      if (!group || typeof group.reference !== "string") return;

      const key = group.reference.trim().toLowerCase();
      const names = Array.isArray(group.contacts) ? group.contacts : [];

      map.set(key, names);
    });

    return map;
  }, [referenceSummary]);

  const references = useMemo(() => {
    const list = Array.isArray(contact?.references)
      ? contact.references.filter(
          (reference) => typeof reference === "string" && reference.trim()
        )
      : [];

    // Alphabetical, case-insensitive (e.g. a, b, c, d, h, n, v).
    return list
      .slice()
      .sort((a, b) =>
        a.trim().toLowerCase().localeCompare(b.trim().toLowerCase())
      );
  }, [contact]);

  if (!contact) return null;

  const isInactive = contact.status === "inactive";

  return (
    <div className="contactDetailsOverlay" onClick={onClose}>
      <div
        className="contactDetailsContainer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contactDetailsHeader">
          <h2 className="contactDetailsTitle">Contact Details</h2>
          <button
            type="button"
            className="contactDetailsCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="contactDetailsProfileSection">
          <div className="contactDetailsNameStatus">
            <span className="contactDetailsProfileName">
              {contact.fullName || "-"}
            </span>
            <span
              className={`contactDetailsStatusBadge ${
                isInactive
                  ? "contactDetailsStatus--inactive"
                  : "contactDetailsStatus--active"
              }`}
            >
              {isInactive ? "Inactive" : "Active"}
            </span>
          </div>
        </div>

        <div className="contactDetailsGrid">
          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">WhatsApp Number</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {contact.whatsappNumber || "-"}
            </span>
          </div>

          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">Company Name</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {contact.companyName || "-"}
            </span>
          </div>

          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">Company Category</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {contact.companyCategory?.name || "-"}
            </span>
          </div>

          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">Address</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {contact.address || "-"}
            </span>
          </div>

          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">References</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {references.length === 0 ? (
                "-"
              ) : (
                <span className="contactDetailsReferenceList">
                  {references.map((reference) => {
                    // Same reference shared by another contact (e.g.
                    // Karan and Ramesh both having "a") is shown combined
                    // right in this existing chip — "a (Karan, Ramesh)".
                    const sharedWith =
                      referenceContactsByKey.get(
                        reference.trim().toLowerCase()
                      ) || [];
                    const label =
                      sharedWith.length > 1
                        ? `${reference} (${sharedWith.join(", ")})`
                        : reference;

                    return (
                      <span
                        key={reference}
                        className="contactDetailsReferenceChip"
                      >
                        {label}
                      </span>
                    );
                  })}
                </span>
              )}
            </span>
          </div>

          <div className="contactDetailsRow">
            <span className="contactDetailsLabel">Created Date</span>
            <span className="contactDetailsColon">:</span>
            <span className="contactDetailsValue">
              {formatDate(contact.createdAt)}
            </span>
          </div>
        </div>

        <div className="contactDetailsFooter">
          <button
            type="button"
            className="contactDetailsCloseButton"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}