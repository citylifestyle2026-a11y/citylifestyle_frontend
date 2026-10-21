import { useEffect, useState } from "react";
import { FaTimes, FaCodeBranch } from "react-icons/fa";

import {
  getMergePreviewApi,
  mergeContactWithMemberApi,
} from "../services/contactService";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/MergeMemberModal.css";

/**
 * Merge & Sync: a Guest List row and a Contact Book row with the same WhatsApp
 * number. Fields that are different on the two sides are shown next to each
 * other - the admin picks which one to keep. References are joined. After
 * "Merge & Sync" BOTH rows hold exactly the same data.
 */
export default function MergeMemberModal({ contact, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [choices, setChoices] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMergePreviewApi(contact._id);
        if (cancelled) return;
        setPreview(res.data);
        const initial = {};
        res.data.fields.forEach((f) => {
          if (f.conflict) initial[f.key] = f.suggested;
        });
        setChoices(initial);
      } catch (err) {
        if (!cancelled) setError(getErrorText(err, "Could not load the details to merge."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact._id]);

  const handleMerge = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await mergeContactWithMemberApi(contact._id, choices);
      showSuccess(res.message || "Merged and synced");
      onDone?.();
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Merge failed."));
    } finally {
      setSaving(false);
    }
  };

  const conflicts = (preview?.fields || []).filter((f) => f.conflict);
  const others = (preview?.fields || []).filter((f) => !f.conflict);
  const refs = preview?.references;

  return (
    <div className="mergeMember__overlay" onMouseDown={saving ? undefined : onClose}>
      <div
        className="mergeMember__container"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="mergeMember__close" onClick={onClose} disabled={saving} aria-label="Close">
          <FaTimes />
        </button>

        <div className="mergeMember__head">
          <span className="mergeMember__headIcon"><FaCodeBranch /></span>
          <div>
            <h3 className="mergeMember__title">Merge &amp; Sync with Contact Book</h3>
            <p className="mergeMember__sub">
              Same WhatsApp number: {contact.whatsappNumber}. Both rows will hold the same data.
            </p>
          </div>
        </div>

        {loading && <p className="mergeMember__note">Loading...</p>}
        {!loading && error && <p className="mergeMember__error">{error}</p>}

        {!loading && preview && (
          <>
            <h4 className="mergeMember__section">
              {conflicts.length
                ? `Different in the two lists - choose what to keep (${conflicts.length})`
                : "Nothing is different - only empty fields will be filled."}
            </h4>

            {conflicts.length > 0 && (
              <div className="mergeMember__table">
                <div className="mergeMember__row mergeMember__row--head">
                  <span>Field</span>
                  <span>Guest List</span>
                  <span>Contact Book</span>
                </div>

                {conflicts.map((f) => (
                  <div className="mergeMember__row" key={f.key}>
                    <span className="mergeMember__field">{f.label}</span>
                    {["contact", "member"].map((side) => (
                      <label
                        key={side}
                        className={`mergeMember__choice ${choices[f.key] === side ? "mergeMember__choice--on" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`merge-${f.key}`}
                          checked={choices[f.key] === side}
                          onChange={() => setChoices((prev) => ({ ...prev, [f.key]: side }))}
                        />
                        <span>{f[side]}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <h4 className="mergeMember__section">References (joined)</h4>
            <div className="mergeMember__refs">
              <p><b>Guest List:</b> {refs.contact.join(", ") || "-"}</p>
              <p><b>Contact Book:</b> {refs.member.join(", ") || "-"}</p>
              <p className="mergeMember__refsResult"><b>After merge (both):</b> {refs.merged.join(", ") || "-"}</p>
            </div>

            {others.some((f) => !f.contact || !f.member) && (
              <p className="mergeMember__note">
                Fields that are empty on one side are filled from the other side.
              </p>
            )}
          </>
        )}

        <div className="mergeMember__actions">
          <button type="button" className="mergeMember__btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="mergeMember__btn mergeMember__btn--primary"
            onClick={handleMerge}
            disabled={saving || loading || !preview}
          >
            {saving ? "Merging..." : "Merge & Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}