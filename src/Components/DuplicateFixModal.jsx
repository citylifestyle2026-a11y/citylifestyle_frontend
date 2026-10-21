import { useEffect, useState } from "react";
import { FaTimes, FaCodeBranch } from "react-icons/fa";

import { getDuplicatePreviewApi, fixDuplicateApi } from "../services/contactService";
import { showError, showSuccess } from "../utilits/toast";
import { getErrorText } from "../utilits/apiError";
import "../assets/CSS/MergeMemberModal.css";

/**
 * Fix a duplicate: a form submission whose WhatsApp number is already in the
 * Guest List. Fields that differ are shown side by side (Guest List vs the new
 * form) - the admin picks what to keep. References are joined. After "Fix &
 * Sync" the ONE Guest List row (and the Contact Book row with the same number)
 * hold the same data. No new guest row and no pass are created.
 */
export default function DuplicateFixModal({ duplicate, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [choices, setChoices] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDuplicatePreviewApi(duplicate._id);
        if (cancelled) return;
        setPreview(res.data);
        const initial = {};
        res.data.fields.forEach((f) => {
          if (f.conflict) initial[f.key] = f.suggested;
        });
        setChoices(initial);
      } catch (err) {
        if (!cancelled) setError(getErrorText(err, "Could not load the details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [duplicate._id]);

  const handleFix = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fixDuplicateApi(duplicate._id, choices);
      showSuccess(res.message || "Fixed and synced");
      onDone?.();
      onClose();
    } catch (err) {
      showError(getErrorText(err, "Fix failed."));
    } finally {
      setSaving(false);
    }
  };

  const conflicts = (preview?.fields || []).filter((f) => f.conflict);
  const fills = (preview?.fields || []).filter((f) => !f.conflict && f.existing !== f.new);
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
            <h3 className="mergeMember__title">Fix Duplicate</h3>
            <p className="mergeMember__sub">
              Same WhatsApp number: {duplicate.whatsappNumber}. Data is synced into the one Guest List row
              {preview?.hasContactBook ? " and the Contact Book." : "."}
            </p>
          </div>
        </div>

        {loading && <p className="mergeMember__note">Loading...</p>}
        {!loading && error && <p className="mergeMember__error">{error}</p>}

        {!loading && preview && (
          <>
            <h4 className="mergeMember__section">
              {conflicts.length
                ? `Different - choose what to keep (${conflicts.length})`
                : "Nothing is different - only empty fields will be filled."}
            </h4>

            {conflicts.length > 0 && (
              <div className="mergeMember__table">
                <div className="mergeMember__row mergeMember__row--head">
                  <span>Field</span>
                  <span>Guest List (existing)</span>
                  <span>New form</span>
                </div>

                {conflicts.map((f) => (
                  <div className="mergeMember__row" key={f.key}>
                    <span className="mergeMember__field">{f.label}</span>
                    {["existing", "new"].map((side) => (
                      <label
                        key={side}
                        className={`mergeMember__choice ${choices[f.key] === side ? "mergeMember__choice--on" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`dup-${f.key}`}
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

            {fills.length > 0 && (
              <p className="mergeMember__note">
                Will be filled from the other side: {fills.map((f) => f.label).join(", ")}.
              </p>
            )}

            <h4 className="mergeMember__section">References (joined)</h4>
            <div className="mergeMember__refs">
              <p><b>Guest List:</b> {refs.existing.join(", ") || "-"}</p>
              <p><b>New form:</b> {refs.new.join(", ") || "-"}</p>
              <p className="mergeMember__refsResult"><b>After fix:</b> {refs.merged.join(", ") || "-"}</p>
            </div>

            {preview.photos.new && !preview.photos.existing && (
              <p className="mergeMember__note">The photo from the new form will be used (the guest has none).</p>
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
            onClick={handleFix}
            disabled={saving || loading || !preview}
          >
            {saving ? "Syncing..." : "Fix & Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
