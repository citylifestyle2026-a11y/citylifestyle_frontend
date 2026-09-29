import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FaTimes } from "react-icons/fa";
import "../assets/CSS/AddToEventHistoryModal.css";
import {
  getEventHistorySyncSummary,
  syncEventHistoryFromEvent,
} from "../redux/contactEventHistory/contactEventHistoryThunk";
import { showError } from "../utilits/toast";

/**
 * Entry Report -> "Add to Event History" confirmation popup.
 *
 * Props:
 *  - eventId        the event currently selected on the Entry Report
 *  - selectedCount  how many entries are ticked (or the full total when
 *                   `selectAll` is on) — shown to the admin
 *  - selectAll      true when the "select all N entries" option is used
 *  - ticketIds      ids of the ticked entries (ignored when selectAll)
 *  - onClose()      close without saving
 *  - onDone()       called after a successful save (page clears its ticks)
 *
 * On open it loads the counts (registered / entered / not entered). On
 * Confirm it saves: every selected entry as "Attended" and everyone who
 * booked but never entered as "Not Attended" — see
 * services/eventHistorySync.service.js on the backend.
 */
export default function AddToEventHistoryModal({
  eventId,
  selectedCount,
  selectAll,
  ticketIds,
  onClose,
  onDone,
}) {
  const dispatch = useDispatch();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setSummaryLoading(true);
    setSummaryError("");

    dispatch(getEventHistorySyncSummary(eventId))
      .unwrap()
      .then((response) => {
        if (!cancelled) setSummary(response?.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setSummaryError(
            typeof err === "string" ? err : err?.message || "Unable to load the summary."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, eventId]);

  const handleConfirm = async () => {
    if (saving || summaryLoading || summaryError) return;

    setSaving(true);

    try {
      const payload = selectAll
        ? { eventId, selectAll: true }
        : { eventId, ticketIds };

      const response = await dispatch(syncEventHistoryFromEvent(payload)).unwrap();
      setResult(response?.data || {});
    } catch (err) {
      showError(
        typeof err === "string" ? err : err?.message || "Failed to add to event history."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (result) onDone();
    else onClose();
  };

  const eventTitle = summary?.event?.title || result?.event?.title || "this event";
  const someLeftUntouched =
    summary && !selectAll && selectedCount < summary.enteredCount;

  return (
    <div className="addHistory__overlay" onClick={handleClose}>
      <div className="addHistory__container" onClick={(e) => e.stopPropagation()}>
        <div className="addHistory__header">
          <h2 className="addHistory__title">
            {result ? "Event History Updated" : "Add to Event History"}
          </h2>
          <button
            type="button"
            className="addHistory__closeIcon"
            onClick={handleClose}
            aria-label="Close"
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        {/* ---------- Result ---------- */}
        {result ? (
          <>
            <p className="addHistory__message">
              The attendance of <strong>{eventTitle}</strong> has been saved to
              Event History under the edition{" "}
              <strong>{result.edition?.name || eventTitle}</strong>.
            </p>

            <div className="addHistory__stats">
              <div className="addHistory__stat addHistory__stat--green">
                <span className="addHistory__statValue">{result.attendedCount ?? 0}</span>
                <span className="addHistory__statLabel">Attended</span>
              </div>
              <div className="addHistory__stat addHistory__stat--red">
                <span className="addHistory__statValue">{result.notAttendedCount ?? 0}</span>
                <span className="addHistory__statLabel">Not Attended</span>
              </div>
              <div className="addHistory__stat">
                <span className="addHistory__statValue">{result.contactsCreated ?? 0}</span>
                <span className="addHistory__statLabel">New contacts added</span>
              </div>
            </div>

            {result.skippedInvalid > 0 && (
              <p className="addHistory__note">
                {result.skippedInvalid} ticket(s) were skipped because they have no valid
                mobile number.
              </p>
            )}

            <div className="addHistory__actions">
              <button
                type="button"
                className="addHistory__btn addHistory__btn--primary"
                onClick={handleClose}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ---------- Confirmation ---------- */}
            <p className="addHistory__message">
              You are about to save the attendance of <strong>{eventTitle}</strong> to
              Event History. Everyone you selected will be marked{" "}
              <span className="addHistory__word addHistory__word--green">Attended</span>,
              and everyone who booked but never entered will be marked{" "}
              <span className="addHistory__word addHistory__word--red">Not Attended</span>.
            </p>

            {summaryLoading && (
              <p className="addHistory__loading">Checking the event data...</p>
            )}

            {!summaryLoading && summaryError && (
              <div className="addHistory__error">{summaryError}</div>
            )}

            {!summaryLoading && summary && (
              <>
                <div className="addHistory__stats">
                  <div className="addHistory__stat">
                    <span className="addHistory__statValue">{summary.registeredCount}</span>
                    <span className="addHistory__statLabel">Registered</span>
                  </div>
                  <div className="addHistory__stat addHistory__stat--green">
                    <span className="addHistory__statValue">{selectedCount}</span>
                    <span className="addHistory__statLabel">Selected (Attended)</span>
                  </div>
                  <div className="addHistory__stat addHistory__stat--red">
                    <span className="addHistory__statValue">{summary.notEnteredCount}</span>
                    <span className="addHistory__statLabel">Not entered</span>
                  </div>
                </div>

                <ul className="addHistory__details">
                  <li>
                    Edition:{" "}
                    <strong>{summary.editionName}</strong>
                    {summary.editionIsNew ? " (will be created automatically)" : ""}
                  </li>
                  <li>
                    People are matched by mobile number; new numbers are added to the
                    Contact List.
                  </li>
                  <li>
                    Adding again is safe: nothing is duplicated, and someone who entered
                    later is updated to Attended.
                  </li>
                  {someLeftUntouched && (
                    <li>
                      Scanned entries you did not select are left as they are.
                    </li>
                  )}
                </ul>
              </>
            )}

            <div className="addHistory__actions">
              <button
                type="button"
                className="addHistory__btn addHistory__btn--secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="addHistory__btn addHistory__btn--primary"
                onClick={handleConfirm}
                disabled={saving || summaryLoading || !!summaryError || !summary}
              >
                {saving ? "Saving..." : "Confirm & Add to History"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
