import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";

import {
  createEventHistory,
  updateEventHistory,
  getAllEventHistory,
} from "../redux/contactEventHistory/contactEventHistoryThunk";
import { clearContactEventHistoryState } from "../redux/contactEventHistory/contactEventHistorySlice";
import { getAllContacts } from "../redux/contact/contactThunk";
import { getAllEditions } from "../redux/edition/editionThunk";

import "../assets/CSS/CreateEventHistoryModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

// Must stay in sync with backend/models/contactEventHistory.model.js's
// STATUS_VALUES.
const STATUS_OPTIONS = [
  "Invited",
  "Confirmed",
  "Attended",
  "Not Attended",
  "Cancelled",
];

// Contact List -> Event History: the "Add Details" modal. On CREATE, a
// single Contact is picked from a dropdown and one or more Editions are
// picked via checkboxes ("je check box par check kare te multiple check
// thai and add thai" — every checked edition becomes its own event
// history entry for that contact, in one submit). On EDIT, an entry
// only ever has ONE edition (that's what it was created with), so it's
// a plain dropdown instead, matching updateEventHistory's own shape —
// and the Contact it belongs to is shown read-only, since the backend
// never allows moving an entry to a different contact.
export default function CreateEventHistoryModal({
  onClose,
  isEditMode = false,
  editEntry = null,
  currentQuery = {},
}) {
  const dispatch = useDispatch();

  const { actionLoading, actionError } = useSelector(
    (state) => state.contactEventHistory
  );
  const { contacts, loading: contactsLoading } = useSelector((state) => state.contact);
  const { editions, loading: editionsLoading } = useSelector((state) => state.edition);

  const [contactId, setContactId] = useState("");
  const [editionId, setEditionId] = useState(""); // edit mode only
  const [selectedEditionIds, setSelectedEditionIds] = useState([]); // create mode only
  const [status, setStatus] = useState("Invited");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearContactEventHistoryState());
    dispatch(getAllContacts({ page: 1, limit: 500 }));
    dispatch(getAllEditions({ limit: 100, sortBy: "editionNumber", sortOrder: "desc" }));
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && editEntry) {
      setContactId(editEntry.contactId?._id || editEntry.contactId || "");
      setEditionId(editEntry.editionId?._id || editEntry.editionId || "");
      setStatus(editEntry.status || "Invited");
      setNotes(editEntry.notes || "");
    } else {
      setContactId("");
      setSelectedEditionIds([]);
      setStatus("Invited");
      setNotes("");
    }
    setFormError("");
  }, [isEditMode, editEntry]);

  const contactOptions = useMemo(
    () => (contacts || []).map((c) => ({ value: c._id, label: `${c.fullName} (${c.whatsappNumber})` })),
    [contacts]
  );

  const editEntryContactLabel = useMemo(() => {
    if (!isEditMode || !editEntry) return "";
    const c = editEntry.contactId;
    if (c && typeof c === "object") return `${c.fullName} (${c.whatsappNumber})`;
    const found = (contacts || []).find((x) => x._id === contactId);
    return found ? `${found.fullName} (${found.whatsappNumber})` : "";
  }, [isEditMode, editEntry, contacts, contactId]);

  const toggleEdition = (id) => {
    setSelectedEditionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (actionLoading) return;

    if (!contactId) {
      setFormError("Please select a Contact.");
      return;
    }

    try {
      if (isEditMode && editEntry) {
        if (!editionId) {
          setFormError("Please select an Edition.");
          return;
        }

        const res = await dispatch(
          updateEventHistory({ id: editEntry._id, data: { editionId, status, notes } })
        ).unwrap();

        showSuccess(res?.message || "Event history entry updated successfully");
      } else {
        if (selectedEditionIds.length === 0) {
          setFormError("Please select at least one Edition.");
          return;
        }

        // One backend create call per checked edition — createEventHistory
        // (backend) only ever takes a single (contactId, editionId) pair;
        // the checkbox multi-select is a frontend convenience on top of it.
        const results = await Promise.allSettled(
          selectedEditionIds.map((id) =>
            dispatch(createEventHistory({ contactId, editionId: id, status, notes })).unwrap()
          )
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - succeeded;

        if (succeeded > 0) {
          showSuccess(
            `${succeeded} event history ${succeeded === 1 ? "entry" : "entries"} added successfully` +
              (failed ? ` (${failed} failed)` : "")
          );
        }
        if (succeeded === 0) {
          showError("Failed to add event history entries.");
          return;
        }
      }

      dispatch(getAllEventHistory(currentQuery));
      dispatch(clearContactEventHistoryState());
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Failed to save event history entry"));
    }
  };

  return (
    <div className="eventHistoryModalOverlay" onClick={onClose}>
      <div className="createEventHistoryModal" onClick={(e) => e.stopPropagation()}>
        <div className="eventHistoryModalHeader">
          <h2 className="eventHistoryModalTitle">
            {isEditMode ? "Edit Event History" : "Add Event History Details"}
          </h2>
          <button
            type="button"
            className="eventHistoryCloseIconButton"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="eventHistoryFormGrid">
            <div className="eventHistoryFieldGroup">
              <label className="eventHistoryFieldLabel">
                Contact <span className="eventHistoryRequired">*</span>
              </label>
              {isEditMode ? (
                <input
                  className="eventHistoryFieldInput"
                  value={editEntryContactLabel}
                  disabled
                  readOnly
                />
              ) : (
                <select
                  className="eventHistoryFieldSelect"
                  value={contactId}
                  onChange={(e) => {
                    setContactId(e.target.value);
                    setFormError("");
                  }}
                  disabled={contactsLoading}
                >
                  <option value="">
                    {contactsLoading ? "Loading contacts..." : "Select Contact"}
                  </option>
                  {contactOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isEditMode ? (
              <div className="eventHistoryFieldGroup">
                <label className="eventHistoryFieldLabel">
                  Edition <span className="eventHistoryRequired">*</span>
                </label>
                <select
                  className="eventHistoryFieldSelect"
                  value={editionId}
                  onChange={(e) => {
                    setEditionId(e.target.value);
                    setFormError("");
                  }}
                  disabled={editionsLoading}
                >
                  <option value="">
                    {editionsLoading ? "Loading editions..." : "Select Edition"}
                  </option>
                  {(editions || []).map((ed) => (
                    <option key={ed._id} value={ed._id}>
                      {ed.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="eventHistoryFieldGroup">
                <label className="eventHistoryFieldLabel">
                  Editions <span className="eventHistoryRequired">*</span>
                </label>
                <div className="eventHistoryCheckboxGrid">
                  {editionsLoading && (
                    <p className="eventHistoryCheckboxEmpty">Loading editions...</p>
                  )}
                  {!editionsLoading && (editions || []).length === 0 && (
                    <p className="eventHistoryCheckboxEmpty">
                      No editions available. Add one from the Editions page first.
                    </p>
                  )}
                  {(editions || []).map((ed) => {
                    const checked = selectedEditionIds.includes(ed._id);
                    return (
                      <label
                        key={ed._id}
                        className={`eventHistoryCheckboxItem${
                          checked ? " eventHistoryCheckboxItem--checked" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEdition(ed._id)}
                        />
                        <span title={ed.name}>{ed.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="eventHistoryFieldHint">
                  Tick every edition this contact was part of — one entry is added per edition.
                </p>
              </div>
            )}

            <div className="eventHistoryFieldGroup">
              <label className="eventHistoryFieldLabel">Status</label>
              <select
                className="eventHistoryFieldSelect"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="eventHistoryFieldGroup">
              <label className="eventHistoryFieldLabel">Notes</label>
              <textarea
                className="eventHistoryFieldTextarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {(formError || actionError) && (
            <p className="eventHistoryFieldError">
              {formError ||
                (typeof actionError === "string" ? actionError : "Something went wrong.")}
            </p>
          )}

          <div className="eventHistoryModalFooter">
            <button
              type="button"
              className="eventHistoryModalCloseButton"
              onClick={onClose}
              disabled={actionLoading}
            >
              Close
            </button>
            <button
              type="submit"
              className="eventHistoryModalSaveButton"
              disabled={actionLoading}
            >
              {actionLoading ? "Saving..." : isEditMode ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
