import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";

import {
  createEventHistory,
  updateEventHistory,
  deleteEventHistory,
  getAllEventHistory,
} from "../redux/contactEventHistory/contactEventHistoryThunk";
import { clearContactEventHistoryState } from "../redux/contactEventHistory/contactEventHistorySlice";
import { getAllContacts } from "../redux/contact/contactThunk";
import useEventOptions from "../hooks/useEventOptions";

import "../assets/CSS/CreateEventHistoryModal.css";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";

// Status is decided by the checkboxes, no dropdown: a TICKED event is
// "Attended" (green badge), an UN-TICKED one is "Not Attended" (red badge).
const ATTENDED = "Attended";
const NOT_ATTENDED = "Not Attended";

// Contact List -> Event History: the "Add Details" modal. On CREATE, a
// single Contact is picked from a dropdown and one or more Events are
// picked via checkboxes ("je check box par check kare te multiple check
// thai and add thai" — every checked event becomes its own event
// history entry for that contact, in one submit). On EDIT, an entry
// only ever has ONE event (that's what it was created with), so it's
// a plain dropdown instead, matching updateEventHistory's own shape —
// and the Contact it belongs to is shown read-only, since the backend
// never allows moving an entry to a different contact.
export default function CreateEventHistoryModal({
  onClose,
  isEditMode = false,
  editRow = null, // edit mode: the whole table row { contactId, isSpouse, entries[] }
  currentQuery = {},
}) {
  const dispatch = useDispatch();

  const { actionLoading, actionError } = useSelector(
    (state) => state.contactEventHistory
  );
  const { contacts, loading: contactsLoading } = useSelector((state) => state.contact);
  const { events, loading: eventsLoading } = useEventOptions();

  const [contactId, setContactId] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState([]); // checkbox multi-select (create + edit)
  const [notes, setNotes] = useState("");
  // Edit mode: notes the form was opened with, to know if they were changed.
  const [initialNotes, setInitialNotes] = useState("");
  // Per-field validation messages: { contact?: string, event?: string }.
  // Each one is rendered directly under its own field.
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dispatch(clearContactEventHistoryState());
    dispatch(getAllContacts({ page: 1, limit: 500 }));
  }, [dispatch]);

  // Entries added from Entry Report are fixed (shown ticked + disabled);
  // only entries added from this modal can be changed here.
  const rowEntries = useMemo(() => editRow?.entries || [], [editRow]);
  const manualEntries = useMemo(
    () => rowEntries.filter((e) => e.source !== "entry-report"),
    [rowEntries]
  );
  const lockedEntries = useMemo(
    () => rowEntries.filter((e) => e.source === "entry-report"),
    [rowEntries]
  );
  const lockedEventIds = useMemo(
    () => lockedEntries.map((e) => e.eventId?._id || e.eventId),
    [lockedEntries]
  );
  const entryEventId = (e) => e.eventId?._id || e.eventId || "";

  useEffect(() => {
    if (isEditMode && editRow) {
      // "<id>:spouse" = the spouse option of that contact (see contactOptions).
      setContactId(
        `${editRow.contactId?._id || editRow.contactId || ""}${
          editRow.isSpouse ? ":spouse" : ""
        }`
      );
      // Ticked = the entries that are currently "Attended".
      setSelectedEventIds(
        manualEntries.filter((e) => e.status === ATTENDED).map(entryEventId)
      );
      const firstNotes = manualEntries.find((e) => e.notes)?.notes || "";
      setNotes(firstNotes);
      setInitialNotes(firstNotes);
    } else {
      setContactId("");
      setSelectedEventIds([]);
      setNotes("");
    }
    setFormErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editRow]);

  // Every contact is an option; a Couple contact also gets a second
  // option for its SPOUSE (value "<contactId>:spouse").
  const contactOptions = useMemo(
    () =>
      (contacts || []).flatMap((c) => {
        const options = [{ value: c._id, label: `${c.fullName} (${c.whatsappNumber})` }];
        if (c.relationship === "Couple" && c.spouseName) {
          options.push({
            value: `${c._id}:spouse`,
            label: `${c.spouseName}${c.spouseMobile ? ` (${c.spouseMobile})` : ""} — Spouse of ${c.fullName}`,
          });
        }
        return options;
      }),
    [contacts]
  );

  const editEntryContactLabel = useMemo(() => {
    if (!isEditMode || !editRow) return "";
    const c = editRow.contactId;
    if (c && typeof c === "object") {
      return editRow.isSpouse
        ? `${c.spouseName || "-"}${c.spouseMobile ? ` (${c.spouseMobile})` : ""} — Spouse of ${c.fullName}`
        : `${c.fullName} (${c.whatsappNumber})`;
    }
    const found = contactOptions.find((o) => o.value === contactId);
    return found ? found.label : "";
  }, [isEditMode, editRow, contactOptions, contactId]);

  const toggleEvent = (id) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setFormErrors((prev) => ({ ...prev, event: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (actionLoading) return;

    // Validate every field first so all messages show together,
    // each one under its own field.
    const errors = {};
    if (!contactId) errors.contact = "Please select a Contact.";
    const lockedAttended = lockedEntries.some((e) => e.status === ATTENDED);
    if (selectedEventIds.length === 0 && !(isEditMode && lockedAttended)) {
      errors.event = "Please select at least one Event.";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      if (isEditMode && editRow) {
        const baseContactId = contactId.split(":")[0];
        const isSpouse = contactId.endsWith(":spouse");

        const manualByEvent = new Map(manualEntries.map((e) => [entryEventId(e), e]));
        const notesChanged = notes !== initialNotes;
        const ops = [];

        // Existing entries: ticked -> Attended (green), un-ticked -> Not
        // Attended (red). Only entries whose status / notes really change
        // are sent.
        for (const entry of manualEntries) {
          const ticked = selectedEventIds.includes(entryEventId(entry));
          let desired = entry.status;
          if (ticked) desired = ATTENDED;
          else if (entry.status === ATTENDED) desired = NOT_ATTENDED;

          if (desired !== entry.status || notesChanged) {
            ops.push(
              dispatch(
                updateEventHistory({
                  id: entry._id,
                  data: { status: desired, ...(notesChanged ? { notes } : {}) },
                })
              ).unwrap()
            );
          }
        }

        // Events this person has no entry for yet: only a TICK adds one
        // (Attended). Un-ticked ones are skipped, so an event created
        // after this guest was added never turns red by itself.
        const allExistingEventIds = new Set(rowEntries.map(entryEventId));
        for (const id of selectedEventIds) {
          if (manualByEvent.has(id) || allExistingEventIds.has(id)) continue;
          ops.push(
            dispatch(
              createEventHistory({
                contactId: baseContactId,
                isSpouse,
                eventId: id,
                status: ATTENDED,
                notes,
              })
            ).unwrap()
          );
        }

        if (ops.length === 0) {
          onClose();
          return;
        }

        const results = await Promise.allSettled(ops);
        const failed = results.filter((r) => r.status === "rejected").length;

        if (failed === results.length && results.length > 0) {
          showError("Failed to update event history.");
          return;
        }
        showSuccess(
          "Event history updated successfully" + (failed ? ` (${failed} failed)` : "")
        );
      } else {
        // One entry for EVERY event: ticked -> Attended (green), not
        // ticked -> Not Attended (red). One backend create call per event
        // (createEventHistory takes a single (contactId, eventId) pair).
        const results = await Promise.allSettled(
          (events || []).map((ed) =>
            dispatch(
              createEventHistory({
                contactId: contactId.split(":")[0],
                isSpouse: contactId.endsWith(":spouse"),
                eventId: ed._id,
                status: selectedEventIds.includes(ed._id) ? ATTENDED : NOT_ATTENDED,
                notes,
              })
            ).unwrap()
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
                    setFormErrors((prev) => ({ ...prev, contact: undefined }));
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
              {formErrors.contact && (
                <p className="eventHistoryFieldError">{formErrors.contact}</p>
              )}
            </div>

            <div className="eventHistoryFieldGroup">
              <label className="eventHistoryFieldLabel">
                Events <span className="eventHistoryRequired">*</span>
              </label>
              <div className="eventHistoryCheckboxGrid">
                {eventsLoading && (
                  <p className="eventHistoryCheckboxEmpty">Loading events...</p>
                )}
                {!eventsLoading && (events || []).length === 0 && (
                  <p className="eventHistoryCheckboxEmpty">
                    No events available. Add one from the Events page first.
                  </p>
                )}
                {(events || []).map((ed) => {
                  const lockedEntry = lockedEntries.find(
                    (e) => entryEventId(e) === ed._id
                  );
                  const taken = !!lockedEntry;
                  const checked = taken
                    ? lockedEntry.status === ATTENDED
                    : selectedEventIds.includes(ed._id);
                  return (
                    <label
                      key={ed._id}
                      className={`eventHistoryCheckboxItem${
                        checked ? " eventHistoryCheckboxItem--checked" : ""
                      }${taken ? " eventHistoryCheckboxItem--disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={taken}
                        onChange={() => toggleEvent(ed._id)}
                      />
                      <span title={taken ? `${ed.title} (added from Entry Report)` : ed.name}>
                        {ed.title}
                        {taken ? " (Entry Report)" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="eventHistoryFieldHint">
                {isEditMode
                  ? "Ticked = Attended (green), un-ticked = Not Attended (red). Events from Entry Report cannot be changed here."
                  : "Tick the events this contact attended (green). Events left un-ticked are saved as Not Attended (red)."}
              </p>
              {formErrors.event && (
                <p className="eventHistoryFieldError">{formErrors.event}</p>
              )}
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

          {actionError && (
            <p className="eventHistoryFieldError">
              {typeof actionError === "string" ? actionError : "Something went wrong."}
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