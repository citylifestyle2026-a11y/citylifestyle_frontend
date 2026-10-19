import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaUserPlus, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

import CommonSelect from "./CommonSelect";
import useEditionOptions from "../hooks/useEditionOptions";
import { moveMembersToGuestListApi } from "../services/memberService";
import { showError } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/MoveToGuestListModal.css";

/**
 * Asks which edition the members go to, then moves them to the Guest List
 * (as Pending guests of that edition).
 *
 * payload: { ids: [...] } or { selectAll: true, filters: {...} }
 * count / label: what to show ("12 members", "Aakash Garg")
 */
export default function MoveToGuestListModal({ payload, count, label, onClose, onDone }) {
  const navigate = useNavigate();
  // Only editions of currently active events.
  const { editions, loading } = useEditionOptions({ activeOnly: true });

  const [eventId, setEventId] = useState("");
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState(null);

  const handleMove = async () => {
    if (!eventId || moving) return;

    setMoving(true);
    try {
      const res = await moveMembersToGuestListApi({ ...payload, eventId });
      setResult(res.data);
      onDone?.(res);
    } catch (err) {
      showError(getErrorText(err, "Failed to move members."));
    } finally {
      setMoving(false);
    }
  };

  // Exactly one active edition -> nothing to choose, select it.
  useEffect(() => {
    if (!eventId && editions.length === 1) setEventId(editions[0].value);
  }, [editions, eventId]);

  const edition = editions.find((e) => e.value === eventId);

  return (
    <div className="moveGuest__overlay" onMouseDown={moving ? undefined : onClose}>
      <div className="moveGuest__container" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="moveGuest__close" onClick={onClose} disabled={moving} aria-label="Close">
          <FaTimes />
        </button>

        <div className="moveGuest__head">
          <span className="moveGuest__headIcon"><FaUserPlus /></span>
          <div>
            <h3 className="moveGuest__title">Move to Guest List</h3>
            <p className="moveGuest__sub">{label || `${count} member${count === 1 ? "" : "s"}`}</p>
          </div>
        </div>

        {!result && (
          <>
            <label className="moveGuest__label">Select Edition</label>
            <CommonSelect
              className="moveGuest__select"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder={
                loading
                  ? "Loading editions..."
                  : editions.length === 0
                  ? "No active edition"
                  : "Select edition"
              }
              loading={loading}
              options={editions.map((e) => ({ value: e.value, label: e.label }))}
            />

            <ul className="moveGuest__points">
              <li>They appear in the Guest List as <b>Pending</b> for this edition.</li>
              <li>From the Guest List you can approve or reject them.</li>
              <li>Anyone already in that edition&apos;s Guest List is skipped.</li>
            </ul>

            <div className="moveGuest__actions">
              <button type="button" className="moveGuest__btn moveGuest__btn--ghost" onClick={onClose} disabled={moving}>
                Cancel
              </button>
              <button type="button" className="moveGuest__btn moveGuest__btn--primary" onClick={handleMove} disabled={!eventId || moving}>
                <FaUserPlus />
                {moving ? "Moving..." : `Move ${count} to ${edition?.label || "edition"}`}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="moveGuest__chips">
              <span className="moveGuest__chip moveGuest__chip--ok">Moved: {result.moved}</span>
              {result.updated > 0 && <span className="moveGuest__chip moveGuest__chip--upd">Updated: {result.updated}</span>}
              {result.alreadyThere > 0 && <span className="moveGuest__chip moveGuest__chip--dup">Already there: {result.alreadyThere}</span>}
              {result.failed > 0 && <span className="moveGuest__chip moveGuest__chip--fail">Failed: {result.failed}</span>}
            </div>

            {result.problems?.length > 0 && (
              <ul className="moveGuest__problems">
                {result.problems.map((row) => (
                  <li key={row.id}>
                    {row.status === "failed" ? (
                      <FaExclamationTriangle className="moveGuest__failIcon" />
                    ) : (
                      <FaCheckCircle className="moveGuest__warnIcon" />
                    )}
                    <span><b>{row.name}</b>: {row.message}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="moveGuest__actions">
              <button type="button" className="moveGuest__btn moveGuest__btn--ghost" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="moveGuest__btn moveGuest__btn--primary"
                onClick={() => navigate(`/gust-list?edition=${eventId}`)}
              >
                Open Guest List
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
